// import * as THREE from "three";
import * as THREE from "three";
import { View } from "./View.js";
import { TWEEN } from "https://unpkg.com/three@0.139.0/examples/jsm/libs/tween.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SelectiveGlow } from "./SelectiveGlow.js";
import { Outline } from "./Outline.js";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  this.ONLY_SCENE_ZOOM = true;
  this.workstationModel;
  this.LOADED;
  this.directionalLight;
  this.ground;

  // Mesh objects
  this.ultrawide;
  this.laptop_top;
  this.chair;
  this.upper_drawer;
  this.lower_drawer;
  this.window;
  this.plant;

  this.clickables = [
    "laptop_screen",
    "chair",
    "ultrawide_screen",
    "window",
    "drawer_bottom",
    "drawer_top",
  ];
  this.objs_list = [];

  // Animation data
  this.screen_on = true;
  this.screen_on_material;
  this.lid_rotation = 110;
  this.window_rotation = 110;
  this.drawer_delta = 0.3;

  this.intersectObject = null;
  let scene = this.scene;

  this.controls;

  initLighting(this);
  this.ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.ShadowMaterial({
      opacity: 1,
      color: 0xbdbdbd,
    })
  );
  this.ground.receiveShadow = true;
  this.ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.radian(-90));
  // this.ground.position.y += 2;
  this.ground.name = "ground";
  // this.scene.add(this.ground);
  console.log(this.scene);
  // View.renderer.render(this.scene, this.camera);

  loadWorkstation(this);

  this.ol = new Outline(this.scene, this.camera, View.renderer);
  this.intersect = intersect;
}

function setShadowSize(light1, sz, mapSz) {
  light1.shadow.camera.left = sz;
  light1.shadow.camera.bottom = sz;
  light1.shadow.camera.right = -sz;
  light1.shadow.camera.top = -sz;
  if (mapSz) {
    light1.shadow.mapSize.set(mapSz, mapSz);
  }
}

function initLighting(view) {
  view.directionalLight = new THREE.DirectionalLight();
  view.directionalLight.position.set(20, 20, -20);
  view.directionalLight.castShadow = true;
  view.directionalLight.position.set(30, 100, 100);
  view.directionalLight.shadow.camera.far = 400;
  setShadowSize(view.directionalLight, 30, 1000);
  // view.directionalLight.shadow.mapSize.width = 256;
  // view.directionalLight.shadow.mapSize.height = 256;
  // view.directionalLight.shadow.camera.near = 0.5;
  // view.directionalLight.shadow.camera.far = 25;
  // view.directionalLight.shadow.camera.left = -10;
  // view.directionalLight.shadow.camera.right = 10;
  // view.directionalLight.shadow.camera.top = 10;
  // view.directionalLight.shadow.camera.bottom = -10;
  // view.directionalLight.shadow.radius = 5;
  // view.directionalLight.shadow.blurSamples = 25;
  // view.directionalLight.shadow.mapSize = new THREE.Vector2(4096, 4096);
  // view.directionalLight.shadow.camera.near = 1;
  // view.directionalLight.shadow.camera.far = 3;

  // dirLightLeft = new THREE.DirectionalLight(0xffffff, 2);
  // dirLightLeft.position.set(-50, 0, 25);

  // dirLightRight = new THREE.DirectionalLight(0xffffff, 2);
  // dirLightRight.position.set(50, 0, 25);

  const helper = new THREE.DirectionalLightHelper(
    view.directionalLight,
    6,
    0x0000ff
  );
  view.scene.add(view.directionalLight);
  // view.scene.add(helper);
  // sceneDebug(scene, helper);

  // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  // scene.add(dirLightLeft, dirLightRight, ambientLight);
}

