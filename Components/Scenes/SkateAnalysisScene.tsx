"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  OrbitControls,
  OrthographicCamera,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  RigidBody,
  interactionGroups,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRapier,
  type CollisionEnterPayload,
  type RapierCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import {
  FiMinus,
  FiMinusCircle,
  FiPause,
  FiPlay,
  FiPlus,
  FiRotateCcw,
  FiChevronDown,
  FiTrash2,
} from "react-icons/fi";
import * as THREE from "three";
import NeutralEnvironment from "./NeutralEnvironment";
import {
  SceneOutline,
  useInspectableObject,
  useSceneInspector,
} from "../SceneInspector";
import { usePositionInfoMode } from "../PositionInfo";
import {
  KeyframeObjectRegistry,
  KeyframeSelect,
  SceneKeyframingProbe,
  useKeyframePosePresets,
  useKeyframingMode,
} from "../Keyframing";
import {
  clearSkateMotionCurveSnapshot,
  publishSkateMotionCurveSnapshot,
  type SkateMotionCurveSnapshot,
} from "../SkateMotionCurveExport";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";

const DEG = Math.PI / 180;
const PLAYBACK_DURATION = 1;
const PLAYBACK_RESTART_DELAY = 0.5;
const TRICK_PREPARATION_DURATION = 0.75;
const LEFT_FOOT_PREPARATION_DELAY = 0.25;
const PHYSICS_LANDING_DURATION = 2.5;
const MIN_FOOT_CATCH_TIME = 0.05;
const FOOT_CATCH_APPROACH_DURATION = 0.18;
const MIN_SECOND_FOOT_HANDOFF_DURATION = 0.04;
// Catch adds a controlled downward velocity. Gravity and rider mass provide
// the sustained load after that; a mass-scaled off-center impulse would add
// enough torque to spear the board into the floor.
const FOOT_CATCH_DOWNWARD_VELOCITY = 2.4;
const PHYSICS_GRAVITY_SCALE = 1.45;
const BOARD_JUMP_HEIGHT = 1.5;
const ROTATION_STEP = 180;
const MAX_ROTATION = 1440;
const SCOOP_ROTATION_THRESHOLD_DEGREES = 25;
const MIN_CURVE_POINTS = 3;
const MAX_CURVE_POINTS = 8;
const SHOE_MODEL_URL = "/Models/skate-shoe.glb";
const BOARD_GRAPHIC_TEXTURE_URL = "/Models/boardGraphics.jpg";
const SHOE_SCALE = 0.65;
const SKATE_MOBILE_PRESENTATION_POSITION: [number, number, number] = [
  6.55752, -11.67242, 0,
];
const SKATE_MOBILE_CAMERA_ZOOM = 17.1;

function composePhysicsObjectWorldTransform(
  body: RapierRigidBody,
  object: THREE.Object3D,
  presentationScale: number,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
) {
  const translation = body.translation();
  const rotation = body.rotation();
  quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w).normalize();
  position
    .copy(object.position)
    .multiplyScalar(presentationScale)
    .applyQuaternion(quaternion);
  position.x += translation.x;
  position.y += translation.y;
  position.z += translation.z;
  quaternion.multiply(object.quaternion).normalize();
}

// The centered shoe rig origin sits behind the ball of the foot. Shift the
// shoe backward along its local length so the forefoot, rather than the heel,
// is centered over each truck's bolt cluster in the landing stance.
const BOLT_POSE_FOREFOOT_OFFSET_X = -0.25;
// Neutral rider stance captured with the keyframing inspector. Every trick
// starts here, then blends into a demand-aware setup before the flick/pop.
// Keep this semantic because the source shoe rig names left/right inversely.
const TRICK_FOOT_POSES = {
  genericStart: {
    left: {
      localPosition: [-0.34491, -0.04431, 0.08529] as [number, number, number],
      localQuaternion: [0.15249, 0.15785, 0.01547, 0.9755] as [
        number,
        number,
        number,
        number,
      ],
    },
    right: {
      localPosition: [0, 0, -0.64606] as [number, number, number],
      localQuaternion: [0, -0.14398, 0, 0.98958] as [
        number,
        number,
        number,
        number,
      ],
    },
  },
  // The ball of each foot is centered over the truck hardware. This is a
  // reusable setup pose for tricks that begin from the bolts; it is
  // intentionally not the global default so tricks can opt into it.
  boltPosition: {
    left: {
      localPosition: [
        -0.21841 - BOLT_POSE_FOREFOOT_OFFSET_X,
        -0.00787,
        0.44832,
      ] as [number, number, number],
      localQuaternion: [-0.00148, 0.04692, -0.03097, 0.99842] as [
        number,
        number,
        number,
        number,
      ],
    },
    right: {
      localPosition: [
        -0.01471 - BOLT_POSE_FOREFOOT_OFFSET_X,
        0.00287,
        -0.46604,
      ] as [number, number, number],
      localQuaternion: [0.01539, -0.03469, 0.00051, 0.99928] as [
        number,
        number,
        number,
        number,
      ],
    },
  },
} as const;
const GENERIC_FRONT_FOOT_STANCE = { x: -0.12, z: 0.68 } as const;
const GENERIC_REAR_FOOT_STANCE = { x: 0.12, z: -0.68 } as const;
const TRICK_SETUP_MIN_PROGRESS = 0.1;
const TRICK_SETUP_MAX_PROGRESS = 0.18;
const GRAPH_WIDTH = 320;
const GRAPH_HEIGHT = 72;
const GRAPH_PADDING_X = 9;
const GRAPH_PADDING_Y = 6;
const GRAPH_PLOT_WIDTH = GRAPH_WIDTH - GRAPH_PADDING_X * 2;
const GRAPH_PLOT_HEIGHT = GRAPH_HEIGHT - GRAPH_PADDING_Y * 2;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const BOARD_MASS = 2.4;
const SHOE_MASS = 1.2;
const RIDER_MASS = 75;
const BOARD_COLLISION_GROUP = 0;
const SHOE_COLLISION_GROUP = 1;
const GROUND_COLLISION_GROUP = 2;
const BOARD_AUTHORED_GROUPS = interactionGroups(BOARD_COLLISION_GROUP, []);
const SHOE_AUTHORED_GROUPS = interactionGroups(SHOE_COLLISION_GROUP, []);
const BOARD_LANDING_GROUPS = interactionGroups(BOARD_COLLISION_GROUP, [
  SHOE_COLLISION_GROUP,
  GROUND_COLLISION_GROUP,
]);
const SHOE_FLIGHT_GROUPS = interactionGroups(SHOE_COLLISION_GROUP, [
  GROUND_COLLISION_GROUP,
]);
const GROUND_COLLISION_GROUPS = interactionGroups(GROUND_COLLISION_GROUP, [
  BOARD_COLLISION_GROUP,
  SHOE_COLLISION_GROUP,
]);

type MotionChannel = "height" | "speed" | "x" | "y" | "z" | "body";
type RotationChannel = Exclude<MotionChannel, "height" | "speed">;

interface MotionPoint {
  time: number;
  value: number;
}

interface MotionChannelConfig {
  key: MotionChannel;
  title: string;
  color: string;
  min: number;
  max: number;
}

interface SkateMotionState {
  channels: Record<MotionChannel, MotionPoint[]>;
  rotationMax: Record<RotationChannel, number>;
  footCatch: { left: number; right: number };
  preparationElapsed: number;
  progress: number;
  restartDelayRemaining: number;
  resetVersion: number;
  paused: boolean;
  previewQuaternion: THREE.Quaternion;
  previewLeftShoePosition: THREE.Vector3;
  previewLeftShoeQuaternion: THREE.Quaternion;
  previewRightShoePosition: THREE.Vector3;
  previewRightShoeQuaternion: THREE.Quaternion;
}

interface PlayheadElements {
  line: SVGLineElement | null;
  dot: HTMLDivElement | null;
}

interface PausedBodyMotion {
  linear: { x: number; y: number; z: number };
  angular: { x: number; y: number; z: number };
  gravityScale: number;
}