function loadWorkstation(view) {
  view.loader.load(
    "/src/assets/Models/workdesk_window.glb",
    (gltf) => {
      view.workstationModel = gltf.scene;
      view.workstationModel.traverse((i) => {
        if (i.isMesh) {
          i.castShadow = true;
          i.receiveShadow = true;
        }

        if (view.clickables.includes(i.name)) {
          i.userData.clickable = true;
          view.objs_list.push(i);

          if (i.name === "ultrawide_screen")
            view.screen_on_material = i.material;
          else if (i.name.includes("drawer_")) {
            i.userData.status = "closed";
            // console.log(i);
          }
        }
      });

      view.camera.position.set(0, 10, 27);
      // view.controls = new OrbitControls(view.camera, View.renderer.domElement);
      // this.controls.touches.ONE = THREE.TOUCH.PAN;
      // this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      // view.controls.target.set(0, 9, 27);
      // view.controls.update();
      // view.controls.reset();
      // view.controls.update();
      view.workstationModel.scale.set(10, 10, 10);

      view.scene.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(15));
      view.scene.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(45));

      // view.workstationModel.rotateOnAxis(
      //   new THREE.Vector3(1, 0, 0),
      //   view.radian(15)
      // );
      // view.workstationModel.rotateOnAxis(
      //   new THREE.Vector3(0, 1, 0),
      //   view.radian(45)
      // );
      view.workstationModel.position.y += 2.1;
      view.workstationModel.position.x += 8;
      view.workstationModel.rotation.y -= 1.7;
      view.workstationModel.name = "workdesk_glb";
      view.workstationModel.add(view.ground);
      view.workstationModel.userData.location_original = new THREE.Vector3(
        8,
        2.1,
        0
      );
      //   workstationModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.785398);
      //   console.log(workstationModel);
      view.scene.add(view.workstationModel);
      view.clock = new THREE.Clock();
      console.log("STATUS: WORK ADDED TO SCENE OBJECT");
      // View.renderer.compile(view.scene, view.camera);
      // view.renderToCanvas();
      view.ol.composer.render();
      View.renderer.render(view.scene, view.camera);
      self.postMessage({
        type: "updateLoadPercentage",
      });
    },

    (xhr) => {
      View.loadStatuses[view.modelLoadIndex] = (xhr.loaded / xhr.total) * 100;
      if ((xhr.loaded / xhr.total) * 100 == 100) {
        console.log("STATUS: WORK LOADED 100%");
        View.scenesLoaded++;
        view.LOADED = true;
        console.log("DONE");
      }
    },
    (error) => {
      console.log(error);
    }
  );
}

function processAnimation(view) {
  let object = view.intersectObject;
  if (object.name === "laptop_screen") {
    const openCloseLid = new TWEEN.Tween(object.rotation)
      .to(
        {
          z: object.rotation.z + view.radian(view.lid_rotation),
        },
        300
      )
      .onComplete(() => {
        view.lid_rotation *= -1;
        view.intersectObject = null;
      });
    openCloseLid.start();
  } else if (object.name === "ultrawide_screen") {
    let screen = 1;
    if (view.screen_on === true) screen = 0;

    const delay = new TWEEN.Tween(object.rotation)
      .to({}, 100)
      .onComplete(() => {
        view.screen_on = !view.screen_on;
        view.intersectObject = null;
      });
    const screenOnOff = new TWEEN.Tween(object.material.color)
      .to(
        {
          r: screen,
          g: screen,
          b: screen,
        },
        100
      )
      .chain(delay)
      .start();
  } else if (object.name === "window") {
    const delay = new TWEEN.Tween(object.rotation)
      .to({}, 100)
      .onComplete(() => {
        view.window_rotation *= -1;
        view.intersectObject = null;
      });
    const openWindow = new TWEEN.Tween(object.rotation)
      .to(
        {
          z: object.rotation.z + view.radian(view.window_rotation),
        },
        250
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .chain(delay)
      .start();
  } else if (object.name.includes("drawer_")) {
    // console.log(`object: ${object.name} current: ${view.drawer[object.name]}`);
    let direction = -1;
    let newStatus = "closed";
    if (object.userData.status === "closed") {
      direction = 1;
      newStatus = "open";
    }

    const openDrawer = new TWEEN.Tween(object.position)
      .to(
        {
          z: object.position.z + view.drawer_delta * direction,
        },
        250
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        object.userData.status = newStatus;
        // console.log(`new status: ${view.drawer[object.name]}`);
        view.intersectObject = null;
      })
      .start();
  } else if (object.name === "chair") {
    const chair_movement3 = new TWEEN.Tween(object.position).to(
      {
        y: object.position.y,
      },
      300
    );

    const rotation = new TWEEN.Tween(object.rotation)
      .to(
        {
          z: object.rotation.z + view.radian(360),
        },
        400
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .chain(chair_movement3);

    const chair_movement2 = new TWEEN.Tween(object.position)
      .to(
        {
          y: object.position.y - 8,
        },
        400
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onStart(() => {
        rotation.start();
      });

    const chair_movement1 = new TWEEN.Tween(object.position)
      .to(
        {
          y: object.position.y - 7,
        },
        300
      )
      .chain(chair_movement2);

    chair_movement3.onComplete(() => {
      view.intersectObject = null;
    });
    chair_movement1.start();
  }
}

function intersect(view, pointer) {
  // update the picking ray with the camera and pointer position

  // if (!view.mouseDown) view.intersectObject = null;
  // console.log(`pointer (${pointer.x}, ${pointer.y})`);
  view.raycaster.setFromCamera(pointer, view.camera);
  var intersects = view.raycaster.intersectObjects(view.objs_list, false);
  // if (view.mouseUp) view.FAST_ACTION_VALID = true;

  if (intersects.length > 0) {
    if (
      view.selectionMode &&
      view.ol.outlinePass.selectedObjects !== [intersects[0].object]
    ) {
      // view.ol.outlinePass.selectedObjects = [intersects[0].object];
      if (view.ONLY_SCENE_ZOOM) {
        view.ol.outlinePass.selectedObjects = [view.scene];
        view.zoomObject = view.scene;
      } else {
        view.ol.outlinePass.selectedObjects = [intersects[0].object];
        view.zoomObject = [intersects[0].object];
      }
      // console.log(view.zoomObject);
    } else if (
      intersects[0].object.userData.clickable &&
      view.intersectObject === null
    ) {
      view.updateCursor("pointer");
      // else view.updateCursor("default");

      // selection logic
      if (
        view.intersectObject === null &&
        intersects[0].object.userData.clickable &&
        view.mouseDown
      ) {
        view.intersectObject = intersects[0].object;

        // let actionPending =
        //   view.intersectObject.name === "ultrawide_screen" &&
        //   view.FAST_ACTION_VALID === false;

        processAnimation(view);
      }
    }
  } else {
    if (view.selectionMode) {
      view.ol.outlinePass.selectedObjects = [];
      view.zoomObject = null;
    }
    view.updateCursor("default");
  }

  if (view.selectionMode) view.updateCursor("zoom-in");
}

function render() {
  // var isVisible = View.checkVisible(this.canvas);
  // if (this.initFrameRendered && !isVisible) return [false, false];

  if (this.LOADED && this.workstationModel) {
    this.intersect(this, this.pointer);
    if (this.selectionMode) {
      this.ol.composer.render();
      console.log("WORK COMPOSER RENDER");
    } else View.renderer.render(this.scene, this.camera);

    if (this.mouseDown && this.zoomObject && this.selectionMode) {
      console.log("MOUSE DOWN");
      View.zoomView.outline(this);
    }
    TWEEN.update();
    // if (this.controls) this.controls.update();

    // if (!this.initFrameRendered) this.initFrameRendered = true;

    if (this.workstationModel) {
      this.workstationModel.rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        this.radian(0.5)
      );
    }
  }

  // let renderCheck = true;
  // let canvasCheck = this.renderToCanvas();
  // return [renderCheck, canvasCheck];
}
export { setup, render };