interface AuthoredShoeKeyframe {
  time: number;
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

// Authored in the keyframe editor for the exact `keyframe_right_shoe`
// object. Times are relative to the one-second trick curve, after stance
// preparation completes. Position uses Catmull-Rom interpolation while
// rotation uses quaternion slerp, matching the editor export contract.
const KICKFLIP_RIGHT_FOOT_KEYFRAMES: AuthoredShoeKeyframe[] = [
  {
    time: 0,
    position: [0.05557, 0.01473, -0.75338],
    quaternion: [-0.01312, -0.30595, -0.07769, 0.94878],
  },
  {
    time: 0.11,
    position: [-0.10273, 0.15124, -0.54202],
    quaternion: [0.23458, -0.35829, 0.20037, 0.88117],
  },
  {
    time: 0.32,
    position: [-0.25625, 0.32757, 0.49865],
    quaternion: [0.20493, -0.53124, 0.27646, 0.77418],
  },
  {
    time: 0.45,
    position: [-0.23974, 0.34488, 0.59541],
    quaternion: [-0.11851, -0.474, 0.39476, 0.7781],
  },
];

// Authored for the same semantic right shoe. This path is selected only for
// negative Z rotation (heelflip direction); positive Z keeps the kickflip
// sequence above.
const HEELFLIP_RIGHT_FOOT_KEYFRAMES: AuthoredShoeKeyframe[] = [
  {
    time: 0,
    position: [0.3797, 0.05545, -0.70044],
    quaternion: [0.01759, -0.14326, 0.05263, 0.98813],
  },
  {
    time: 0.19,
    position: [0.56912, 0.08237, -0.0855],
    quaternion: [0.2231, -0.15619, -0.02618, 0.96185],
  },
  {
    time: 0.35,
    position: [0.67352, 0.19181, 0.5263],
    quaternion: [0.2231, -0.15619, -0.02618, 0.96185],
  },
  {
    time: 0.49,
    position: [0.67973, 0.30593, 0.56271],
    quaternion: [-0.2416, -0.13187, 0.12696, 0.95295],
  },
];

// Preserve the authored flick path and ankle rotation, but keep the shoe close
// to the deck. The export's Y travel was exaggerated by the editor's local
// scale, so compress only its vertical delta around the first keyframe.
const KICKFLIP_RIGHT_FOOT_VERTICAL_SCALE = 0.4;
const HEELFLIP_RIGHT_FOOT_VERTICAL_SCALE = 0.4;
const HEELFLIP_PARENT_CLEARANCE = 0.06;
const AUTHORED_RIGHT_FOOT_RECOVERY_LEAD = 0.04;
const AUTHORED_RIGHT_FOOT_RECOVERY_DURATION = 0.12;
const KICKFLIP_RIGHT_FOOT_START_LEAD = 0.25;

const AUTHORED_SHOE_POSITION = new THREE.Vector3();
const AUTHORED_SHOE_QUATERNION = new THREE.Quaternion();
const AUTHORED_SHOE_RECOVERY_POSITION = new THREE.Vector3(
  ...TRICK_FOOT_POSES.genericStart.right.localPosition,
);
const AUTHORED_SHOE_RECOVERY_QUATERNION = new THREE.Quaternion(
  ...TRICK_FOOT_POSES.genericStart.right.localQuaternion,
).normalize();
const AUTHORED_SHOE_START_QUATERNION = new THREE.Quaternion();
const AUTHORED_SHOE_END_QUATERNION = new THREE.Quaternion();

function catmullRomScalar(
  previous: number,
  start: number,
  end: number,
  next: number,
  amount: number,
) {
  const tangentStart = (end - previous) * 0.5;
  const tangentEnd = (next - start) * 0.5;
  const amountSquared = amount * amount;
  const amountCubed = amountSquared * amount;
  return (
    (2 * amountCubed - 3 * amountSquared + 1) * start +
    (amountCubed - 2 * amountSquared + amount) * tangentStart +
    (-2 * amountCubed + 3 * amountSquared) * end +
    (amountCubed - amountSquared) * tangentEnd
  );
}

function sampleAuthoredShoeKeyframes(
  keyframes: AuthoredShoeKeyframe[],
  time: number,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
) {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (time <= first.time) {
    position.set(...first.position);
    quaternion.set(...first.quaternion).normalize();
    return;
  }
  if (time >= last.time) {
    position.set(...last.position);
    quaternion.set(...last.quaternion).normalize();
    return;
  }

  const endIndex = keyframes.findIndex((frame) => frame.time >= time);
  const startIndex = Math.max(0, endIndex - 1);
  const start = keyframes[startIndex];
  const end = keyframes[endIndex];
  const blend = THREE.MathUtils.smoothstep(time, start.time, end.time);
  const previous = keyframes[Math.max(0, startIndex - 1)];
  const next = keyframes[Math.min(keyframes.length - 1, endIndex + 1)];
  position.set(
    catmullRomScalar(
      previous.position[0],
      start.position[0],
      end.position[0],
      next.position[0],
      blend,
    ),
    catmullRomScalar(
      previous.position[1],
      start.position[1],
      end.position[1],
      next.position[1],
      blend,
    ),
    catmullRomScalar(
      previous.position[2],
      start.position[2],
      end.position[2],
      next.position[2],
      blend,
    ),
  );
  quaternion
    .copy(AUTHORED_SHOE_START_QUATERNION.set(...start.quaternion).normalize())
    .slerp(
      AUTHORED_SHOE_END_QUATERNION.set(...end.quaternion).normalize(),
      blend,
    )
    .normalize();
}

interface GeneratedTrickPreset {
  id: string;
  label: string;
  create: () => {
    channels: Record<MotionChannel, MotionPoint[]>;
    rotationMax: Record<RotationChannel, number>;
    footCatch: { left: number; right: number };
  };
}

const MOTION_CHANNELS: MotionChannelConfig[] = [
  {
    key: "height",
    title: "Vertical Position",
    color: "#e65c45",
    min: 0,
    max: 1.5,
  },
  {
    key: "x",
    title: "X-Axis Rotation",
    color: "#249d98",
    min: -1,
    max: 1,
  },
  {
    key: "y",
    title: "Y-Axis Rotation",
    color: "#c69f1e",
    min: -1,
    max: 1,
  },
  {
    key: "z",
    title: "Z-Axis Rotation",
    color: "#3978bd",
    min: -1,
    max: 1,
  },
  {
    key: "body",
    title: "Body Rotation",
    color: "#8b5cb8",
    min: -1,
    max: 1,
  },
  {
    key: "speed",
    title: "Playback Speed",
    color: "#4c8b62",
    min: 0,
    max: 2,
  },
];

function createDefaultRotationMax(): Record<RotationChannel, number> {
  return { x: 360, y: 360, z: 360, body: 180 };
}

function createDefaultFootCatch() {
  // Internal shoe-rig names are reversed. These values export and display as
  // semantic left 0.6723063650306749s and semantic right
  // 0.6519722967791411s.
  return {
    left: 0.6519722967791411,
    right: 0.6723063650306749,
  };
}

function createDefaultChannels(): Record<MotionChannel, MotionPoint[]> {
  return {
    height: [
      { time: 0, value: 0 },
      { time: 0.5317921423637915, value: 1.5 },
      { time: 1, value: 0 },
    ],
    speed: [
      { time: 0, value: 1 },
      { time: 0.19425456059805793, value: 0.3062499999999999 },
      { time: 0.31828708406126843, value: 0 },
      { time: 0.47208030309186205, value: 0 },
      { time: 0.5843050420509487, value: 0.1343749999999999 },
      { time: 0.6820557225856255, value: 2 },
      { time: 1, value: 1 },
    ],
    x: [
      { time: 0, value: 0 },
      { time: 0.05019958964774712, value: -0.24492187499999996 },
      { time: 0.15323203185308576, value: -0.18437499999999996 },
      { time: 0.35, value: 0.262 },
      { time: 0.68, value: 0 },
      { time: 0.8374487059683907, value: -0.27519531249999996 },
      { time: 1, value: 0 },
    ],
    y: [
      { time: 0, value: 0 },
      { time: 0.5, value: 0.028 },
      { time: 1, value: 0 },
    ],
    z: [
      { time: 0, value: 0 },
      { time: 0.2, value: 0 },
      { time: 0.28, value: 1 },
      { time: 0.41, value: 1 },
      { time: 0.68, value: 1 },
      { time: 1, value: 1 },
    ],
    body: [
      { time: 0, value: 0 },
      { time: 0.135, value: 0 },
      { time: 0.27, value: 0 },
      { time: 1, value: 0 },
    ],
  };
}

function createVarialHeelflipChannels(): Record<MotionChannel, MotionPoint[]> {
  return {
    height: [
      { time: 0, value: 0 },
      { time: 0.5339251615000203, value: 1.5 },
      { time: 1, value: 0 },
    ],
    x: [
      { time: 0, value: 0 },
      { time: 0.12851186364929104, value: -0.8675781250000001 },
      { time: 0.26389509608743345, value: 0.60546875 },
      { time: 0.46531304595132655, value: -0.3871093750000001 },
      { time: 1, value: 0 },
    ],
    y: [
      { time: 0, value: 0 },
      { time: 0.24704678421972132, value: -0.095703125 },
      { time: 0.4426497176288953, value: -1 },
    ],
    z: [
      { time: 0, value: 0 },
      { time: 0.2, value: 0 },
      { time: 0.3042447080810954, value: -1 },
    ],
    body: [
      { time: 0, value: 0 },
      { time: 0.135, value: 0 },
      { time: 0.27, value: 0 },
      { time: 1, value: 0 },
    ],
    speed: [
      { time: 0, value: 1 },
      { time: 0.13493631414293258, value: 1.3333984375 },
      { time: 0.19796195100150327, value: 0 },
      { time: 0.35252421774788, value: 0 },
      { time: 0.49374060455856666, value: 0.45683593749999996 },
      { time: 0.6319297728842482, value: 1.2478515625 },
      { time: 0.7792129304490658, value: 1.1125 },
      { time: 1, value: 1 },
    ],
  };
}

function createBigspinHeelflipChannels(): Record<MotionChannel, MotionPoint[]> {
  return {
    height: [
      { time: 0, value: 0 },
      { time: 0.2462722951285906, value: 1.5 },
      { time: 0.5325539349124446, value: 0 },
    ],
    x: [
      { time: 0, value: 0 },
      { time: 0.12851186364929104, value: -0.8675781250000001 },
      { time: 0.26389509608743345, value: 0.60546875 },
      { time: 0.46531304595132655, value: -0.3871093750000001 },
      { time: 1, value: 0 },
    ],
    y: [
      { time: 0, value: 0 },
      { time: 0.24704678421972132, value: -0.095703125 },
      { time: 0.4343715719335311, value: -1 },
    ],
    z: [
      { time: 0, value: 0 },
      { time: 0.2, value: 0 },
      { time: 0.45891398854264004, value: -1 },
    ],
    body: [
      { time: 0, value: 0 },
      { time: 0.1669189046438874, value: 0.555078125 },
      { time: 0.4625578962336976, value: -0.875 },
    ],
    speed: [
      { time: 0, value: 1 },
      { time: 0.10027475317921423, value: 0 },
      { time: 0.19796195100150327, value: 0 },
      { time: 0.35252421774788, value: 0 },
      { time: 0.5119982326412872, value: 0 },
      { time: 0.6396111810831674, value: 0 },
      { time: 0.7906111607686994, value: 0.5816406249999999 },
      { time: 1, value: 1 },
    ],
  };
}

function createBigspinKickflipChannels(): Record<MotionChannel, MotionPoint[]> {
  return {
    height: [
      { time: 0, value: 0 },
      { time: 0.2462722951285906, value: 1.5 },
      { time: 0.5325539349124446, value: 0 },
    ],
    x: [
      { time: 0, value: 0 },
      { time: 0.12851186364929104, value: -0.8675781250000001 },
      { time: 0.26389509608743345, value: 0.60546875 },
      { time: 0.46531304595132655, value: -0.3871093750000001 },
      { time: 1, value: 0 },
    ],
    y: [
      { time: 0, value: 0 },
      { time: 0.24704678421972132, value: -0.095703125 },
      { time: 0.4391200788201357, value: 1 },
    ],
    z: [
      { time: 0, value: 0 },
      { time: 0.2, value: 0 },
      { time: 0.4676365132247186, value: 1 },
    ],
    body: [
      { time: 0, value: 0 },
      { time: 0.1669189046438874, value: 0.555078125 },
      { time: 0.45031842928533705, value: 1 },
    ],
    speed: [
      { time: 0, value: 1 },
      { time: 0.10027475317921423, value: 0 },
      { time: 0.19796195100150327, value: 0 },
      { time: 0.35252421774788, value: 0 },
      { time: 0.5119982326412872, value: 0 },
      { time: 0.6396111810831674, value: 0 },
      { time: 0.7906111607686994, value: 0.5816406249999999 },
      { time: 1, value: 1 },
    ],
  };
}

function createClearedChannels(): Record<MotionChannel, MotionPoint[]> {
  const createPoints = (value: number) => [
    { time: 0, value },
    { time: 0.5, value },
    { time: 1, value },
  ];

  return {
    height: createPoints(0),
    speed: createPoints(1),
    x: createPoints(0),
    y: createPoints(0),
    z: createPoints(0),
    body: createPoints(0),
  };
}

const GENERATED_TRICK_PRESETS: GeneratedTrickPreset[] = [
  {
    id: "kickflip",
    label: "Kickflip",
    create: () => ({
      channels: createDefaultChannels(),
      rotationMax: createDefaultRotationMax(),
      footCatch: createDefaultFootCatch(),
    }),
  },
  {
    id: "varial-heelflip",
    label: "Varial Heelflip",
    create: () => ({
      channels: createVarialHeelflipChannels(),
      rotationMax: { x: 180, y: 180, z: 360, body: 180 },
      // The internal shoe rig is reversed: preserve the exported semantic
      // left/right catch times when this preset is selected and re-exported.
      footCatch: {
        left: 0.6519722967791411,
        right: 0.5872076303680982,
      },
    }),
  },
  {
    id: "bigspin-heelflip",
    label: "Bigspin Heelflip",
    create: () => ({
      channels: createBigspinHeelflipChannels(),
      rotationMax: { x: 180, y: 180, z: 360, body: 180 },
      // Exported semantic catches are left 0.497603527607362s and right
      // 0.545928393404908s; source shoe roles are reversed internally.
      footCatch: {
        left: 0.545928393404908,
        right: 0.497603527607362,
      },
    }),
  },
  {
    id: "bigspin-kickflip",
    label: "Bigspin Kickflip",
    create: () => ({
      channels: createBigspinKickflipChannels(),
      rotationMax: { x: 180, y: 180, z: 360, body: 180 },
      // Exported semantic catches are left 0.497603527607362s and right
      // 0.545928393404908s; source shoe roles are reversed internally.
      footCatch: {
        left: 0.545928393404908,
        right: 0.497603527607362,
      },
    }),
  },
];

const SKATE_MOBILE_PRESET_EVENT = "portfolio:skate-mobile-preset";

function cloneChannels(
  channels: Record<MotionChannel, MotionPoint[]>,
): Record<MotionChannel, MotionPoint[]> {
  return {
    height: channels.height.map((point) => ({ ...point })),
    speed: channels.speed.map((point) => ({ ...point })),
    x: channels.x.map((point) => ({ ...point })),
    y: channels.y.map((point) => ({ ...point })),
    z: channels.z.map((point) => ({ ...point })),
    body: channels.body.map((point) => ({ ...point })),
  };
}

function evaluateBezierScalar(values: number[], parameter: number) {
  const working = [...values];
  for (let level = working.length - 1; level > 0; level -= 1) {
    for (let index = 0; index < level; index += 1) {
      working[index] = THREE.MathUtils.lerp(
        working[index],
        working[index + 1],
        parameter,
      );
    }
  }
  return working[0];
}

function elevateBezierDegree(points: MotionPoint[]) {
  const degree = points.length - 1;
  const elevated = [{ ...points[0] }];

  for (let index = 1; index <= degree; index += 1) {
    const weight = index / (degree + 1);
    elevated.push({
      time: THREE.MathUtils.lerp(
        points[index].time,
        points[index - 1].time,
        weight,
      ),
      value: THREE.MathUtils.lerp(
        points[index].value,
        points[index - 1].value,
        weight,
      ),
    });
  }

  elevated.push({ ...points[degree] });
  return elevated;
}

function sampleCurveAtTime(points: MotionPoint[], time: number) {
  const lastPoint = points[points.length - 1];
  // A curve may finish before the one-second playback boundary. Hold its
  // final authored value for the remainder instead of extrapolating the
  // Bézier parameter beyond its movable endpoint.
  if (lastPoint && time >= lastPoint.time) return lastPoint.value;
  let lower = 0;
  let upper = 1;
  const timeValues = points.map((point) => point.time);
  const motionValues = points.map((point) => point.value);

  // The time handles remain ordered, so a short binary solve is stable and
  // avoids allocating THREE.Curve objects every frame.
  for (let iteration = 0; iteration < 9; iteration += 1) {
    const candidate = (lower + upper) * 0.5;
    const candidateTime = evaluateBezierScalar(timeValues, candidate);
    if (candidateTime < time) lower = candidate;
    else upper = candidate;
  }

  const parameter = (lower + upper) * 0.5;
  return evaluateBezierScalar(motionValues, parameter);
}

function setBodyCollisionGroups(body: RapierRigidBody | null, groups: number) {
  if (!body) return;
  for (let index = 0; index < body.numColliders(); index += 1) {
    body.collider(index).setCollisionGroups(groups);
  }
}

function createCurvePath(points: MotionPoint[], channel: MotionChannelConfig) {
  const timeValues = points.map((point) => point.time);
  const motionValues = points.map((point) => point.value);
  const segments = Math.max(36, points.length * 12);

  return Array.from({ length: segments + 1 }, (_, index) => {
    const parameter = index / segments;
    const point = graphPoint(
      {
        time: evaluateBezierScalar(timeValues, parameter),
        value: evaluateBezierScalar(motionValues, parameter),
      },
      channel,
    );
    return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(" ");
}

function strongestValue(points: MotionPoint[]) {
  const values = points.map((point) => point.value);
  let strongest = 0;

  for (let sample = 0; sample <= 96; sample += 1) {
    const value = evaluateBezierScalar(values, sample / 96);
    if (Math.abs(value) > Math.abs(strongest)) strongest = value;
  }

  return strongest;
}

function classifyTrick(
  channels: Record<MotionChannel, MotionPoint[]>,
  rotationMax: Record<RotationChannel, number>,
) {
  // Normalized curve values map directly to the configured degree maximum:
  // 0.5 at 360° is 180°, and 1 at 360° is exactly one full rotation.
  const x = strongestValue(channels.x);
  const y = strongestValue(channels.y);
  const z = strongestValue(channels.z);
  const body = strongestValue(channels.body);
  const xDegrees = x * rotationMax.x;
  const yDegrees = y * rotationMax.y;
  const zDegrees = z * rotationMax.z;
  const bodyDegrees = body * rotationMax.body;
  const threshold = 45;
  const hasFlip = Math.abs(zDegrees) >= threshold;
  const hasShove = Math.abs(yDegrees) >= threshold;
  const hasPitch = Math.abs(xDegrees) >= threshold;
  const hasBodyRotation = Math.abs(bodyDegrees) >= threshold;
  const flipName = z >= 0 ? "Kickflip" : "Heelflip";
  // The scene's positive body-Y rotation turns away from the rider's front,
  // so it is backside. This is the opposite of the raw Three.js axis label.
  const bodyDirection = body >= 0 ? "Backside" : "Frontside";

  let baseName = "Ollie";
  if (hasFlip && hasShove) {
    const fullShove = Math.abs(yDegrees) >= 270;
    if (fullShove && z >= 0 && y >= 0) baseName = "Tre Flip";
    else if (fullShove && z < 0 && y < 0) baseName = "Laser Flip";
    else if (z >= 0 && y < 0) baseName = "Hardflip";
    else if (z < 0 && y >= 0) baseName = "Inward Heelflip";
    else if (z >= 0) baseName = "Varial Kickflip";
    else baseName = "Varial Heelflip";
  } else if (hasFlip) {
    baseName = flipName;
  } else if (hasShove) {
    baseName = y >= 0 ? "Pop Shove-it" : "Frontside Pop Shove-it";
  } else if (hasPitch) {
    baseName = x >= 0 ? "Ollie North" : "Rocket Ollie";
  } else if (hasBodyRotation) {
    baseName = `${bodyDirection} ${Math.abs(bodyDegrees) >= 270 ? "360" : "180"}`;
  }

  let name = baseName;
  if (hasBodyRotation && (hasFlip || hasShove)) {
    if (hasShove && hasFlip) name = `${bodyDirection} Bigflip`;
    else if (hasShove) name = `${bodyDirection} Bigspin`;
    else name = `${bodyDirection} ${baseName}`;
  }

  const format = (value: number) =>
    `${value >= 0 ? "+" : "−"}${Math.round(Math.abs(value))}°`;

  return {
    name,
    combination: `X ${format(xDegrees)} · Y ${format(yDegrees)} · Z ${format(zDegrees)} · B ${format(bodyDegrees)}`,
  };
}

function graphPoint(point: MotionPoint, channel: MotionChannelConfig) {
  const normalizedValue =
    (point.value - channel.min) / (channel.max - channel.min);
  return {
    x: GRAPH_PADDING_X + point.time * GRAPH_PLOT_WIDTH,
    y: GRAPH_PADDING_Y + (1 - normalizedValue) * GRAPH_PLOT_HEIGHT,
  };
}

function graphY(value: number, channel: MotionChannelConfig) {
  return graphPoint({ time: 0, value }, channel).y;
}

function splitShoePairGeometry(source: THREE.BufferGeometry) {
  const position = source.getAttribute("position");
  const sourceIndex = source.getIndex();
  if (!position) {
    throw new Error("The skate shoe model is missing position data.");
  }

  source.computeBoundingBox();
  const bounds = source.boundingBox;
  if (!bounds) {
    throw new Error("The skate shoe model has no measurable bounds.");
  }

  const readIndex = (offset: number) =>
    sourceIndex ? sourceIndex.getX(offset) : offset;
  const triangleCount = (sourceIndex?.count ?? position.count) / 3;

  // In the downloaded pair the two complete shoes occupy opposite halves of
  // local Z. Splitting at that known separation plane preserves each shoe's
  // upper, sole, and interior as one independently transformable object.
  const splitMidpoint = (bounds.min.z + bounds.max.z) * 0.5;
  const negativeIndices: number[] = [];
  const positiveIndices: number[] = [];

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const a = readIndex(offset);
    const b = readIndex(offset + 1);
    const c = readIndex(offset + 2);
    const centroid =
      (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
    const target = centroid < splitMidpoint ? negativeIndices : positiveIndices;
    target.push(a, b, c);
  }

  const createSubset = (indices: number[], name: string) => {
    const geometry = new THREE.BufferGeometry();
    Object.entries(source.attributes).forEach(([attributeName, attribute]) => {
      geometry.setAttribute(attributeName, attribute);
    });
    geometry.morphAttributes = source.morphAttributes;
    geometry.morphTargetsRelative = source.morphTargetsRelative;
    geometry.setIndex(indices);
    geometry.name = name;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  };

  return {
    // The source model faces the opposite local-forward direction from the
    // board, so its positive-Z shoe belongs on the rider's left stance.
    left: createSubset(positiveIndices, "left_skate_shoe_geometry"),
    right: createSubset(negativeIndices, "right_skate_shoe_geometry"),
  };
}

function BezierEditor({
  channel,
  points,
  onChange,
  onZero,
  rotationMax,
  onRotationMaxChange,
  playhead,
}: {
  channel: MotionChannelConfig;
  points: MotionPoint[];
  onChange: (points: MotionPoint[]) => void;
  onZero: () => void;
  rotationMax?: number;
  onRotationMaxChange?: (value: number) => void;
  playhead: PlayheadElements;
}) {
  const activePoint = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const screenPoints = points.map((point) => graphPoint(point, channel));
  const curvePath = createCurvePath(points, channel);
  const handlePath = screenPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const updatePoint = useCallback(
    (index: number, time: number, value: number) => {
      const next = points.map((point) => ({ ...point }));
      const previousTime = next[index - 1]?.time ?? 0;
      const nextTime = next[index + 1]?.time ?? 1;
      next[index] = {
        time:
          index === 0
            ? 0
            : THREE.MathUtils.clamp(
                time,
                previousTime + 0.05,
                index === next.length - 1 ? 1 : nextTime - 0.05,
              ),
        value: THREE.MathUtils.clamp(value, channel.min, channel.max),
      };
      onChange(next);
    },
    [channel.max, channel.min, onChange, points],
  );

  const updateFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const bounds = svg.getBoundingClientRect();
      const svgX = ((event.clientX - bounds.left) / bounds.width) * GRAPH_WIDTH;
      const svgY =
        ((event.clientY - bounds.top) / bounds.height) * GRAPH_HEIGHT;
      const time = THREE.MathUtils.clamp(
        (svgX - GRAPH_PADDING_X) / GRAPH_PLOT_WIDTH,
        0,
        1,
      );
      const normalizedY = THREE.MathUtils.clamp(
        (svgY - GRAPH_PADDING_Y) / GRAPH_PLOT_HEIGHT,
        0,
        1,
      );
      const value = channel.max - normalizedY * (channel.max - channel.min);
      updatePoint(index, time, value);
    },
    [channel.max, channel.min, updatePoint],
  );

  const removePoint = useCallback(
    (index: number) => {
      if (points.length <= MIN_CURVE_POINTS) return;
      activePoint.current = null;
      onChange(points.filter((_, pointIndex) => pointIndex !== index));
    },
    [onChange, points],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      const valueStep = (channel.max - channel.min) * 0.025;
      const timeStep = 0.02;
      const point = points[index];
      if (
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      event.preventDefault();
      updatePoint(
        index,
        point.time +
          (event.key === "ArrowRight"
            ? timeStep
            : event.key === "ArrowLeft"
              ? -timeStep
              : 0),
        point.value +
          (event.key === "ArrowUp"
            ? valueStep
            : event.key === "ArrowDown"
              ? -valueStep
              : 0),
      );
    },
    [channel.max, channel.min, points, updatePoint],
  );

  return (
    <article
      className={`motion-curve-article border-b border-black/10 pb-1.5 last:border-b-0 max-sm:pb-1 ${channel.key === "height" ? "max-sm:row-span-2" : ""}`}
    >
      <div className="mb-0.5 flex items-center justify-between">
        <h3
          className="rounded-sm px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] max-sm:text-[0.48rem] max-sm:tracking-[0.08em]"
          style={{
            color: channel.color,
            backgroundColor: `${channel.color}14`,
          }}
        >
          {channel.title}
        </h3>
        <div className="flex items-center gap-1">
          {rotationMax !== undefined && onRotationMaxChange && (
            <div
              aria-label={`${channel.title} maximum rotation`}
              className="inline-flex h-5 items-center overflow-hidden rounded-full border border-black/10 bg-white text-black/50"
            >
              <button
                type="button"
                aria-label={`Decrease ${channel.title} maximum rotation`}
                className="grid h-full w-5 place-items-center transition hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-25"
                disabled={rotationMax <= ROTATION_STEP}
                onClick={() =>
                  onRotationMaxChange(
                    Math.max(ROTATION_STEP, rotationMax - ROTATION_STEP),
                  )
                }
              >
                <FiMinus aria-hidden="true" />
              </button>
              <output className="min-w-9 border-x border-black/10 px-1 text-center text-[0.48rem] font-bold tabular-nums">
                {rotationMax}°
              </output>
              <button
                type="button"
                aria-label={`Increase ${channel.title} maximum rotation`}
                className="grid h-full w-5 place-items-center transition hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-25"
                disabled={rotationMax >= MAX_ROTATION}
                onClick={() =>
                  onRotationMaxChange(
                    Math.min(MAX_ROTATION, rotationMax + ROTATION_STEP),
                  )
                }
              >
                <FiPlus aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            type="button"
            aria-label={`Add ${channel.title} control point`}
            className="inline-flex h-5 items-center gap-1 rounded-full border border-black/10 bg-white px-1.5 text-[0.48rem] font-bold uppercase tracking-[0.08em] text-black/45 transition hover:border-orange-500 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-25"
            disabled={points.length >= MAX_CURVE_POINTS}
            onClick={() => onChange(elevateBezierDegree(points))}
            onPointerDown={(event) => event.stopPropagation()}
            title={
              points.length >= MAX_CURVE_POINTS
                ? `Maximum of ${MAX_CURVE_POINTS} control points`
                : "Add a control point without changing the curve"
            }
          >
            <FiPlus aria-hidden="true" className="text-[0.65rem]" />
            <span className="max-sm:hidden">Point</span>
          </button>
          <button
            type="button"
            aria-label={
              channel.key === "speed"
                ? "Reset Playback Speed to 1×"
                : `Zero ${channel.title}`
            }
            className="inline-flex h-5 items-center gap-1 rounded-full border border-black/10 bg-white px-1.5 text-[0.48rem] font-bold uppercase tracking-[0.08em] text-black/45 transition hover:border-orange-500 hover:text-orange-600"
            onClick={onZero}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {channel.key === "speed" ? (
              <FiRotateCcw aria-hidden="true" className="text-[0.65rem]" />
            ) : (
              <FiMinusCircle aria-hidden="true" className="text-[0.65rem]" />
            )}
            <span className="max-sm:hidden">
              {channel.key === "speed" ? "Reset" : "Zero"}
            </span>
          </button>
        </div>
      </div>

      <div
        aria-label={`${channel.title} Bézier editor`}
        className={`motion-curve-plot relative w-full touch-none ${channel.key === "height" ? "motion-curve-height h-24 max-sm:h-20" : "h-12 max-sm:h-10"}`}
        role="group"
      >
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block size-full overflow-visible"
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <line
            x1={GRAPH_PADDING_X}
            x2={GRAPH_PADDING_X}
            y1={GRAPH_PADDING_Y}
            y2={GRAPH_HEIGHT - GRAPH_PADDING_Y}
            stroke="rgba(0,0,0,.28)"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={GRAPH_PADDING_X}
            x2={GRAPH_WIDTH - GRAPH_PADDING_X}
            y1={GRAPH_HEIGHT - GRAPH_PADDING_Y}
            y2={GRAPH_HEIGHT - GRAPH_PADDING_Y}
            stroke="rgba(0,0,0,.28)"
            vectorEffect="non-scaling-stroke"
          />
          {channel.key !== "height" && (
            <line
              x1={GRAPH_PADDING_X}
              x2={GRAPH_WIDTH - GRAPH_PADDING_X}
              y1={graphY(0, channel)}
              y2={graphY(0, channel)}
              stroke="rgba(0,0,0,.18)"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={handlePath}
            fill="none"
            stroke="rgba(0,0,0,.2)"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={curvePath}
            fill="none"
            stroke={channel.color}
            strokeLinecap="round"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            ref={(element) => {
              playhead.line = element;
            }}
            x1={GRAPH_PADDING_X}
            x2={GRAPH_PADDING_X}
            y1={GRAPH_PADDING_Y}
            y2={GRAPH_HEIGHT - GRAPH_PADDING_Y}
            stroke="rgba(0,0,0,.24)"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div
          ref={(element) => {
            playhead.dot = element;
          }}
          aria-hidden="true"
          className="pointer-events-none absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-sm"
          style={{
            backgroundColor: channel.color,
            left: `${(GRAPH_PADDING_X / GRAPH_WIDTH) * 100}%`,
            top: `${(screenPoints[0].y / GRAPH_HEIGHT) * 100}%`,
          }}
        />

        {screenPoints.map((point, index) => (
          <ContextMenu key={index}>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${channel.title} control point ${index + 1}`}
                aria-valuemax={channel.max}
                aria-valuemin={channel.min}
                aria-valuenow={Number(points[index].value.toFixed(2))}
                className="absolute size-[10px] -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-[#0062ff] p-0 shadow-sm outline-none transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-orange-500 active:cursor-grabbing"
                title="Drag to edit · Right-click for options"
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPointerCancel={() => {
                  activePoint.current = null;
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  if (event.button !== 0) return;
                  activePoint.current = index;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (activePoint.current !== index) return;
                  event.stopPropagation();
                  updateFromPointer(event, index);
                }}
                onPointerUp={(event) => {
                  activePoint.current = null;
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                role="slider"
                style={{
                  left: `${(point.x / GRAPH_WIDTH) * 100}%`,
                  top: `${(point.y / GRAPH_HEIGHT) * 100}%`,
                }}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-bold leading-none text-black/50 ${
                    point.y < GRAPH_PADDING_Y + 10
                      ? "top-[calc(100%+4px)]"
                      : "bottom-[calc(100%+4px)]"
                  }`}
                >
                  p{index}
                </span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                disabled={points.length <= MIN_CURVE_POINTS}
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={() => removePoint(index)}
              >
                <FiTrash2 aria-hidden="true" />
                Delete point
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
      <div className="motion-curve-axis-labels flex justify-between pl-2 pr-1 text-[0.5rem] font-medium tabular-nums text-black/35 max-sm:hidden">
        <span>0s</span>
        <span>1s</span>
      </div>
    </article>
  );
}

function FootCatchEditor({
  value,
  onChange,
  playhead,
}: {
  value: { left: number; right: number };
  onChange: (value: { left: number; right: number }) => void;
  playhead: RefObject<HTMLDivElement | null>;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const activeFoot = useRef<"left" | "right" | null>(null);

  const updateFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, foot: "left" | "right") => {
      const bounds = plotRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const time = THREE.MathUtils.clamp(
        (event.clientX - bounds.left) / bounds.width,
        MIN_FOOT_CATCH_TIME,
        0.98,
      );
      onChange({ ...value, [foot]: time });
    },
    [onChange, value],
  );

  const updateFromKeyboard = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, foot: "left" | "right") => {
      const direction =
        event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : event.key === "ArrowRight" || event.key === "ArrowUp"
            ? 1
            : 0;
      if (!direction) return;
      event.preventDefault();
      onChange({
        ...value,
        [foot]: THREE.MathUtils.clamp(
          value[foot] + direction * 0.02,
          MIN_FOOT_CATCH_TIME,
          0.98,
        ),
      });
    },
    [onChange, value],
  );

  return (
    <article className="motion-curve-article border-b border-black/10 pb-1.5 max-sm:pb-1">
      <div className="mb-0.5 flex items-center justify-between">
        <h3 className="rounded-sm bg-orange-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-orange-600 max-sm:text-[0.48rem]">
          Foot Catch
        </h3>
        <p className="text-[0.46rem] font-medium uppercase tracking-[0.1em] text-black/35">
          Downward force
        </p>
      </div>
      <div
        ref={plotRef}
        aria-label="Left and right foot catch timeline"
        className="relative h-14 w-full touch-none"
      >
        <div className="absolute inset-x-[3%] top-[30%] h-px bg-[#ec6a46]/30" />
        <div className="absolute inset-x-[3%] top-[70%] h-px bg-[#8b5cb8]/30" />
        <span className="pointer-events-none absolute left-0 top-[30%] z-10 -translate-y-1/2 bg-white pr-1 text-[7px] font-bold text-[#ec6a46]">
          L
        </span>
        <span className="pointer-events-none absolute left-0 top-[70%] z-10 -translate-y-1/2 bg-white pr-1 text-[7px] font-bold text-[#8b5cb8]">
          R
        </span>
        <div
          ref={playhead}
          className="pointer-events-none absolute inset-y-1 w-px bg-black/25"
          style={{ left: "3%" }}
        />
        {(
          [
            { label: "left", stateKey: "right" },
            { label: "right", stateKey: "left" },
          ] as const
        ).map(({ label, stateKey }, index) => (
          <button
            key={label}
            type="button"
            role="slider"
            aria-label={`${label} foot catch time`}
            aria-valuemin={MIN_FOOT_CATCH_TIME}
            aria-valuemax={0.98}
            aria-valuenow={Number(value[stateKey].toFixed(2))}
            aria-valuetext={`${Math.round(value[stateKey] * 1000)} milliseconds`}
            className={`absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${index === 0 ? "bg-[#ec6a46]" : "bg-[#8b5cb8]"}`}
            style={{
              left: `${value[stateKey] * 100}%`,
              top: index === 0 ? "30%" : "70%",
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              activeFoot.current = stateKey;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateFromPointer(event, stateKey);
            }}
            onPointerMove={(event) => {
              if (activeFoot.current !== stateKey) return;
              updateFromPointer(event, stateKey);
            }}
            onPointerUp={(event) => {
              activeFoot.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => updateFromKeyboard(event, stateKey)}
          />
        ))}
      </div>
      <div className="flex justify-between px-2 text-[0.48rem] font-medium tabular-nums text-black/35 max-sm:hidden">
        <span>Takeoff</span>
        <span>Landing</span>
      </div>
    </article>
  );
}

function SkateMotionEditor({
  motion,
}: {
  motion: RefObject<SkateMotionState>;
}) {
  const [channels, setChannels] = useState(() =>
    cloneChannels(motion.current.channels),
  );
  const [rotationMax, setRotationMax] = useState(() => ({
    ...motion.current.rotationMax,
  }));
  const [footCatch, setFootCatch] = useState(() => ({
    ...motion.current.footCatch,
  }));
  const [paused, setPaused] = useState(false);
  const [selectedTrickId, setSelectedTrickId] = useState(
    GENERATED_TRICK_PRESETS[0].id,
  );
  const trick = useMemo(
    () => classifyTrick(channels, rotationMax),
    [channels, rotationMax],
  );
  const selectedTrick = GENERATED_TRICK_PRESETS.find(
    (preset) => preset.id === selectedTrickId,
  );
  const playheads = useRef<Record<MotionChannel, PlayheadElements>>({
    height: { line: null, dot: null },
    speed: { line: null, dot: null },
    x: { line: null, dot: null },
    y: { line: null, dot: null },
    z: { line: null, dot: null },
    body: { line: null, dot: null },
  });
  const catchPlayhead = useRef<HTMLDivElement>(null);

  useEffect(() => {
    motion.current.channels = channels;
  }, [channels, motion]);

  useEffect(() => {
    motion.current.rotationMax = rotationMax;
  }, [motion, rotationMax]);

  useEffect(() => {
    motion.current.footCatch = footCatch;
  }, [footCatch, motion]);

  useEffect(() => {
    motion.current.paused = paused;
  }, [motion, paused]);

  useEffect(() => {
    let frame = 0;
    let previousProgress = -1;

    const updatePlayheads = () => {
      const progress = motion.current.progress;
      if (progress !== previousProgress) {
        previousProgress = progress;
        MOTION_CHANNELS.forEach((channel) => {
          const elements = playheads.current[channel.key];
          const value = sampleCurveAtTime(
            motion.current.channels[channel.key],
            progress,
          );
          const x = GRAPH_PADDING_X + progress * GRAPH_PLOT_WIDTH;
          const y = graphY(value, channel);
          elements.line?.setAttribute("x1", x.toFixed(2));
          elements.line?.setAttribute("x2", x.toFixed(2));
          if (elements.dot) {
            elements.dot.style.left = `${(x / GRAPH_WIDTH) * 100}%`;
            elements.dot.style.top = `${(y / GRAPH_HEIGHT) * 100}%`;
          }
        });
        if (catchPlayhead.current) {
          catchPlayhead.current.style.left = `${progress * 100}%`;
        }
      }
      frame = window.requestAnimationFrame(updatePlayheads);
    };

    frame = window.requestAnimationFrame(updatePlayheads);
    return () => window.cancelAnimationFrame(frame);
  }, [motion]);

  const updateChannel = useCallback(
    (key: MotionChannel, points: MotionPoint[]) => {
      setSelectedTrickId("custom");
      setChannels((current) => ({ ...current, [key]: points }));
    },
    [],
  );

  const updateFootCatch = useCallback(
    (nextFootCatch: { left: number; right: number }) => {
      setSelectedTrickId("custom");
      // Catch markers control the authored-to-Rapier handoff. Editing one
      // must reset more than curve time: an active landing may still own
      // joints, collision groups, baked shoe transforms, and body velocity.
      // Use the same explicit reset generation as preset changes so the next
      // frame rebuilds a clean takeoff before accepting the new marker.
      motion.current.footCatch = nextFootCatch;
      motion.current.progress = 0;
      motion.current.preparationElapsed = 0;
      motion.current.restartDelayRemaining = 0;
      motion.current.resetVersion += 1;
      setFootCatch(nextFootCatch);
    },
    [motion],
  );

  const applyTrickPreset = useCallback(
    (preset: GeneratedTrickPreset) => {
      const next = preset.create();
      motion.current.channels = next.channels;
      motion.current.rotationMax = next.rotationMax;
      motion.current.footCatch = next.footCatch;
      motion.current.preparationElapsed = 0;
      motion.current.progress = 0;
      motion.current.restartDelayRemaining = 0;
      motion.current.resetVersion += 1;
      motion.current.paused = false;
      setChannels(cloneChannels(next.channels));
      setRotationMax({ ...next.rotationMax });
      setFootCatch({ ...next.footCatch });
      setPaused(false);
      setSelectedTrickId(preset.id);
    },
    [motion],
  );

  useEffect(() => {
    const applyRequestedPreset = (event: Event) => {
      const presetId = (event as CustomEvent<string>).detail;
      const preset = GENERATED_TRICK_PRESETS.find(
        (candidate) => candidate.id === presetId,
      );
      if (preset) applyTrickPreset(preset);
    };

    window.addEventListener(SKATE_MOBILE_PRESET_EVENT, applyRequestedPreset);
    return () =>
      window.removeEventListener(
        SKATE_MOBILE_PRESET_EVENT,
        applyRequestedPreset,
      );
  }, [applyTrickPreset]);

  const reset = useCallback(() => {
    applyTrickPreset(GENERATED_TRICK_PRESETS[0]);
  }, [applyTrickPreset]);

  const clearAll = useCallback(() => {
    const cleared = createClearedChannels();
    motion.current.channels = cleared;
    motion.current.preparationElapsed = TRICK_PREPARATION_DURATION;
    motion.current.progress = 0;
    motion.current.restartDelayRemaining = 0;
    motion.current.paused = false;
    setChannels(cloneChannels(cleared));
    setPaused(false);
    setSelectedTrickId("custom");
  }, [motion]);

  useEffect(() => {
    const snapshot: SkateMotionCurveSnapshot = {
      route: "/skate-analysis",
      trick: {
        source: selectedTrick ? "generated-preset" : "custom",
        presetId: selectedTrick?.id ?? "custom",
        label: selectedTrick?.label ?? trick.name,
        detectedName: trick.name,
        rotationCombination: trick.combination,
      },
      timing: {
        playbackDurationSeconds: PLAYBACK_DURATION,
        restartDelaySeconds: PLAYBACK_RESTART_DELAY,
        preparationDurationSeconds: TRICK_PREPARATION_DURATION,
        leftFootPreparationDelaySeconds: LEFT_FOOT_PREPARATION_DELAY,
      },
      curveChannels: Object.fromEntries(
        MOTION_CHANNELS.map((channel) => [
          channel.key,
          {
            label: channel.title,
            minimum: channel.min,
            maximum: channel.max,
            points: channels[channel.key].map((point) => ({ ...point })),
          },
        ]),
      ),
      rotationMaximumDegrees: { ...rotationMax },
      // The source shoe rig is semantically reversed. Export the labels as the
      // user sees them, so pasted trick data always says left/right correctly.
      footCatchSeconds: {
        left: footCatch.right,
        right: footCatch.left,
      },
    };

    publishSkateMotionCurveSnapshot(snapshot);
    return () => clearSkateMotionCurveSnapshot(snapshot);
  }, [channels, footCatch, rotationMax, selectedTrick, trick]);

  return (
    <section
      data-page-navigation-ignore
      aria-label="Skate motion editor"
      className="skate-motion-editor w-full select-none border border-black/10 bg-white/92 px-3 py-2.5 text-black shadow-lg backdrop-blur-sm max-sm:px-2"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="mb-1.5 flex items-center justify-between border-b border-black/10 pb-2">
        <div>
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-orange-600">
            Motion curves
          </p>
          <p className="mt-0.5 text-[0.57rem] text-black/45 max-sm:hidden">
            Reshape the trick in real time.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Clear all motion curve values"
            className="inline-flex h-8 items-center gap-1.5 border border-black/15 bg-white px-2 text-[0.5rem] font-bold uppercase tracking-[0.08em] text-black/55 transition hover:border-orange-500 hover:text-orange-600"
            onClick={clearAll}
            title="Clear all values and keep three control points per graph"
          >
            <FiTrash2 aria-hidden="true" className="text-xs" />
            <span className="max-sm:hidden">Clear all</span>
          </button>
          <button
            type="button"
            aria-label={paused ? "Play animation" : "Pause animation"}
            className="grid size-8 place-items-center border border-black/15 bg-white text-sm transition hover:border-orange-500 hover:text-orange-600"
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? (
              <FiPlay aria-hidden="true" />
            ) : (
              <FiPause aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-label="Reset motion curves"
            className="grid size-8 place-items-center border border-black/15 bg-white text-sm transition hover:border-orange-500 hover:text-orange-600"
            onClick={reset}
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="grid gap-1 max-sm:grid-cols-2 max-sm:gap-x-2">
        {MOTION_CHANNELS.map((channel) => (
          <Fragment key={channel.key}>
            {channel.key === "speed" && (
              <FootCatchEditor
                value={footCatch}
                onChange={updateFootCatch}
                playhead={catchPlayhead}
              />
            )}
            <BezierEditor
              channel={channel}
              points={channels[channel.key]}
              onChange={(points) => updateChannel(channel.key, points)}
              rotationMax={
                channel.key === "height" || channel.key === "speed"
                  ? undefined
                  : rotationMax[channel.key]
              }
              onRotationMaxChange={
                channel.key === "height" || channel.key === "speed"
                  ? undefined
                  : (value) => {
                      setSelectedTrickId("custom");
                      setRotationMax((current) => ({
                        ...current,
                        [channel.key]: value,
                      }));
                    }
              }
              onZero={() =>
                updateChannel(
                  channel.key,
                  channels[channel.key].map((point) => ({
                    ...point,
                    value: channel.key === "speed" ? 1 : 0,
                  })),
                )
              }
              playhead={playheads.current[channel.key]}
            />
          </Fragment>
        ))}
      </div>

      <footer
        aria-live="polite"
        className="motion-curve-footer mt-2 flex items-center justify-between gap-3 border-t border-black/10 bg-black/[0.025] px-2.5 py-2 max-sm:mt-1.5 max-sm:py-1.5"
      >
        <div className="min-w-0">
          <p className="text-[0.5rem] font-bold uppercase tracking-[0.18em] text-orange-600">
            Detected trick
          </p>
          <label className="relative mt-0.5 block max-w-[11rem]">
            <span className="sr-only">Select generated trick</span>
            <select
              aria-label="Select generated trick"
              className="h-6 w-full cursor-pointer appearance-none truncate border-0 bg-transparent py-0 pl-0 pr-5 text-[0.78rem] font-bold text-black outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
              value={selectedTrickId}
              onChange={(event) => {
                const preset = GENERATED_TRICK_PRESETS.find(
                  (candidate) => candidate.id === event.target.value,
                );
                if (preset) applyTrickPreset(preset);
              }}
            >
              {!selectedTrick && <option value="custom">{trick.name}</option>}
              {GENERATED_TRICK_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <FiChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-black/45"
            />
          </label>
        </div>
        <p className="shrink-0 text-right text-[0.48rem] font-medium tabular-nums text-black/38 max-sm:hidden">
          {trick.combination}
        </p>
      </footer>
    </section>
  );
}

function SkateModel({
  modelUrl,
  motion,
}: {
  modelUrl: string;
  motion: RefObject<SkateMotionState>;
}) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const { scene: sourceShoeScene } = useGLTF(SHOE_MODEL_URL);
  const boardGraphicTexture = useTexture(BOARD_GRAPHIC_TEXTURE_URL);
  const { enabled: keyframingEnabled } = useKeyframingMode();
  const { rapier, rigidBodyStates } = useRapier();
  const compact = useThree((state) => state.size.width < 640);
  const presentationScale = compact ? 8 : 10;
  const presentationPosition = useMemo(
    () =>
      new THREE.Vector3(
        ...(compact ? SKATE_MOBILE_PRESENTATION_POSITION : [-6, -4, 0]),
      ),
    [compact],
  );
  const presentationQuaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(10 * DEG, -20 * DEG, 0),
      ),
    [],
  );
  const previewPresentationInverse = useMemo(
    () => presentationQuaternion.clone().invert(),
    [presentationQuaternion],
  );
  const previewBoardWorldPosition = useRef(new THREE.Vector3());
  const previewBoardWorldQuaternion = useRef(new THREE.Quaternion());
  const previewLeftWorldPosition = useRef(new THREE.Vector3());
  const previewLeftWorldQuaternion = useRef(new THREE.Quaternion());
  const previewRightWorldPosition = useRef(new THREE.Vector3());
  const previewRightWorldQuaternion = useRef(new THREE.Quaternion());
  const {
    scene,
    board,
    floorMaterial,
    baseQuaternion,
    boardCenterLocal,
    boardCenterInParent,
    deckTopOffset,
    floorColliderPosition,
    boardGraphicMaterials,
  } = useMemo(() => {
    const clonedScene = sourceScene.clone(true);
    const boardObject = clonedScene.getObjectByName("board");
    const floor = clonedScene.getObjectByName("floor");
    const graphicMaterials: THREE.Material[] = [];
    const shadowMaterial = new THREE.ShadowMaterial({
      color: 0x777777,
      opacity: 0.24,
      transparent: true,
    });

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const replaceBoardGraphic = (material: THREE.Material) => {
        if (!/^boardgraphics?$/i.test(material.name)) return material;
        const replacement = material.clone();
        if (replacement instanceof THREE.MeshStandardMaterial) {
          replacement.map = boardGraphicTexture;
          replacement.color.set(0xffffff);
          replacement.needsUpdate = true;
        }
        graphicMaterials.push(replacement);
        return replacement;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(replaceBoardGraphic)
        : replaceBoardGraphic(object.material);
      object.castShadow = object !== floor;
      object.receiveShadow = true;
    });

    if (floor instanceof THREE.Mesh) {
      floor.material = shadowMaterial;
      floor.receiveShadow = true;
      // The board is animated after the model is scaled 10x, so its shadow
      // footprint can extend far beyond the compact floor shipped in the GLB.
      floor.scale.x *= 20;
      floor.scale.z *= 20;
    }

    // Keep the deck casting onto the floor, but do not let the directional
    // light project the board's own undercarriage onto its top surface.
    // That self-shadow was the dark shape that appeared to cover the deck
    // during steep flips.
    boardObject?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = false;
    });

    if (boardObject && floor) {
      const floorDistance = boardObject.position.y - floor.position.y;
      boardObject.position.y = 0;
      floor.position.y = -floorDistance + 0.01;
    }

    clonedScene.updateMatrixWorld(true);
    const boardBounds = boardObject
      ? new THREE.Box3().setFromObject(boardObject)
      : new THREE.Box3();
    const centerWorld = boardObject
      ? boardBounds.getCenter(new THREE.Vector3())
      : new THREE.Vector3();
    const centerLocal = boardObject
      ? boardObject.worldToLocal(centerWorld.clone())
      : new THREE.Vector3();
    const centerInParent = boardObject?.parent
      ? boardObject.parent.worldToLocal(centerWorld.clone())
      : centerWorld;
    const topLocal = boardObject
      ? boardObject.worldToLocal(
          new THREE.Vector3(centerWorld.x, boardBounds.max.y, centerWorld.z),
        )
      : new THREE.Vector3(0, 0.18, 0);
    const floorPosition =
      floor?.position.clone() ?? new THREE.Vector3(0, -0.18, 0);
    if (boardObject) {
      boardObject.removeFromParent();
      boardObject.position
        .copy(centerLocal)
        .multiply(boardObject.scale)
        .multiplyScalar(-1);
      boardObject.quaternion.identity();
    }
    return {
      scene: clonedScene,
      board: boardObject,
      floorMaterial: shadowMaterial,
      baseQuaternion: boardObject?.quaternion.clone() ?? new THREE.Quaternion(),
      boardCenterLocal: centerLocal,
      boardCenterInParent: centerInParent,
      deckTopOffset: Math.max(0.16, topLocal.y - centerLocal.y),
      floorColliderPosition: [
        floorPosition.x,
        floorPosition.y,
        floorPosition.z,
      ] as [number, number, number],
      boardGraphicMaterials: graphicMaterials,
    };
  }, [boardGraphicTexture, sourceScene]);

  useEffect(() => {
    boardGraphicTexture.colorSpace = THREE.SRGBColorSpace;
    boardGraphicTexture.flipY = false;
    boardGraphicTexture.anisotropy = 8;
    boardGraphicTexture.needsUpdate = true;
  }, [boardGraphicTexture]);

  const {
    leftShoe,
    rightShoe,
    shoeGeometries,
    shoeSoleOffset,
    shoeColliderHalfExtents,
  } = useMemo(() => {
    const sourceMeshes: THREE.Mesh[] = [];
    sourceShoeScene.traverse((object) => {
      if (object instanceof THREE.Mesh) sourceMeshes.push(object);
    });
    const sourceMesh = sourceMeshes[0];
    if (!sourceMesh) {
      throw new Error("The skate shoe model contains no mesh.");
    }

    sourceShoeScene.updateMatrixWorld(true);
    const subsets = splitShoePairGeometry(sourceMesh.geometry);
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    sourceMesh.matrixWorld.decompose(
      worldPosition,
      worldQuaternion,
      worldScale,
    );

    const createShoeRig = (geometry: THREE.BufferGeometry, name: string) => {
      const mesh = new THREE.Mesh(geometry, sourceMesh.material);
      mesh.position.copy(worldPosition);
      mesh.quaternion.copy(worldQuaternion);
      mesh.scale.copy(worldScale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.updateMatrixWorld(true);

      const center = new THREE.Box3()
        .setFromObject(mesh)
        .getCenter(new THREE.Vector3());
      mesh.position.sub(center);

      const rig = new THREE.Group();
      rig.name = name;
      rig.scale.setScalar(SHOE_SCALE);
      rig.add(mesh);
      rig.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(rig);
      return {
        rig,
        soleOffset: Math.max(0.01, -bounds.min.y),
        halfExtents: bounds.getSize(new THREE.Vector3()).multiplyScalar(0.46),
      };
    };

    const leftRig = createShoeRig(subsets.left, "left_skate_shoe");
    const rightRig = createShoeRig(subsets.right, "right_skate_shoe");

    // Source rig roles are opposite the semantic feet (see inspector mapping).
    rightRig.rig.position.set(
      ...TRICK_FOOT_POSES.boltPosition.left.localPosition,
    );
    rightRig.rig.quaternion
      .set(...TRICK_FOOT_POSES.boltPosition.left.localQuaternion)
      .normalize();
    leftRig.rig.position.set(
      ...TRICK_FOOT_POSES.boltPosition.right.localPosition,
    );
    leftRig.rig.quaternion
      .set(...TRICK_FOOT_POSES.boltPosition.right.localQuaternion)
      .normalize();
    rightRig.rig.updateMatrixWorld(true);
    leftRig.rig.updateMatrixWorld(true);

    return {
      leftShoe: leftRig.rig,
      rightShoe: rightRig.rig,
      shoeGeometries: subsets,
      shoeSoleOffset: Math.max(leftRig.soleOffset, rightRig.soleOffset),
      shoeColliderHalfExtents: [
        Math.max(leftRig.halfExtents.x, rightRig.halfExtents.x, 0.08),
        Math.max(leftRig.halfExtents.y, rightRig.halfExtents.y, 0.035),
        Math.max(leftRig.halfExtents.z, rightRig.halfExtents.z, 0.16),
      ] as [number, number, number],
    };
  }, [sourceShoeScene]);
  const { inspectionHandlers } = useInspectableObject(scene);
  const centerOffset = useRef(new THREE.Vector3());
  const centerPosition = useRef(new THREE.Vector3());
  const bodyQuaternion = useRef(new THREE.Quaternion());
  const localQuaternion = useRef(new THREE.Quaternion());
  const axisQuaternion = useRef(new THREE.Quaternion());
  const footFrameQuaternion = useRef(new THREE.Quaternion());
  const footMotionQuaternion = useRef(new THREE.Quaternion());
  const preparationTargetQuaternion = useRef(new THREE.Quaternion());
  const stanceOffset = useRef(new THREE.Vector3());
  const caughtPosition = useRef(new THREE.Vector3());
  const caughtQuaternion = useRef(new THREE.Quaternion());
  const leftYaw = useRef(
    new THREE.Quaternion().setFromAxisAngle(Y_AXIS, 10 * DEG),
  );
  const rightYaw = useRef(
    new THREE.Quaternion().setFromAxisAngle(Y_AXIS, -8 * DEG),
  );
  const boardBody = useRef<RapierRigidBody>(null);
  const leftShoeBody = useRef<RapierRigidBody>(null);
  const rightShoeBody = useRef<RapierRigidBody>(null);
  const forceMainVisualSyncFrames = useRef(0);
  const mainVisualSyncMatrix = useRef(new THREE.Matrix4());
  const mainVisualSyncPosition = useRef(new THREE.Vector3());
  const mainVisualSyncQuaternion = useRef(new THREE.Quaternion());
  const groundBody = useRef<RapierRigidBody>(null);
  const leftShoeCollider = useRef<RapierCollider>(null);
  const rightShoeCollider = useRef<RapierCollider>(null);
  const boardTargetPosition = useRef(new THREE.Vector3());
  const boardTargetQuaternion = useRef(new THREE.Quaternion());
  const leftTargetPosition = useRef(new THREE.Vector3());
  const leftTargetQuaternion = useRef(new THREE.Quaternion());
  const rightTargetPosition = useRef(new THREE.Vector3());
  const rightTargetQuaternion = useRef(new THREE.Quaternion());
  const physicsInitialized = useRef(false);
  const handledResetVersion = useRef(motion.current.resetVersion);
  const previousProgress = useRef(0);
  const physicsReleased = useRef(false);
  const simulationWasPaused = useRef(false);
  const pausedBodyMotion = useRef(new Map<number, PausedBodyMotion>());
  const physicsReleaseElapsed = useRef(0);
  const groundedAfterRelease = useRef(false);
  const secondCatchElapsed = useRef(0);
  const secondCatchDelay = useRef(0);
  const secondCatchPending = useRef(false);
  const secondCatchIsLeft = useRef(false);
  const secondCatchLocalOffset = useRef(new THREE.Vector3());
  const secondCatchWorldQuaternion = useRef(new THREE.Quaternion());
  const secondCatchStartPosition = useRef(new THREE.Vector3());
  const secondCatchStartLocalOffset = useRef(new THREE.Vector3());
  const secondCatchStartQuaternion = useRef(new THREE.Quaternion());
  const secondCatchTargetPosition = useRef(new THREE.Vector3());
  const secondCatchTargetQuaternion = useRef(new THREE.Quaternion());
  const leftLandingBoltLocal = useRef(new THREE.Vector3());
  const rightLandingBoltLocal = useRef(new THREE.Vector3());
  const landingBoltAssignmentLocked = useRef(false);
  const leftLandingAnchor = useRef(new THREE.Vector3());
  const rightLandingAnchor = useRef(new THREE.Vector3());
  const leftVisualPosition = useRef(new THREE.Vector3());
  const rightVisualPosition = useRef(new THREE.Vector3());
  const shoeLocalOffset = useRef(new THREE.Vector3());
  const landingShoeQuaternion = useRef(new THREE.Quaternion());
  const stabilizePlainFlipLanding = useRef(false);
  const stabilizedLandingQuaternion = useRef(new THREE.Quaternion());
  const rearmFromLanding = useRef(false);
  const rearmBoardPosition = useRef(new THREE.Vector3());
  const rearmBoardQuaternion = useRef(new THREE.Quaternion());
  const rearmLeftShoePosition = useRef(new THREE.Vector3());
  const rearmLeftShoeQuaternion = useRef(new THREE.Quaternion());
  const rearmRightShoePosition = useRef(new THREE.Vector3());
  const rearmRightShoeQuaternion = useRef(new THREE.Quaternion());
  const leftCatchJoint = useRef<ReturnType<
    (typeof rapier.World.prototype)["createImpulseJoint"]
  > | null>(null);
  const rightCatchJoint = useRef<ReturnType<
    (typeof rapier.World.prototype)["createImpulseJoint"]
  > | null>(null);

  const syncMainRigidBodyVisual = useCallback(
    (body: RapierRigidBody | null) => {
      if (!body) return;
      const bodyState = rigidBodyStates.get(body.handle);
      if (!bodyState || bodyState.meshType !== "mesh") return;
      const translation = body.translation();
      const rotation = body.rotation();
      mainVisualSyncPosition.current.set(
        translation.x,
        translation.y,
        translation.z,
      );
      mainVisualSyncQuaternion.current
        .set(rotation.x, rotation.y, rotation.z, rotation.w)
        .normalize();
      mainVisualSyncMatrix.current
        .compose(
          mainVisualSyncPosition.current,
          mainVisualSyncQuaternion.current,
          bodyState.scale,
        )
        .premultiply(bodyState.invertedWorldMatrix)
        .decompose(
          bodyState.object.position,
          bodyState.object.quaternion,
          bodyState.object.scale,
        );
      bodyState.object.updateMatrix();
      bodyState.object.updateWorldMatrix(false, true);
    },
    [rigidBodyStates],
  );

  // Rapier normally interpolates its Three.js wrappers between physics
  // states. Catch intentionally bakes a shoe's local pose into its body in a
  // single step, so interpolating only the parent while immediately zeroing
  // the child creates a visible one-frame teleport. For the two handoff
  // frames, atomically mirror the authoritative bodies after Rapier's normal
  // frame update; regular interpolation resumes immediately afterward.
  useFrame(() => {
    if (forceMainVisualSyncFrames.current <= 0) return;
    syncMainRigidBodyVisual(boardBody.current);
    syncMainRigidBodyVisual(leftShoeBody.current);
    syncMainRigidBodyVisual(rightShoeBody.current);
    forceMainVisualSyncFrames.current -= 1;
  });

  const setFootPoseTransforms = useCallback(
    (preset: keyof typeof TRICK_FOOT_POSES) => {
      const pose = TRICK_FOOT_POSES[preset];
      // The source geometry names are inverse to semantic feet.
      rightShoe.position.set(...pose.left.localPosition);
      rightShoe.quaternion.set(...pose.left.localQuaternion).normalize();
      rightShoe.updateMatrix();
      rightShoe.updateWorldMatrix(false, true);
      leftShoe.position.set(...pose.right.localPosition);
      leftShoe.quaternion.set(...pose.right.localQuaternion).normalize();
      leftShoe.updateMatrix();
      leftShoe.updateWorldMatrix(false, true);
    },
    [leftShoe, rightShoe],
  );

  const applyFootPosePreset = useCallback(
    (preset: keyof typeof TRICK_FOOT_POSES) => {
      setFootPoseTransforms(preset);
      motion.current.progress = 0;
      motion.current.preparationElapsed =
        preset === "genericStart" ? TRICK_PREPARATION_DURATION : 0;
      motion.current.restartDelayRemaining = 0;
    },
    [motion, setFootPoseTransforms],
  );
  const footPosePresets = useMemo(
    () => [
      {
        id: "boltPosition",
        label: "Bolt position",
        apply: () => applyFootPosePreset("boltPosition"),
      },
      {
        id: "genericStart",
        label: "Generic start",
        apply: () => applyFootPosePreset("genericStart"),
      },
    ],
    [applyFootPosePreset],
  );
  useKeyframePosePresets(footPosePresets);
  const keyframeObjects = useMemo(
    () => (board ? [board, rightShoe, leftShoe] : []),
    [board, leftShoe, rightShoe],
  );

  const isGroundCollision = useCallback(
    (event: CollisionEnterPayload) =>
      event.other.rigidBody?.handle === groundBody.current?.handle,
    [],
  );

  const handleGroundContact = useCallback(
    (event: CollisionEnterPayload) => {
      if (!isGroundCollision(event) || !physicsReleased.current) return;
      if (groundedAfterRelease.current) return;
      // Catch already handed every body to Rapier. Ground contact only starts
      // the visible settle window before the next authored cycle.
      groundedAfterRelease.current = true;
      physicsReleaseElapsed.current = 0;
    },
    [isGroundCollision],
  );

  useEffect(
    () => () => {
      floorMaterial.dispose();
      boardGraphicMaterials.forEach((material) => material.dispose());
      shoeGeometries.left.dispose();
      shoeGeometries.right.dispose();
      document.body.style.cursor = "default";
    },
    [boardGraphicMaterials, floorMaterial, shoeGeometries],
  );

  useBeforePhysicsStep((world) => {
    if (!board) return;
    if (keyframingEnabled) {
      for (const body of [
        boardBody.current,
        leftShoeBody.current,
        rightShoeBody.current,
      ]) {
        if (!body) continue;
        body.setLinvel({ x: 0, y: 0, z: 0 }, false);
        body.setAngvel({ x: 0, y: 0, z: 0 }, false);
        body.setGravityScale(0, false);
        body.sleep();
      }
      return;
    }
    const delta = world.timestep;
    const state = motion.current;
    const frameDelta = Math.min(delta, 0.05);
    const explicitPresetReset =
      state.resetVersion !== handledResetVersion.current;
    let restartingAfterLanding = false;
    const hasAuthoredMotion =
      strongestValue(state.channels.height) > 0.001 ||
      Math.abs(strongestValue(state.channels.x)) > 0.001 ||
      Math.abs(strongestValue(state.channels.y)) > 0.001 ||
      Math.abs(strongestValue(state.channels.z)) > 0.001 ||
      Math.abs(strongestValue(state.channels.body)) > 0.001;
    // Clear All is a true static inspection state. Freeze curve time at its
    // neutral pose and bypass preparation, physics handoff, and restart delay.
    // Editing any motion channel makes this false and playback resumes.
    const clearedDuringPhysics = !hasAuthoredMotion && physicsReleased.current;
    if (!hasAuthoredMotion) {
      state.progress = 0;
      state.preparationElapsed = TRICK_PREPARATION_DURATION;
      state.restartDelayRemaining = 0;
      physicsReleased.current = false;
    }
    const simulationBodies = [
      boardBody.current,
      leftShoeBody.current,
      rightShoeBody.current,
    ];

    if (explicitPresetReset) {
      handledResetVersion.current = state.resetVersion;
      // A catch bakes each inner shoe transform into its Rapier body and then
      // zeroes the child group. Restore the authored bolt transforms before
      // evaluating the new preset. Otherwise the next landing assignment
      // measures from the previous trick's baked/identity shoe pose and can
      // send both feet to the same outer bolt cluster.
      setFootPoseTransforms("boltPosition");
      previousProgress.current = 0;
      physicsReleased.current = false;
      physicsReleaseElapsed.current = 0;
      groundedAfterRelease.current = false;
      secondCatchElapsed.current = 0;
      secondCatchDelay.current = 0;
      secondCatchPending.current = false;
      landingBoltAssignmentLocked.current = false;
      rearmFromLanding.current = false;
      if (leftCatchJoint.current) {
        world.removeImpulseJoint(leftCatchJoint.current, true);
        leftCatchJoint.current = null;
      }
      if (rightCatchJoint.current) {
        world.removeImpulseJoint(rightCatchJoint.current, true);
        rightCatchJoint.current = null;
      }
    }

    if (state.paused) {
      if (!simulationWasPaused.current) {
        pausedBodyMotion.current.clear();
        simulationBodies.forEach((body) => {
          if (!body) return;
          const linear = body.linvel();
          const angular = body.angvel();
          pausedBodyMotion.current.set(body.handle, {
            linear: { x: linear.x, y: linear.y, z: linear.z },
            angular: { x: angular.x, y: angular.y, z: angular.z },
            gravityScale: body.gravityScale(),
          });
        });
        simulationWasPaused.current = true;
      }

      simulationBodies.forEach((body) => {
        if (!body) return;
        body.setGravityScale(0, false);
        body.setLinvel({ x: 0, y: 0, z: 0 }, false);
        body.setAngvel({ x: 0, y: 0, z: 0 }, false);
        body.sleep();
      });
      return;
    }

    if (simulationWasPaused.current) {
      simulationBodies.forEach((body) => {
        if (!body) return;
        const saved = pausedBodyMotion.current.get(body.handle);
        if (!saved) return;
        body.setGravityScale(saved.gravityScale, false);
        body.setLinvel(saved.linear, false);
        body.setAngvel(saved.angular, false);
        body.wakeUp();
      });
      pausedBodyMotion.current.clear();
      simulationWasPaused.current = false;
    }

    const attachCaughtShoe = (
      shoe: RapierRigidBody | null,
      localOffset: THREE.Vector3,
      jointRef: { current: ReturnType<typeof world.createImpulseJoint> | null },
    ) => {
      const caughtBoard = boardBody.current;
      if (!caughtBoard || !shoe || jointRef.current) return;
      // A caught foot transfers the rider's weight through a point joint, but
      // does not become part of the skateboard's rotating frame. Locking the
      // shoe's world rotation keeps it rider-controlled while the spherical
      // joint carries its full positional load into the deck.
      setBodyCollisionGroups(shoe, SHOE_FLIGHT_GROUPS);
      shoe.setAngvel({ x: 0, y: 0, z: 0 }, true);
      shoe.setEnabledRotations(false, false, false, true);
      jointRef.current = world.createImpulseJoint(
        rapier.JointData.spherical(localOffset, { x: 0, y: 0, z: 0 }),
        caughtBoard,
        shoe,
        true,
      );
    };

    if (physicsReleased.current && secondCatchPending.current) {
      secondCatchElapsed.current += frameDelta;
      const caughtBoard = boardBody.current;
      const secondShoe = secondCatchIsLeft.current
        ? leftShoeBody.current
        : rightShoeBody.current;
      const secondShoeGroup = secondCatchIsLeft.current ? leftShoe : rightShoe;
      const boardPosition = caughtBoard?.translation();
      const boardRotation = caughtBoard?.rotation();
      if (secondShoe && boardPosition && boardRotation) {
        centerPosition.current.set(
          boardPosition.x,
          boardPosition.y,
          boardPosition.z,
        );
        boardTargetQuaternion.current.set(
          boardRotation.x,
          boardRotation.y,
          boardRotation.z,
          boardRotation.w,
        );
        secondCatchTargetPosition.current
          .copy(secondCatchLocalOffset.current)
          .applyQuaternion(boardTargetQuaternion.current)
          .add(centerPosition.current);
        const handoffDuration = Math.max(
          MIN_SECOND_FOOT_HANDOFF_DURATION,
          secondCatchDelay.current,
        );
        const approachBlend = THREE.MathUtils.smootherstep(
          secondCatchElapsed.current,
          0,
          handoffDuration,
        );
        caughtPosition.current
          .copy(secondCatchStartLocalOffset.current)
          .lerp(secondCatchLocalOffset.current, approachBlend)
          .applyQuaternion(boardTargetQuaternion.current)
          .add(centerPosition.current);
        landingShoeQuaternion.current
          .copy(secondCatchStartQuaternion.current)
          .slerp(secondCatchWorldQuaternion.current, approachBlend)
          .normalize();
        secondShoe.setTranslation(caughtPosition.current, true);
        secondShoe.setRotation(landingShoeQuaternion.current, true);
        secondShoe.setLinvel({ x: 0, y: 0, z: 0 }, true);
        secondShoe.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      if (
        secondCatchElapsed.current >=
        Math.max(MIN_SECOND_FOOT_HANDOFF_DURATION, secondCatchDelay.current)
      ) {
        secondCatchPending.current = false;
        if (secondShoe && boardPosition && boardRotation) {
          secondShoe.setTranslation(secondCatchTargetPosition.current, true);
          secondShoe.setRotation(secondCatchWorldQuaternion.current, true);
          const liveBoardVelocity = caughtBoard?.linvel() ?? {
            x: 0,
            y: 0,
            z: 0,
          };
          const catchVelocity =
            -FOOT_CATCH_DOWNWARD_VELOCITY * Math.sqrt(presentationScale);
          const sharedVelocity = {
            x: liveBoardVelocity.x,
            y: Math.min(liveBoardVelocity.y, catchVelocity),
            z: liveBoardVelocity.z,
          };
          caughtBoard?.setLinvel(sharedVelocity, true);
          caughtBoard?.setAngvel({ x: 0, y: 0, z: 0 }, true);
          secondShoe.setLinvel(sharedVelocity, true);
          secondShoe.setAngvel({ x: 0, y: 0, z: 0 }, true);
          secondShoe.setAdditionalMass(RIDER_MASS * 0.5, true);
          attachCaughtShoe(
            secondShoe,
            secondCatchLocalOffset.current,
            secondCatchIsLeft.current ? leftCatchJoint : rightCatchJoint,
          );
        }
      }
    }

    // Give Rapier enough time to resolve the complete landing and settle the
    // separate board/shoe bodies before re-arming the next authored cycle.
    if (
      physicsReleased.current &&
      groundedAfterRelease.current &&
      !state.paused
    ) {
      physicsReleaseElapsed.current += frameDelta;
      if (physicsReleaseElapsed.current >= PHYSICS_LANDING_DURATION) {
        const captureBodyTransform = (
          body: RapierRigidBody | null,
          position: THREE.Vector3,
          quaternion: THREE.Quaternion,
        ) => {
          if (!body) return;
          const translation = body.translation();
          const rotation = body.rotation();
          position.set(translation.x, translation.y, translation.z);
          quaternion
            .set(rotation.x, rotation.y, rotation.z, rotation.w)
            .normalize();
        };
        // Catch bakes each shoe child into its rigid body. Preserve those
        // rendered world poses before restoring the authored child transforms
        // so rearming the loop cannot look like the feet swap and snap back.
        captureBodyTransform(
          boardBody.current,
          rearmBoardPosition.current,
          rearmBoardQuaternion.current,
        );
        captureBodyTransform(
          leftShoeBody.current,
          rearmLeftShoePosition.current,
          rearmLeftShoeQuaternion.current,
        );
        captureBodyTransform(
          rightShoeBody.current,
          rearmRightShoePosition.current,
          rearmRightShoeQuaternion.current,
        );
        rearmFromLanding.current = true;
        state.progress = 0;
        state.preparationElapsed = 0;
        state.restartDelayRemaining = 0;
        physicsReleased.current = false;
        restartingAfterLanding = true;
      }
    }

    // Once catch hands the rig to Rapier, leave the baked shoe children
    // untouched. Re-running preparation here used to reapply their local
    // offsets on top of the physical bodies, which looked like feet sliding
    // to (or remaining bound to) a particular half of a 180-degree board.
    if (physicsReleased.current) {
      if (
        groundedAfterRelease.current &&
        stabilizePlainFlipLanding.current &&
        boardBody.current
      ) {
        const body = boardBody.current;
        // Two independent, heavy shoe bodies do not include the balancing
        // constraint a rider's legs and torso provide after touchdown. Once
        // the deck reaches the floor, hold the exact authored landing
        // orientation while Rapier continues to resolve vertical motion and
        // wheel/ground contact. Using that captured quaternion is important:
        // the imported skateboard's local up axis is not Three's Y axis.
        body.setEnabledRotations(false, false, false, true);
        body.setRotation(stabilizedLandingQuaternion.current, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      for (const body of [
        boardBody.current,
        leftShoeBody.current,
        rightShoeBody.current,
      ]) {
        body?.setGravityScale(presentationScale * PHYSICS_GRAVITY_SCALE, true);
      }
      previousProgress.current = state.progress;
      return;
    }

    if (
      hasAuthoredMotion &&
      !state.paused &&
      !physicsReleased.current &&
      !restartingAfterLanding
    ) {
      if (state.preparationElapsed < TRICK_PREPARATION_DURATION) {
        state.progress = 0;
        state.preparationElapsed = Math.min(
          TRICK_PREPARATION_DURATION,
          state.preparationElapsed + frameDelta,
        );
      } else if (state.restartDelayRemaining > 0) {
        state.restartDelayRemaining = Math.max(
          0,
          state.restartDelayRemaining - frameDelta,
        );
        if (state.restartDelayRemaining === 0) state.progress = 0;
      } else {
        const playbackSpeed = THREE.MathUtils.clamp(
          sampleCurveAtTime(state.channels.speed, state.progress),
          0,
          2,
        );
        const nextProgress =
          state.progress + (frameDelta * playbackSpeed) / PLAYBACK_DURATION;
        if (nextProgress >= 1) {
          state.progress = 1;
          state.restartDelayRemaining = PLAYBACK_RESTART_DELAY;
        } else {
          state.progress = nextProgress;
        }
      }
    }

    // Pre-roll is intentionally outside curve time. The semantic right foot
    // moves first, then the semantic left foot follows 250 ms later. Both
    // arrive at the generic stance at one second; only then can progress
    // leave 0 and begin the actual trick.
    const applyPreparationPose = (
      shoe: THREE.Group,
      foot: "left" | "right",
      blend: number,
    ) => {
      const bolt = TRICK_FOOT_POSES.boltPosition[foot];
      const generic = TRICK_FOOT_POSES.genericStart[foot];
      shoe.position.set(
        THREE.MathUtils.lerp(
          bolt.localPosition[0],
          generic.localPosition[0],
          blend,
        ),
        THREE.MathUtils.lerp(
          bolt.localPosition[1],
          generic.localPosition[1],
          blend,
        ),
        THREE.MathUtils.lerp(
          bolt.localPosition[2],
          generic.localPosition[2],
          blend,
        ),
      );
      shoe.quaternion.set(...bolt.localQuaternion);
      preparationTargetQuaternion.current.set(...generic.localQuaternion);
      shoe.quaternion
        .slerp(preparationTargetQuaternion.current, blend)
        .normalize();
      shoe.updateMatrix();
    };
    const rightFootPreparation = THREE.MathUtils.smoothstep(
      state.preparationElapsed,
      0,
      TRICK_PREPARATION_DURATION,
    );
    const leftFootPreparation = THREE.MathUtils.smoothstep(
      state.preparationElapsed,
      LEFT_FOOT_PREPARATION_DELAY,
      TRICK_PREPARATION_DURATION,
    );
    // Source rig roles are inverse to semantic foot names. Once catch hands
    // the shoes to Rapier their authored child transforms have already been
    // baked into the rigid bodies. Reapplying these local poses during the
    // landing would visibly move each shoe a second time and look like the
    // semantic feet briefly swap before the next loop.
    if (!physicsReleased.current) {
      applyPreparationPose(leftShoe, "right", rightFootPreparation);
      applyPreparationPose(rightShoe, "left", leftFootPreparation);
    }

    const heightValue = sampleCurveAtTime(
      state.channels.height,
      state.progress,
    );
    const xValue = sampleCurveAtTime(state.channels.x, state.progress);
    const yValue = sampleCurveAtTime(state.channels.y, state.progress);
    const zValue = sampleCurveAtTime(state.channels.z, state.progress);
    const bodyValue = sampleCurveAtTime(state.channels.body, state.progress);
    const height = heightValue * BOARD_JUMP_HEIGHT;
    const xRotation = xValue * THREE.MathUtils.degToRad(state.rotationMax.x);
    const yRotation = yValue * THREE.MathUtils.degToRad(state.rotationMax.y);
    const zRotation = zValue * THREE.MathUtils.degToRad(state.rotationMax.z);
    const bodyRotation =
      bodyValue * THREE.MathUtils.degToRad(state.rotationMax.body);

    bodyQuaternion.current.setFromAxisAngle(Y_AXIS, bodyRotation);
    localQuaternion.current.identity();
    axisQuaternion.current.setFromAxisAngle(X_AXIS, xRotation);
    localQuaternion.current.multiply(axisQuaternion.current);
    axisQuaternion.current.setFromAxisAngle(Y_AXIS, yRotation);
    localQuaternion.current.multiply(axisQuaternion.current);
    axisQuaternion.current.setFromAxisAngle(Z_AXIS, zRotation);
    localQuaternion.current.multiply(axisQuaternion.current);
    boardTargetQuaternion.current
      .copy(bodyQuaternion.current)
      .multiply(baseQuaternion)
      .multiply(localQuaternion.current);
    const physicalHeight = Math.max(0, height);
    centerOffset.current
      .copy(boardCenterLocal)
      .multiply(board.scale)
      .applyQuaternion(boardTargetQuaternion.current);
    boardTargetPosition.current
      .copy(boardCenterInParent)
      .sub(centerOffset.current);
    boardTargetPosition.current.y += physicalHeight;

    // Shoes belong to the rider, not the board. Their authored frame inherits
    // only body rotation; X/Y/Z board curves must never roll or flip them.
    // After the landing handoff Rapier can rotate them through real contacts.
    const airPhase = Math.max(0, Math.sin(Math.PI * state.progress));
    footFrameQuaternion.current
      .copy(bodyQuaternion.current)
      .multiply(baseQuaternion);

    centerPosition.current.copy(boardCenterInParent);
    centerPosition.current.y += physicalHeight;
    // Derive footwork from the complete authored rotations, rather than the
    // value at a single frame. A 720° flip therefore produces a longer,
    // larger flick than a 180° flip, while shove/body spins produce a larger
    // rear-foot scoop in the correct direction.
    const authoredFlip = strongestValue(state.channels.z);
    const authoredShove = strongestValue(state.channels.y);
    const authoredBody = strongestValue(state.channels.body);
    const flipDegrees = authoredFlip * state.rotationMax.z;
    const shoveDegrees = authoredShove * state.rotationMax.y;
    const bodyDegrees = authoredBody * state.rotationMax.body;
    const flipTurns = Math.abs(flipDegrees) / 360;
    const spinTurns = Math.abs(shoveDegrees) / 360;
    const hasFlipFootwork = Math.abs(flipDegrees) >= 45;
    const authoredRightFootKeyframes =
      flipDegrees >= 45
        ? KICKFLIP_RIGHT_FOOT_KEYFRAMES
        : flipDegrees <= -45
          ? HEELFLIP_RIGHT_FOOT_KEYFRAMES
          : null;
    const useAuthoredRightHeelflip = flipDegrees <= -45;
    const useAuthoredRightFlip = authoredRightFootKeyframes !== null;
    // Only a board-local Y rotation calls for a rear-foot scoop. A body turn
    // or a flip by itself must not trigger the semantic left/back foot's
    // lateral travel and ankle roll.
    const hasSpinFootwork =
      Math.abs(shoveDegrees) >= SCOOP_ROTATION_THRESHOLD_DEGREES;
    // A valid flip needs a visibly decisive flick even at 90–180°. Extra
    // rotations continue to increase travel and ankle articulation without
    // letting extreme curves throw a foot off-screen.
    const flipDemand = hasFlipFootwork
      ? THREE.MathUtils.clamp(0.55 + flipTurns * 0.7, 0.55, 2)
      : 0;
    const spinDemand = hasSpinFootwork
      ? THREE.MathUtils.clamp(0.45 + spinTurns * 0.75, 0.45, 2)
      : 0;
    const firstCatchTime = Math.min(
      state.footCatch.left,
      state.footCatch.right,
    );

    if (authoredRightFootKeyframes && !physicsReleased.current) {
      // Begin the semantic right-foot kickflip flick during the final 250 ms
      // of stance preparation. The board curves still begin at progress 0;
      // only this authored shoe sequence receives the negative-time lead.
      const authoredStartLead = useAuthoredRightHeelflip
        ? 0
        : KICKFLIP_RIGHT_FOOT_START_LEAD;
      const preparationLeadProgress = Math.max(
        0,
        state.preparationElapsed -
          (TRICK_PREPARATION_DURATION - authoredStartLead),
      );
      const authoredRightFootProgress =
        state.progress + preparationLeadProgress;
      const authoredRightFootBlend = THREE.MathUtils.smoothstep(
        authoredRightFootProgress,
        0,
        authoredRightFootKeyframes[1].time,
      );
      // This is the same inner Group selected by the keyframe editor export.
      // Keep the authored transform local to its rigid-body parent, exactly as
      // it was posed, while the parent continues to follow the overall trick.
      sampleAuthoredShoeKeyframes(
        authoredRightFootKeyframes,
        authoredRightFootProgress,
        AUTHORED_SHOE_POSITION,
        AUTHORED_SHOE_QUATERNION,
      );
      const authoredStartY = authoredRightFootKeyframes[0].position[1];
      const authoredEnd =
        authoredRightFootKeyframes[authoredRightFootKeyframes.length - 1].time;
      const authoredVerticalScale = useAuthoredRightHeelflip
        ? HEELFLIP_RIGHT_FOOT_VERTICAL_SCALE
        : KICKFLIP_RIGHT_FOOT_VERTICAL_SCALE;
      AUTHORED_SHOE_POSITION.y =
        authoredStartY +
        (AUTHORED_SHOE_POSITION.y - authoredStartY) * authoredVerticalScale;
      // `left` is the visible semantic right shoe in the legacy rig mapping.
      // Hold the completed flick pose after its early animation, then recover
      // only immediately before that shoe's own catch. Using firstCatchTime
      // here made the right foot fold down when the opposite foot caught.
      const semanticRightCatchInAuthoredTime =
        state.footCatch.left + authoredStartLead;
      const recoveryEnd = Math.max(
        authoredEnd + AUTHORED_RIGHT_FOOT_RECOVERY_DURATION,
        semanticRightCatchInAuthoredTime - AUTHORED_RIGHT_FOOT_RECOVERY_LEAD,
      );
      const recoveryStart = Math.max(
        authoredEnd,
        recoveryEnd - AUTHORED_RIGHT_FOOT_RECOVERY_DURATION,
      );
      const recoveryBlend = THREE.MathUtils.smootherstep(
        authoredRightFootProgress,
        recoveryStart,
        recoveryEnd,
      );
      // The recorded sequence ends in the airborne flick pose. Blend the
      // complete local transform back to the generic deck stance before the
      // catch so the shoe never holds in mid-air or snaps at physics handoff.
      AUTHORED_SHOE_POSITION.lerp(
        AUTHORED_SHOE_RECOVERY_POSITION,
        recoveryBlend,
      );
      AUTHORED_SHOE_QUATERNION.slerp(
        AUTHORED_SHOE_RECOVERY_QUATERNION,
        recoveryBlend,
      );
      leftShoe.position.lerp(AUTHORED_SHOE_POSITION, authoredRightFootBlend);
      leftShoe.quaternion.slerp(
        AUTHORED_SHOE_QUATERNION,
        authoredRightFootBlend,
      );
      leftShoe.updateMatrix();
    }
    const totalFootDemand = Math.max(flipDemand, spinDemand);
    const clearance = airPhase * (0.1 + totalFootDemand * 0.08);
    // Approach the deck immediately before the marker so the selected shoe
    // is in a physically valid contact pose at the exact handoff frame.
    const catchBlend = (catchTime: number) =>
      THREE.MathUtils.smoothstep(
        state.progress,
        Math.max(MIN_FOOT_CATCH_TIME, catchTime - FOOT_CATCH_APPROACH_DURATION),
        catchTime,
      );
    const leftCatchBlend = catchBlend(state.footCatch.left);
    const rightCatchBlend = catchBlend(state.footCatch.right);
    // Reserve the opening beat for stance preparation. The supplied neutral
    // pose stays exact at t=0, then both feet settle into positions derived
    // from the requested flip/shove/body rotation. Very early catch markers
    // shorten this window rather than letting setup overlap the physics handoff.
    const setupEnd = Math.max(
      0.01,
      Math.min(
        TRICK_SETUP_MAX_PROGRESS,
        Math.max(TRICK_SETUP_MIN_PROGRESS, firstCatchTime * 0.28),
        firstCatchTime - 0.04,
      ),
    );
    const setupBlend = THREE.MathUtils.smoothstep(state.progress, 0, setupEnd);
    const boardCatchBlend = Math.max(leftCatchBlend, rightCatchBlend);
    if (boardCatchBlend > 0) {
      // Catching a flip means arresting roll/pitch and bringing the deck back
      // under the rider. Preserve body rotation and the nearest half-turn of
      // shove yaw, then keep the board center on the authored height curve.
      const caughtYaw = Math.round(yRotation / Math.PI) * Math.PI;
      caughtQuaternion.current
        .copy(bodyQuaternion.current)
        .multiply(baseQuaternion);
      axisQuaternion.current.setFromAxisAngle(Y_AXIS, caughtYaw);
      caughtQuaternion.current.multiply(axisQuaternion.current);
      boardTargetQuaternion.current.slerp(
        caughtQuaternion.current,
        boardCatchBlend,
      );
      centerOffset.current
        .copy(boardCenterLocal)
        .multiply(board.scale)
        .applyQuaternion(boardTargetQuaternion.current);
      boardTargetPosition.current
        .copy(boardCenterInParent)
        .sub(centerOffset.current);
      boardTargetPosition.current.y += physicalHeight;
    }
    const flickEnd = THREE.MathUtils.clamp(
      Math.min(firstCatchTime - 0.07, 0.42 + flipDemand * 0.09),
      0.26,
      0.82,
    );
    const flickPhase = Math.max(
      0,
      Math.sin(
        Math.PI *
          THREE.MathUtils.clamp(
            (state.progress - setupEnd) / Math.max(0.12, flickEnd - setupEnd),
            0,
            1,
          ),
      ),
    );
    const scoopEnd = THREE.MathUtils.clamp(
      Math.min(firstCatchTime - 0.08, 0.34 + spinDemand * 0.1),
      0.2,
      0.78,
    );
    const popPhase = Math.max(
      0,
      Math.sin(
        Math.PI *
          THREE.MathUtils.clamp(
            (state.progress - setupEnd) / Math.max(0.16, scoopEnd - setupEnd),
            0,
            1,
          ),
      ),
    );
    const flipDirection = authoredFlip < 0 ? -1 : 1;
    const spinDirection =
      hasSpinFootwork && Math.abs(authoredShove) > 0.001
        ? Math.sign(authoredShove)
        : 0;
    const scoopPhase = hasSpinFootwork ? popPhase : 0;
    const rearFootDemand = spinDemand;
    const frontSpinCounter = spinDirection * popPhase * spinDemand;
    const visibleMotionScale = 1.35;
    const proceduralFrontFlick = useAuthoredRightHeelflip ? 0 : flickPhase;
    // Sink the visual sole slightly into the deck so the centered shoe pivots
    // remain visually planted after the scene's 10x presentation scale.
    const soleHeight = deckTopOffset + shoeSoleOffset - 0.105;
    const centerPlainFlipLanding =
      hasFlipFootwork &&
      !hasSpinFootwork &&
      Math.abs(bodyDegrees) < SCOOP_ROTATION_THRESHOLD_DEGREES;
    const landingLateralCenterX = centerPlainFlipLanding
      ? (GENERIC_FRONT_FOOT_STANCE.x +
          TRICK_FOOT_POSES.boltPosition.right.localPosition[0] +
          GENERIC_REAR_FOOT_STANCE.x +
          TRICK_FOOT_POSES.boltPosition.left.localPosition[0]) /
        2
      : 0;

    // Trick-specific setup positions stay deliberately compact: they place
    // the lead foot nearer the relevant edge and preload the rear foot toward
    // the tail without spending the large motion reserved for the actual
    // flick/scoop. No demanded rotation means no deviation from neutral.
    const frontSetupBlend = setupBlend * (1 - leftCatchBlend);
    const rearSetupBlend = setupBlend * (1 - rightCatchBlend);
    const frontSetupX =
      GENERIC_FRONT_FOOT_STANCE.x -
      flipDirection * frontSetupBlend * flipDemand * 0.075 -
      spinDirection * frontSetupBlend * spinDemand * 0.025;
    const frontSetupZ =
      GENERIC_FRONT_FOOT_STANCE.z -
      frontSetupBlend * (flipDemand * 0.07 + spinDemand * 0.02);
    const rearSetupX =
      GENERIC_REAR_FOOT_STANCE.x +
      spinDirection * rearSetupBlend * rearFootDemand * 0.065;
    const rearSetupZ =
      GENERIC_REAR_FOOT_STANCE.z - rearSetupBlend * rearFootDemand * 0.055;

    // The front foot travels toward the deck edge to initiate a flip while
    // the rear foot supplies the earlier pop. Both return to stable stance
    // points before contact instead of sharing one rigid transform.
    stanceOffset.current.set(
      frontSetupX -
        flipDirection *
          proceduralFrontFlick *
          (0.2 + flipDemand * 0.2) *
          visibleMotionScale -
        frontSpinCounter * 0.1,
      soleHeight,
      frontSetupZ +
        proceduralFrontFlick * (0.18 + flipDemand * 0.2) * visibleMotionScale,
    );
    stanceOffset.current.applyQuaternion(footFrameQuaternion.current);
    leftTargetPosition.current
      .copy(centerPosition.current)
      .add(stanceOffset.current);
    leftTargetPosition.current.y +=
      (useAuthoredRightFlip
        ? useAuthoredRightHeelflip
          ? flickPhase * HEELFLIP_PARENT_CLEARANCE
          : 0
        : clearance +
          flickPhase * (0.14 + flipDemand * 0.18) * visibleMotionScale) *
      (1 - leftCatchBlend);
    leftTargetQuaternion.current
      .copy(footFrameQuaternion.current)
      .multiply(leftYaw.current);
    footMotionQuaternion.current.setFromEuler(
      new THREE.Euler(
        (-frontSetupBlend * flipDemand * 5 -
          proceduralFrontFlick * (16 + flipDemand * 20)) *
          DEG,
        (-spinDirection * frontSetupBlend * spinDemand * 4 -
          frontSpinCounter * (5 + spinDemand * 6)) *
          DEG,
        -flipDirection *
          (frontSetupBlend * flipDemand * 7 +
            proceduralFrontFlick * (34 + flipDemand * 34)) *
          DEG,
      ),
    );
    leftTargetQuaternion.current.multiply(footMotionQuaternion.current);

    stanceOffset.current.set(
      rearSetupX +
        spinDirection *
          scoopPhase *
          (0.1 + rearFootDemand * 0.22) *
          visibleMotionScale,
      soleHeight,
      rearSetupZ -
        scoopPhase * (0.1 + rearFootDemand * 0.17) * visibleMotionScale,
    );
    stanceOffset.current.applyQuaternion(footFrameQuaternion.current);
    rightTargetPosition.current
      .copy(centerPosition.current)
      .add(stanceOffset.current);
    rightTargetPosition.current.y +=
      (clearance +
        scoopPhase * (0.1 + rearFootDemand * 0.13) * visibleMotionScale) *
      (1 - rightCatchBlend);
    rightTargetQuaternion.current
      .copy(footFrameQuaternion.current)
      .multiply(rightYaw.current);
    footMotionQuaternion.current.setFromEuler(
      new THREE.Euler(
        (rearSetupBlend * rearFootDemand * 5 +
          scoopPhase * (18 + rearFootDemand * 18)) *
          DEG,
        -spinDirection *
          (rearSetupBlend * rearFootDemand * 7 +
            scoopPhase * (24 + rearFootDemand * 38)) *
          DEG,
        spinDirection *
          (rearSetupBlend * rearFootDemand * 5 +
            scoopPhase * rearFootDemand * 20) *
          DEG,
      ),
    );
    rightTargetQuaternion.current.multiply(footMotionQuaternion.current);

    // Once a marker is crossed on descent, transition that foot from the
    // rider frame onto a deck-local stance. The catch remains authored (and
    // non-colliding with the board) until the ground physics handoff.
    const lockCaughtFootToBoard = (
      blend: number,
      localStance: THREE.Vector3,
      targetPosition: THREE.Vector3,
      targetQuaternion: THREE.Quaternion,
      shoe: THREE.Group,
      boltPose: (typeof TRICK_FOOT_POSES.boltPosition)["left" | "right"],
    ) => {
      if (blend <= 0) return;
      shoe.position.lerp(
        shoeLocalOffset.current.set(...boltPose.localPosition),
        blend,
      );
      landingShoeQuaternion.current
        .set(...boltPose.localQuaternion)
        .normalize();
      shoe.quaternion.slerp(landingShoeQuaternion.current, blend).normalize();
      shoe.updateMatrix();
      caughtPosition.current
        .copy(localStance)
        .applyQuaternion(boardTargetQuaternion.current)
        .add(centerPosition.current);
      // localStance describes the desired visible shoe origin. The rendered
      // shoe is an authored child of its rigid body, so subtract that child
      // offset here. At handoff the child transform is baked into the body.
      shoeLocalOffset.current
        .copy(shoe.position)
        .applyQuaternion(targetQuaternion);
      caughtPosition.current.sub(shoeLocalOffset.current);
      targetPosition.lerp(caughtPosition.current, blend);
    };

    // Bolt positions were captured on the inner shoe objects. Combine them
    // with the procedural parent stance to get the two actual, symmetric
    // deck-local landing anchors.
    leftLandingAnchor.current
      .set(
        GENERIC_FRONT_FOOT_STANCE.x +
          TRICK_FOOT_POSES.boltPosition.right.localPosition[0] -
          landingLateralCenterX,
        soleHeight + TRICK_FOOT_POSES.boltPosition.right.localPosition[1],
        GENERIC_FRONT_FOOT_STANCE.z +
          TRICK_FOOT_POSES.boltPosition.right.localPosition[2],
      )
      .applyQuaternion(boardTargetQuaternion.current)
      .add(centerPosition.current);
    rightLandingAnchor.current
      .set(
        GENERIC_REAR_FOOT_STANCE.x +
          TRICK_FOOT_POSES.boltPosition.left.localPosition[0] -
          landingLateralCenterX,
        soleHeight + TRICK_FOOT_POSES.boltPosition.left.localPosition[1],
        GENERIC_REAR_FOOT_STANCE.z +
          TRICK_FOOT_POSES.boltPosition.left.localPosition[2],
      )
      .applyQuaternion(boardTargetQuaternion.current)
      .add(centerPosition.current);

    // Only an odd 180-degree board-local shove exchanges which physical bolt
    // cluster is under each foot. A flip can briefly make the opposite anchor
    // look closer in 3D even though nose and tail never exchanged; allowing a
    // distance-only swap there made the feet cross at catch and then appear to
    // switch back on the following cycle.
    if (!landingBoltAssignmentLocked.current && boardCatchBlend > 0.001) {
      leftVisualPosition.current
        .copy(leftShoe.position)
        .applyQuaternion(leftTargetQuaternion.current)
        .add(leftTargetPosition.current);
      rightVisualPosition.current
        .copy(rightShoe.position)
        .applyQuaternion(rightTargetQuaternion.current)
        .add(rightTargetPosition.current);
      const directDistance =
        leftVisualPosition.current.distanceToSquared(
          leftLandingAnchor.current,
        ) +
        rightVisualPosition.current.distanceToSquared(
          rightLandingAnchor.current,
        );
      const swappedDistance =
        leftVisualPosition.current.distanceToSquared(
          rightLandingAnchor.current,
        ) +
        rightVisualPosition.current.distanceToSquared(
          leftLandingAnchor.current,
        );
      const shoveHalfTurns = Math.round(shoveDegrees / 180);
      const exchangesBoltClusters = Math.abs(shoveHalfTurns) % 2 === 1;
      if (exchangesBoltClusters && swappedDistance < directDistance) {
        leftLandingBoltLocal.current.set(
          GENERIC_REAR_FOOT_STANCE.x +
            TRICK_FOOT_POSES.boltPosition.left.localPosition[0] -
            landingLateralCenterX,
          soleHeight + TRICK_FOOT_POSES.boltPosition.left.localPosition[1],
          GENERIC_REAR_FOOT_STANCE.z +
            TRICK_FOOT_POSES.boltPosition.left.localPosition[2],
        );
        rightLandingBoltLocal.current.set(
          GENERIC_FRONT_FOOT_STANCE.x +
            TRICK_FOOT_POSES.boltPosition.right.localPosition[0] -
            landingLateralCenterX,
          soleHeight + TRICK_FOOT_POSES.boltPosition.right.localPosition[1],
          GENERIC_FRONT_FOOT_STANCE.z +
            TRICK_FOOT_POSES.boltPosition.right.localPosition[2],
        );
      } else {
        leftLandingBoltLocal.current.set(
          GENERIC_FRONT_FOOT_STANCE.x +
            TRICK_FOOT_POSES.boltPosition.right.localPosition[0] -
            landingLateralCenterX,
          soleHeight + TRICK_FOOT_POSES.boltPosition.right.localPosition[1],
          GENERIC_FRONT_FOOT_STANCE.z +
            TRICK_FOOT_POSES.boltPosition.right.localPosition[2],
        );
        rightLandingBoltLocal.current.set(
          GENERIC_REAR_FOOT_STANCE.x +
            TRICK_FOOT_POSES.boltPosition.left.localPosition[0] -
            landingLateralCenterX,
          soleHeight + TRICK_FOOT_POSES.boltPosition.left.localPosition[1],
          GENERIC_REAR_FOOT_STANCE.z +
            TRICK_FOOT_POSES.boltPosition.left.localPosition[2],
        );
      }
      landingBoltAssignmentLocked.current = true;
    }
    if (!physicsReleased.current) {
      lockCaughtFootToBoard(
        leftCatchBlend,
        leftLandingBoltLocal.current,
        leftTargetPosition.current,
        leftTargetQuaternion.current,
        leftShoe,
        TRICK_FOOT_POSES.boltPosition.right,
      );
      lockCaughtFootToBoard(
        rightCatchBlend,
        rightLandingBoltLocal.current,
        rightTargetPosition.current,
        rightTargetQuaternion.current,
        rightShoe,
        TRICK_FOOT_POSES.boltPosition.left,
      );
    }

    // Rapier setters take world-space values. The editable curves above are
    // authored in the model's local presentation space, which is rotated and
    // scaled for the page layout.
    for (const targetPosition of [
      boardTargetPosition.current,
      leftTargetPosition.current,
      rightTargetPosition.current,
    ]) {
      targetPosition
        .multiplyScalar(presentationScale)
        .applyQuaternion(presentationQuaternion)
        .add(presentationPosition);
    }
    for (const targetQuaternion of [
      boardTargetQuaternion.current,
      leftTargetQuaternion.current,
      rightTargetQuaternion.current,
    ]) {
      targetQuaternion.premultiply(presentationQuaternion);
    }

    // The earliest foot marker is a hard, one-way handoff for the whole
    // system. From this frame until reset there are no curve-driven poses or
    // velocities: board and both shoes are governed exclusively by Rapier.
    if (
      hasAuthoredMotion &&
      !physicsReleased.current &&
      state.progress >= firstCatchTime
    ) {
      physicsReleased.current = true;
      stabilizePlainFlipLanding.current = centerPlainFlipLanding;
      stabilizedLandingQuaternion.current.copy(
        boardTargetQuaternion.current,
      );
      groundedAfterRelease.current = false;
      physicsReleaseElapsed.current = 0;
      state.restartDelayRemaining = 0;
      const caughtBoard = boardBody.current;
      const leftCatchesFirst = state.footCatch.left <= state.footCatch.right;
      const caughtShoe = leftCatchesFirst
        ? leftShoeBody.current
        : rightShoeBody.current;
      const caughtShoePosition = leftCatchesFirst
        ? leftTargetPosition.current
        : rightTargetPosition.current;
      const caughtShoeRotation = leftCatchesFirst
        ? leftTargetQuaternion.current
        : rightTargetQuaternion.current;
      const caughtShoeGroup = leftCatchesFirst ? leftShoe : rightShoe;
      caughtBoard?.setAdditionalMass(0, true);
      // The authored catch pose is the exact completed rotation. Snap the
      // dynamic body to it before releasing physics so a velocity-driven
      // board cannot reach the catch one partial frame (or half-turn) behind.
      caughtBoard?.setTranslation(boardTargetPosition.current, true);
      caughtBoard?.setRotation(boardTargetQuaternion.current, true);
      caughtBoard?.setAngularDamping(4.5);
      caughtBoard?.setAngvel({ x: 0, y: 0, z: 0 }, true);
      caughtShoe?.setAdditionalMass(RIDER_MASS * 0.5, true);
      secondCatchElapsed.current = 0;
      secondCatchDelay.current =
        Math.abs(state.footCatch.right - state.footCatch.left) *
        PLAYBACK_DURATION;
      secondCatchPending.current = true;
      secondCatchIsLeft.current = !leftCatchesFirst;
      const pendingShoe = secondCatchIsLeft.current
        ? leftShoeBody.current
        : rightShoeBody.current;
      const pendingShoeGroup = secondCatchIsLeft.current ? leftShoe : rightShoe;
      const pendingPosition = pendingShoe?.translation();
      const pendingRotation = pendingShoe?.rotation();
      if (pendingPosition && pendingRotation) {
        secondCatchStartQuaternion.current.set(
          pendingRotation.x,
          pendingRotation.y,
          pendingRotation.z,
          pendingRotation.w,
        );
        secondCatchStartPosition.current
          .set(pendingPosition.x, pendingPosition.y, pendingPosition.z)
          .add(
            shoeLocalOffset.current
              .copy(pendingShoeGroup.position)
              .multiplyScalar(presentationScale)
              .applyQuaternion(secondCatchStartQuaternion.current),
          );
        secondCatchStartQuaternion.current
          .multiply(pendingShoeGroup.quaternion)
          .normalize();
        pendingShoeGroup.position.set(0, 0, 0);
        pendingShoeGroup.quaternion.identity();
        pendingShoeGroup.updateMatrix();
        pendingShoe?.setTranslation(secondCatchStartPosition.current, true);
        pendingShoe?.setRotation(secondCatchStartQuaternion.current, true);
      }
      // Store the other foot's exact deck-contact transform relative to the
      // board. At its later marker we rebuild this pose from the live Rapier
      // board transform, so it cannot miss a board that has already moved.
      // Build the final stance directly in the board's local model frame.
      // Do not derive it from the uncaught shoe's current target: that target
      // still includes airborne clearance until its own marker.
      secondCatchLocalOffset.current
        .copy(
          secondCatchIsLeft.current
            ? leftLandingBoltLocal.current
            : rightLandingBoltLocal.current,
        )
        .multiplyScalar(presentationScale);
      secondCatchWorldQuaternion.current.copy(
        secondCatchIsLeft.current
          ? leftTargetQuaternion.current
          : rightTargetQuaternion.current,
      );
      landingShoeQuaternion.current
        .set(
          ...(secondCatchIsLeft.current
            ? TRICK_FOOT_POSES.boltPosition.right.localQuaternion
            : TRICK_FOOT_POSES.boltPosition.left.localQuaternion),
        )
        .normalize();
      secondCatchWorldQuaternion.current
        .multiply(landingShoeQuaternion.current)
        .normalize();
      // Keep the uncaught foot's final approach in the board's local frame.
      // Interpolating from a fixed world position made the foot chase the
      // already-moving deck and briefly arc forward before the joint bound.
      landingShoeQuaternion.current
        .copy(boardTargetQuaternion.current)
        .invert();
      secondCatchStartLocalOffset.current
        .copy(secondCatchStartPosition.current)
        .sub(boardTargetPosition.current)
        .applyQuaternion(landingShoeQuaternion.current);
      setBodyCollisionGroups(caughtBoard, BOARD_LANDING_GROUPS);
      // Do not globally enable both shoes here. Each shoe must remain fully
      // collision-free until its own catch marker; otherwise the first foot's
      // catch can make the still-authored second foot hit the ground and pitch
      // downward. attachCaughtShoe enables only the shoe being handed off.
      leftShoeCollider.current?.setCollisionGroups(SHOE_AUTHORED_GROUPS);
      rightShoeCollider.current?.setCollisionGroups(SHOE_AUTHORED_GROUPS);

      // Put the catching sole exactly on its authored contact pose, then let
      // a heavy physical shoe strike the deck. Applying the impulse directly
      // to the board only made the three bodies look like they floated down.
      // Bake the selected bolt pose into the body at handoff. The collider,
      // joint, and rendered shoe now share the same world transform instead
      // of applying the child offset a second time after physics starts.
      caughtPosition.current
        .copy(caughtShoeGroup.position)
        .multiplyScalar(presentationScale)
        .applyQuaternion(caughtShoeRotation)
        .add(caughtShoePosition);
      landingShoeQuaternion.current
        .copy(caughtShoeRotation)
        .multiply(caughtShoeGroup.quaternion)
        .normalize();
      caughtShoeGroup.position.set(0, 0, 0);
      caughtShoeGroup.quaternion.identity();
      caughtShoeGroup.updateMatrix();
      caughtShoe?.setTranslation(caughtPosition.current, true);
      caughtShoe?.setRotation(landingShoeQuaternion.current, true);
      const boardVelocity = caughtBoard?.linvel() ?? { x: 0, y: 0, z: 0 };
      const catchVelocity =
        -FOOT_CATCH_DOWNWARD_VELOCITY * Math.sqrt(presentationScale);
      const sharedVelocity = {
        x: boardVelocity.x,
        y: Math.min(boardVelocity.y, catchVelocity),
        z: boardVelocity.z,
      };
      caughtBoard?.setLinvel(sharedVelocity, true);
      caughtShoe?.setLinvel(sharedVelocity, true);
      caughtShoe?.setAngvel({ x: 0, y: 0, z: 0 }, true);
      stanceOffset.current
        .copy(
          leftCatchesFirst
            ? leftLandingBoltLocal.current
            : rightLandingBoltLocal.current,
        )
        .multiplyScalar(presentationScale);
      attachCaughtShoe(
        caughtShoe,
        stanceOffset.current,
        leftCatchesFirst ? leftCatchJoint : rightCatchJoint,
      );
      forceMainVisualSyncFrames.current = 2;
    }
    const progressReset =
      state.progress <= 0.001 && previousProgress.current > 0.05;
    const looped =
      !physicsReleased.current &&
      state.progress < previousProgress.current - 0.5;
    if (
      !physicsInitialized.current ||
      explicitPresetReset ||
      looped ||
      progressReset ||
      clearedDuringPhysics
    ) {
      physicsReleased.current = false;
      stabilizePlainFlipLanding.current = false;
      physicsReleaseElapsed.current = 0;
      groundedAfterRelease.current = false;
      secondCatchElapsed.current = 0;
      secondCatchDelay.current = 0;
      secondCatchPending.current = false;
      landingBoltAssignmentLocked.current = false;
      if (leftCatchJoint.current) {
        world.removeImpulseJoint(leftCatchJoint.current, true);
        leftCatchJoint.current = null;
      }
      if (rightCatchJoint.current) {
        world.removeImpulseJoint(rightCatchJoint.current, true);
        rightCatchJoint.current = null;
      }
      boardBody.current?.setAdditionalMass(0, true);
      boardBody.current?.setAngularDamping(0.9);
      boardBody.current?.setEnabledRotations(true, true, true, true);
      leftShoeBody.current?.setAdditionalMass(0, true);
      rightShoeBody.current?.setAdditionalMass(0, true);
      leftShoeBody.current?.setEnabledRotations(true, true, true, true);
      rightShoeBody.current?.setEnabledRotations(true, true, true, true);
      // Authored preparation and trick animation must not be corrected by
      // Rapier contacts. Collisions are enabled only at the catch handoff.
      setBodyCollisionGroups(boardBody.current, BOARD_AUTHORED_GROUPS);
      leftShoeCollider.current?.setCollisionGroups(SHOE_AUTHORED_GROUPS);
      rightShoeCollider.current?.setCollisionGroups(SHOE_AUTHORED_GROUPS);
      const resetBody = (
        body: RapierRigidBody | null,
        position: THREE.Vector3,
        quaternion: THREE.Quaternion,
      ) => {
        if (!body) return;
        body.setTranslation(position, true);
        body.setRotation(quaternion, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      };
      const preserveRenderedShoePose = (
        body: RapierRigidBody | null,
        renderedPosition: THREE.Vector3,
        renderedQuaternion: THREE.Quaternion,
        shoe: THREE.Group,
      ) => {
        // body' * restoredChild = capturedRenderedWorld
        landingShoeQuaternion.current
          .copy(renderedQuaternion)
          .multiply(caughtQuaternion.current.copy(shoe.quaternion).invert())
          .normalize();
        shoeLocalOffset.current
          .copy(shoe.position)
          .multiplyScalar(presentationScale)
          .applyQuaternion(landingShoeQuaternion.current);
        caughtPosition.current
          .copy(renderedPosition)
          .sub(shoeLocalOffset.current);
        resetBody(
          body,
          caughtPosition.current,
          landingShoeQuaternion.current,
        );
      };
      if (rearmFromLanding.current) {
        resetBody(
          boardBody.current,
          rearmBoardPosition.current,
          rearmBoardQuaternion.current,
        );
        preserveRenderedShoePose(
          leftShoeBody.current,
          rearmLeftShoePosition.current,
          rearmLeftShoeQuaternion.current,
          leftShoe,
        );
        preserveRenderedShoePose(
          rightShoeBody.current,
          rearmRightShoePosition.current,
          rearmRightShoeQuaternion.current,
          rightShoe,
        );
        rearmFromLanding.current = false;
      } else {
        resetBody(
          boardBody.current,
          boardTargetPosition.current,
          boardTargetQuaternion.current,
        );
        resetBody(
          leftShoeBody.current,
          leftTargetPosition.current,
          leftTargetQuaternion.current,
        );
        resetBody(
          rightShoeBody.current,
          rightTargetPosition.current,
          rightTargetQuaternion.current,
        );
      }
      physicsInitialized.current = true;
      forceMainVisualSyncFrames.current = 2;
    }

    if (!physicsReleased.current) {
      for (const body of [
        boardBody.current,
        leftShoeBody.current,
        rightShoeBody.current,
      ]) {
        body?.setGravityScale(1, true);
      }
      const placeAuthoredBody = (
        body: RapierRigidBody | null,
        position: THREE.Vector3,
        quaternion: THREE.Quaternion,
      ) => {
        if (!body) return;
        // Curves already provide smooth interpolation and authored bodies do
        // not collide. Keeping a velocity follower here only introduced pose
        // lag, followed by a visible teleport when catch snapped to the exact
        // target. Rapier begins integrating motion only after the handoff.
        body.setTranslation(position, true);
        body.setRotation(quaternion, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      };
      placeAuthoredBody(
        boardBody.current,
        boardTargetPosition.current,
        boardTargetQuaternion.current,
      );
      placeAuthoredBody(
        leftShoeBody.current,
        leftTargetPosition.current,
        leftTargetQuaternion.current,
      );
      placeAuthoredBody(
        rightShoeBody.current,
        rightTargetPosition.current,
        rightTargetQuaternion.current,
      );
    } else {
      // No authored driver is allowed after catch. Keeping gravity enabled is
      // the only per-step intervention; Rapier owns all translation/rotation.
      for (const body of [
        boardBody.current,
        leftShoeBody.current,
        rightShoeBody.current,
      ]) {
        // The model and its colliders are presented at 8-10x scale. Matching
        // gravity after handoff preserves real-time acceleration relative to
        // the visible board instead of making free-fall look slow-motion.
        body?.setGravityScale(presentationScale * PHYSICS_GRAVITY_SCALE, true);
      }
    }
    previousProgress.current = state.progress;
  });

  useAfterPhysicsStep(() => {
    const currentBoardBody = boardBody.current;
    const currentLeftShoeBody = leftShoeBody.current;
    const currentRightShoeBody = rightShoeBody.current;
    if (
      !board ||
      !currentBoardBody ||
      !currentLeftShoeBody ||
      !currentRightShoeBody
    ) {
      return;
    }

    // Build all three rendered transforms from one post-physics snapshot.
    // Reading Object3D.matrixWorld here used to expose a one-render-frame
    // mismatch at catch: the shoe child was zeroed immediately while R3F's
    // Rapier wrapper had not yet copied the new body transform to its parent.
    // That made only the aerial view show both feet teleport out and back.
    composePhysicsObjectWorldTransform(
      currentBoardBody,
      board,
      presentationScale,
      previewBoardWorldPosition.current,
      previewBoardWorldQuaternion.current,
    );
    composePhysicsObjectWorldTransform(
      currentLeftShoeBody,
      leftShoe,
      presentationScale,
      previewLeftWorldPosition.current,
      previewLeftWorldQuaternion.current,
    );
    composePhysicsObjectWorldTransform(
      currentRightShoeBody,
      rightShoe,
      presentationScale,
      previewRightWorldPosition.current,
      previewRightWorldQuaternion.current,
    );

    motion.current.previewQuaternion
      .copy(previewBoardWorldQuaternion.current)
      .premultiply(previewPresentationInverse)
      .normalize();
    motion.current.previewLeftShoePosition
      .copy(previewLeftWorldPosition.current)
      .sub(previewBoardWorldPosition.current)
      .applyQuaternion(previewPresentationInverse)
      .divideScalar(presentationScale);
    motion.current.previewLeftShoeQuaternion
      .copy(previewLeftWorldQuaternion.current)
      .premultiply(previewPresentationInverse)
      .normalize();
    motion.current.previewRightShoePosition
      .copy(previewRightWorldPosition.current)
      .sub(previewBoardWorldPosition.current)
      .applyQuaternion(previewPresentationInverse)
      .divideScalar(presentationScale);
    motion.current.previewRightShoeQuaternion
      .copy(previewRightWorldQuaternion.current)
      .premultiply(previewPresentationInverse)
      .normalize();
  });

  return (
    <group
      position={presentationPosition}
      rotation={[10 * DEG, -20 * DEG, 0]}
      scale={presentationScale}
      {...inspectionHandlers}
    >
      {/* The animation rig names these shoes by front/rear motion role. From
          the viewer's board-relative stance, those roles map to the opposite
          left/right semantic labels in the keyframing inspector. */}
      {board && <KeyframeObjectRegistry objects={keyframeObjects} />}
      <primitive object={scene} dispose={null} />
      <RigidBody
        ref={boardBody}
        name="keyframe_board"
        colliders="hull"
        collisionGroups={BOARD_AUTHORED_GROUPS}
        friction={0.85}
        restitution={0}
        mass={BOARD_MASS}
        ccd
        canSleep
        linearDamping={0.12}
        angularDamping={0.9}
        onCollisionEnter={handleGroundContact}
      >
        {board && (
          <KeyframeSelect object={board}>
            {board && (
              <primitive object={board} name="keyframe_board" dispose={null} />
            )}
          </KeyframeSelect>
        )}
      </RigidBody>
      <RigidBody
        ref={leftShoeBody}
        name="keyframe_right_shoe"
        colliders={false}
        mass={SHOE_MASS}
        ccd
        canSleep
        linearDamping={0.18}
        angularDamping={1}
        onCollisionEnter={handleGroundContact}
      >
        <CuboidCollider
          ref={leftShoeCollider}
          args={shoeColliderHalfExtents}
          collisionGroups={SHOE_AUTHORED_GROUPS}
          friction={1.1}
          restitution={0}
        />
        <KeyframeSelect object={leftShoe}>
          <primitive
            object={leftShoe}
            name="keyframe_right_shoe"
            dispose={null}
          />
        </KeyframeSelect>
      </RigidBody>
      <RigidBody
        ref={rightShoeBody}
        name="keyframe_left_shoe"
        colliders={false}
        mass={SHOE_MASS}
        ccd
        canSleep
        linearDamping={0.18}
        angularDamping={1}
        onCollisionEnter={handleGroundContact}
      >
        <CuboidCollider
          ref={rightShoeCollider}
          args={shoeColliderHalfExtents}
          collisionGroups={SHOE_AUTHORED_GROUPS}
          friction={1.1}
          restitution={0}
        />
        <KeyframeSelect object={rightShoe}>
          <primitive
            object={rightShoe}
            name="keyframe_left_shoe"
            dispose={null}
          />
        </KeyframeSelect>
      </RigidBody>
      <RigidBody
        ref={groundBody}
        name="skate-ground"
        type="fixed"
        colliders={false}
        position={floorColliderPosition}
      >
        <CuboidCollider
          args={[20, 0.025, 20]}
          collisionGroups={GROUND_COLLISION_GROUPS}
          friction={0.95}
          restitution={0}
        />
      </RigidBody>
    </group>
  );
}

function AerialPreviewCamera() {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [invalidate]);

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={[0, 6, 0]}
      zoom={42}
      near={0.1}
      far={100}
    />
  );
}

function AerialSkateModel({
  modelUrl,
  motion,
}: {
  modelUrl: string;
  motion: RefObject<SkateMotionState>;
}) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const { scene: sourceShoeScene } = useGLTF(SHOE_MODEL_URL);
  const boardGraphicTexture = useTexture(BOARD_GRAPHIC_TEXTURE_URL);
  const boardRef = useRef<THREE.Group>(null);
  const leftShoeRef = useRef<THREE.Group>(null);
  const rightShoeRef = useRef<THREE.Group>(null);
  const { board, scale, ownedMaterials } = useMemo(() => {
    const clonedScene = sourceScene.clone(true);
    const boardObject = clonedScene.getObjectByName("board");
    const materials: THREE.Material[] = [];

    if (!boardObject) {
      return {
        board: new THREE.Group(),
        scale: 1,
        ownedMaterials: materials,
      };
    }

    boardObject.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      const prepareMaterial = (material: THREE.Material) => {
        const clone = material.clone();
        materials.push(clone);
        if (
          /^boardgraphics?$/i.test(clone.name) &&
          clone instanceof THREE.MeshStandardMaterial
        ) {
          clone.map = boardGraphicTexture;
          clone.color.set(0xffffff);
          clone.needsUpdate = true;
        }
        return clone;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(prepareMaterial)
        : prepareMaterial(object.material);
    });

    clonedScene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(boardObject);
    const center = bounds.getCenter(new THREE.Vector3());
    const centerLocal = boardObject.worldToLocal(center.clone());
    const size = bounds.getSize(new THREE.Vector3());
    const previewScale = 2.35 / Math.max(size.x, size.z, 0.001);

    boardObject.removeFromParent();
    boardObject.position
      .copy(centerLocal)
      .multiply(boardObject.scale)
      .multiplyScalar(-1);
    boardObject.quaternion.identity();

    return {
      board: boardObject,
      scale: previewScale,
      ownedMaterials: materials,
    };
  }, [boardGraphicTexture, sourceScene]);

  useEffect(
    () => () => ownedMaterials.forEach((material) => material.dispose()),
    [ownedMaterials],
  );

  const { leftShoe, rightShoe, shoeGeometries } = useMemo(() => {
    const sourceMeshes: THREE.Mesh[] = [];
    sourceShoeScene.traverse((object) => {
      if (object instanceof THREE.Mesh) sourceMeshes.push(object);
    });
    const sourceMesh = sourceMeshes[0];
    if (!sourceMesh) {
      throw new Error("The skate shoe model contains no mesh.");
    }

    sourceShoeScene.updateMatrixWorld(true);
    const geometries = splitShoePairGeometry(sourceMesh.geometry);
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    sourceMesh.matrixWorld.decompose(
      worldPosition,
      worldQuaternion,
      worldScale,
    );

    const makeShoe = (geometry: THREE.BufferGeometry) => {
      const mesh = new THREE.Mesh(geometry, sourceMesh.material);
      mesh.position.copy(worldPosition);
      mesh.quaternion.copy(worldQuaternion);
      mesh.scale.copy(worldScale);
      mesh.updateMatrixWorld(true);
      const center = new THREE.Box3()
        .setFromObject(mesh)
        .getCenter(new THREE.Vector3());
      mesh.position.sub(center);
      const rig = new THREE.Group();
      rig.scale.setScalar(SHOE_SCALE);
      rig.add(mesh);
      return rig;
    };

    return {
      leftShoe: makeShoe(geometries.left),
      rightShoe: makeShoe(geometries.right),
      shoeGeometries: geometries,
    };
  }, [sourceShoeScene]);

  useEffect(
    () => () => {
      shoeGeometries.left.dispose();
      shoeGeometries.right.dispose();
    },
    [shoeGeometries],
  );

  useFrame(() => {
    boardRef.current?.quaternion.copy(motion.current.previewQuaternion);
    leftShoeRef.current?.position.copy(motion.current.previewLeftShoePosition);
    leftShoeRef.current?.quaternion.copy(
      motion.current.previewLeftShoeQuaternion,
    );
    rightShoeRef.current?.position.copy(
      motion.current.previewRightShoePosition,
    );
    rightShoeRef.current?.quaternion.copy(
      motion.current.previewRightShoeQuaternion,
    );
  });

  return (
    <group scale={scale}>
      <group ref={boardRef}>
        <primitive object={board} dispose={null} />
      </group>
      <group ref={leftShoeRef}>
        <primitive object={leftShoe} dispose={null} />
      </group>
      <group ref={rightShoeRef}>
        <primitive object={rightShoe} dispose={null} />
      </group>
    </group>
  );
}

function SkateAerialPreview({
  modelUrl,
  motion,
}: {
  modelUrl: string;
  motion: RefObject<SkateMotionState>;
}) {
  return (
    <aside
      data-page-navigation-ignore
      aria-label="Live top-down skateboard view"
      className="skate-aerial-preview w-full select-none max-[1149px]:hidden"
    >
      <div className="shadow-md relative h-[11.5rem] overflow-hidden rounded-[1rem] border-[3px] border-[#c8c8c8] bg-[radial-gradient(circle_at_50%_42%,#fff_0%,#f1f2f4_65%,#dfe1e5_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.68),inset_0_0_0_2px_rgba(0,0,0,0.12),0_1px_0_#0b0b0c,0_14px_30px_rgba(0,0,0,0.2)]">
        <Canvas
          orthographic
          dpr={1}
          frameloop="always"
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
          style={{ pointerEvents: "none" }}
        >
          <AerialPreviewCamera />
          <ambientLight intensity={1.25} />
          <hemisphereLight intensity={1.1} groundColor="#9ca3af" />
          <directionalLight position={[-3, 7, 4]} intensity={2.1} />
          <Suspense fallback={null}>
            <AerialSkateModel modelUrl={modelUrl} motion={motion} />
          </Suspense>
        </Canvas>
        <div className="pointer-events-none absolute inset-[1px] rounded-[0.75rem] border border-white/70 shadow-[inset_0_0_18px_rgba(0,0,0,0.08)]" />
        <div className="absolute left-2.5 top-2.5 flex items-center gap-2 rounded-full border border-white/15 bg-black/80 px-2.5 py-1.5 text-white shadow-md backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-orange-500 shadow-[0_0_7px_#f97316]" />
          <strong className="text-[0.48rem] font-bold uppercase tracking-[0.16em]">
            Aerial view
          </strong>
        </div>
      </div>
    </aside>
  );
}

function SkateMobileCameraConfiguration({
  positionInfoEnabled,
}: {
  positionInfoEnabled: boolean;
}) {
  const { camera, invalidate, size } = useThree();
  const isMobile = size.width <= 640;

  useLayoutEffect(() => {
    if (!isMobile || positionInfoEnabled) return;
    camera.position.set(4.82398, -5.60948, 50);
    camera.quaternion.identity();
    camera.zoom = SKATE_MOBILE_CAMERA_ZOOM;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    invalidate();
  }, [camera, invalidate, isMobile, positionInfoEnabled]);

  return null;
}

function SkateCanvas({
  modelUrl,
  motion,
}: {
  modelUrl: string;
  motion: RefObject<SkateMotionState>;
}) {
  const { viewerOpen } = useSceneInspector();
  const { enabled: positionInfoEnabled } = usePositionInfoMode();
  const { enabled: keyframingEnabled } = useKeyframingMode();

  return (
    <div className="portfolio-scene-canvas portfolio-scene-skate absolute inset-y-0 left-1/2 z-20 w-screen -translate-x-1/2">
      <Canvas
        orthographic
        camera={{
          position: [4.82398, -5.60948, 50],
          zoom: 28.63946,
          near: 0.01,
          far: 1000,
        }}
        dpr={[1, 1.3]}
        frameloop={viewerOpen ? "never" : "always"}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        shadows="percentage"
      >
        <Suspense fallback={null}>
          <Physics
            gravity={[0, -9.81, 0]}
            timeStep={1 / 60}
            interpolate
            numSolverIterations={12}
            numInternalPgsIterations={4}
            maxCcdSubsteps={2}
          >
            <hemisphereLight intensity={1.25} groundColor="#b8b8b8" />
            <directionalLight
              castShadow
              intensity={1.65}
              position={[-35, 260, -45]}
              shadow-bias={-0.00005}
              shadow-camera-bottom={-128}
              shadow-camera-far={900}
              shadow-camera-left={-128}
              shadow-camera-right={128}
              shadow-camera-top={128}
              shadow-mapSize-height={2048}
              shadow-mapSize-width={2048}
              shadow-normalBias={0.006}
              shadow-radius={2}
            />
            <SkateModel modelUrl={modelUrl} motion={motion} />
            <NeutralEnvironment />
          </Physics>
        </Suspense>
        <SkateMobileCameraConfiguration
          positionInfoEnabled={positionInfoEnabled}
        />
        {(positionInfoEnabled || keyframingEnabled) && (
          <OrbitControls
            makeDefault
            target={[4.82398, -5.60948, 0]}
            enableDamping
            dampingFactor={0.08}
            enablePan
            enableRotate
            enableZoom
            minZoom={0.01}
            maxZoom={Number.POSITIVE_INFINITY}
          />
        )}
        <SceneOutline keyframing={false} />
        <SceneKeyframingProbe />
      </Canvas>
    </div>
  );
}

export function SkateAnalysisScene({ modelUrl }: { modelUrl: string }) {
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const motion = useRef<SkateMotionState>({
    channels: createDefaultChannels(),
    rotationMax: createDefaultRotationMax(),
    footCatch: createDefaultFootCatch(),
    preparationElapsed: 0,
    progress: 0,
    restartDelayRemaining: 0,
    resetVersion: 0,
    paused: false,
    previewQuaternion: new THREE.Quaternion(),
    previewLeftShoePosition: new THREE.Vector3(),
    previewLeftShoeQuaternion: new THREE.Quaternion(),
    previewRightShoePosition: new THREE.Vector3(),
    previewRightShoeQuaternion: new THREE.Quaternion(),
  });

  return (
    <>
      <SkateCanvas modelUrl={modelUrl} motion={motion} />
      <button
        type="button"
        aria-expanded={mobileToolsOpen}
        data-page-navigation-ignore
        onClick={() => setMobileToolsOpen((open) => !open)}
        className="absolute right-3 top-[8.75rem] z-40 hidden rounded-full border border-black/15 bg-white/90 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] shadow-sm backdrop-blur max-sm:block"
      >
        {mobileToolsOpen ? "Close curves" : "Motion curves"}
      </button>
      <nav
        data-page-navigation-ignore
        aria-label="Skate trick shortcuts"
        className={`absolute bottom-[4.25rem] left-1/2 z-30 hidden w-[calc(100%-7rem)] -translate-x-1/2 grid-cols-4 gap-1 max-sm:grid ${mobileToolsOpen ? "max-sm:hidden" : ""}`}
      >
        {GENERATED_TRICK_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="min-w-0 truncate rounded-md border border-black/12 bg-white/90 px-1.5 py-1.5 text-[0.48rem] font-semibold uppercase tracking-[0.05em] text-black shadow-sm backdrop-blur-sm transition active:bg-orange-500 active:text-white"
            title={preset.label}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent<string>(SKATE_MOBILE_PRESET_EVENT, {
                  detail: preset.id,
                }),
              )
            }
          >
            {preset.label.replace("Bigspin ", "Big ").replace("Varial ", "Var. ")}
          </button>
        ))}
      </nav>
      <div
        data-page-navigation-ignore
        className={`skate-tools-column absolute right-[4.5rem] top-4 z-30 flex w-[22rem] origin-top-right flex-col gap-3 max-[1149px]:right-12 ${mobileToolsOpen ? "" : "max-sm:hidden"}`}
      >
        <SkateMotionEditor motion={motion} />
        <SkateAerialPreview modelUrl={modelUrl} motion={motion} />
      </div>
      <style jsx global>{`
        .skate-tools-column {
          transform-origin: top right;
        }

        @media (min-width: 1150px) and (max-height: 900px) {
          .skate-tools-column {
            transform: scale(0.84);
          }
        }

        @media (min-width: 641px) and (max-height: 760px) {
          .skate-tools-column {
            top: 0.5rem;
            transform: scale(0.76);
          }

          .skate-motion-editor {
            padding-bottom: 0.4rem;
            padding-top: 0.4rem;
          }

          .skate-motion-editor .motion-curve-article {
            padding-bottom: 0.125rem;
          }

          .skate-motion-editor .motion-curve-plot {
            height: 2.25rem;
          }

          .skate-motion-editor .motion-curve-plot.motion-curve-height {
            height: 4.5rem;
          }

          .skate-motion-editor .motion-curve-axis-labels {
            display: none;
          }

          .skate-motion-editor .motion-curve-footer {
            margin-top: 0.25rem;
            padding-bottom: 0.375rem;
            padding-top: 0.375rem;
          }
        }

        @media (max-width: 640px) {
          .skate-tools-column {
            bottom: 3.75rem;
            left: 0.75rem;
            max-height: calc(100% - 13rem);
            overflow-x: hidden;
            overflow-y: auto;
            right: 0.75rem;
            top: 12rem;
            transform: none;
            width: auto;
          }

          body:has(.skate-motion-editor) #lead-container {
            padding-top: 1rem;
          }

          body:has(.skate-motion-editor) #lead-card {
            float: none !important;
            margin-left: 0.75rem;
            padding: 1rem;
            width: calc(100% - 3.5rem);
          }

          body:has(.skate-motion-editor) #lead-card > p:first-child {
            font-size: 1.55rem;
            line-height: 1.05;
            margin-bottom: 0;
          }

          body:has(.skate-motion-editor) #lead-card > p:last-child {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

useGLTF.preload("/Models/skate.glb");
useGLTF.preload(SHOE_MODEL_URL);
useTexture.preload(BOARD_GRAPHIC_TEXTURE_URL);
