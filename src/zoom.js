import * as THREE from "three";
// import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
import { View } from "./View.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js";
import { TWEEN } from "https://unpkg.com/three@0.139.0/examples/jsm/libs/tween.module.min.js";

if (View.MUTE_LOGS) console.log = function () {};

function outline(view) {
  View.inputElement.top = 0;
  this.disableScroll();
  this.updateCursor("default");
  console.log("RENDERING OUTLINE");
  view.selectionMode = false;
  View.zoomView.controls.reset();

  if (view.objs_list) this.objs_list = view.objs_list;

  if (view.ONLY_SCENE_ZOOM) {
    View.zoomView.model = view.scene;
    View.zoomView.model_parent = view.scene;
    for (let i = view.scene.children.length - 1; i >= 0; i--) {
      let child = view.scene.children[i];
      let newScale;
      if (child.type === "Group") child.position.set(0, 0, 0);
      if (child.userData.scaleFactor) {
        newScale = child.scale.multiplyScalar(child.userData.scaleFactor);
        child.scale.copy(newScale);
      }
      View.zoomView.scene.add(child);
    }
    // console.log(View.zoomView.scene);
  } else {
    // Update size/position/rotation
    let child = view.zoomObject;
    let newScale;
    child.position.set(0, 0, 0);
    if (child.userData.scaleFactor) {
      newScale = child.scale.multiplyScalar(child.userData.scaleFactor);
      child.scale.copy(newScale);
    }

    View.zoomView.model = child;
    View.zoomView.model_parent = view.zoomObject.parent;
    View.zoomView.scene.add(View.zoomView.model);

    console.log(View.zoomView.scene);
    if (View.zoomView.model.name === "jet_base") {
      View.zoomView.missileGroup = new THREE.Group();
      View.zoomView.missileGroup.name = "missileGroup";
      View.zoomView.scene.add(View.zoomView.missileGroup);
      View.zoomView.jetModel = View.zoomView.model;
      console.log(View.zoomView.scene);
    }
  }

  // View.zoomView.canvasEntry.appendChild(View.renderer.domElement);
  // View.zoomView.moveRenderer(View.zoomView.canvasEntryID);
  View.zoomView.controls.enabled = true;
  // document.body.scrolling = "no";

  View.currentView = View.zoomView;
  View.zoomView.render();
  View.zoomView.intersect = View.previousView.intersect;
  // View.currentView.sectionContainer.style.display = "block";
  let ID = View.zoomView.sectionContainerID;
  View.zoomView.updateStyle(ID, "display", "block");
  console.log(`zoomView canvasEntryID: ${View.zoomView.canvasEntryID}`);
  View.zoomView.moveRenderer(View.zoomView.canvasEntryID);
  // View.currentView.canvasEntry.appendChild(View.renderer.domElement);
  // View.currentView.moveRenderer(View.currentView.canvasEntryID);
  view.ol.outlinePass.selectedObjects = [];
  // View.renderer.compile(View.zoomView.scene, View.zoomView.camera);
  View.renderer.setPixelRatio(2);
  View.zoomView.render();

  // slide nav
  // let nav = document.getElementById("nav");
  // nav.style.top = "-50";
  // console.log(nav.style.top);
}

function setup() {
  // data setup
  this.currentButton = null;

  // work
  this.objs_list = null;

  this.outline = outline;
  this.model = null;
  this.model_parent = null;
  // Satellite Model GLTF
  this.model;
  // State data
  this.LOADED = false;
  this.directionalLight;
  this.camera.position.set(0, 0, 10);

  this.scene.background = new THREE.Color(0xffffff);
  // this.scene.add(new THREE.AxesHelper(50));
  //   this.scene.position.y -= 2;
  //   this.scene.add(new THREE.AxesHelper(100));
  this.LOADED = true;
  this.clock = new THREE.Clock();

  this.ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.ShadowMaterial({
      opacity: 1,
      color: 0xbdbdbd,
    })
  );
  this.ground.receiveShadow = true;
  this.ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.radian(-65));
  this.ground.position.y -= 2;
  // this.scene.add(this.ground);

  // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  // directional
  // this.scene.add(directionalLight);

  // const light = new THREE.AmbientLight(0x404040, 20); // soft white light
  // this.scene.add(light);

  // this.camera = new THREE.OrthographicCamera(
  //   window.innerWidth / -2,
  //   window.innerWidth / 2,
  //   window.innerHeight / 2,
  //   window.innerHeight / -2,
  //   0.01,
  //   1000
  // );
  let width = 1400;
  let height = 900;
  this.camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    0.01,
    1000
  );
  this.camera.zoom = 40;
  this.camera.updateProjectionMatrix();

  this.camera.position.set(0, 0, 50);

  this.controls = new OrbitControls(this.camera, View.inputElement);
  this.controls.enabled = false;
  this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  this.controls.dampingFactor = 0.1;
  this.controls.maxZoom = 75;
  this.controls.minZoom = 20;
  this.controls.zoom = 75;
  this.controls.rotateSpeed = 0.4;
  this.controls.saveState();
  this.controls.update();
  console.log(this.controls);

  this.render();
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
  view.directionalLight = new THREE.DirectionalLight(0xffffff, 1);

  view.directionalLight.castShadow = true;
  // view.directionalLight.position.set(10, 5, 0);
  view.directionalLight.position.set(10, 5, 5);
  view.directionalLight.shadow.camera.far = 400;
  setShadowSize(view.directionalLight, 400, 300);

  const helper = new THREE.DirectionalLightHelper(
    view.directionalLight,
    6,
    0x0000ff
  );
  view.scene.add(view.directionalLight);

  // view.scene.add(new THREE.CameraHelper(view.directionalLight.shadow.camera));
  // view.scene.add(helper);
  // sceneDebug(scene, helper);

  // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  // scene.add(dirLightLeft, dirLightRight, ambientLight);
}

// function loadRadarMFD(view) {
//   view.loader.load(
//     "src/assets/Models/RMU.glb",
//     (gltf) => {
//       view.radarModel = gltf.scene;
//       view.radarModel.traverse((i) => {
//         if (i.isMesh) {
//           i.castShadow = true;
//           i.receiveShadow = true;
//         }

//         if (i.name === "screen_glass") {
//           View.rgbLoader
//             .setPath("src/assets/textures/")
//             .load("cave.hdr", function (texture) {
//               texture.mapping = THREE.EquirectangularReflectionMapping;
//               // texture.outputColorSpace = THREE.LinearSRGBColorSpace;
//               i.material.envMap = texture;
//             });
//         }
//       });
//       // view.radarModel.scale.set(1.5, 1.5, 1.5);
//       view.radarModel.scale.set(65, 65, 65);
//       view.radarModel.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(10));
//       view.radarModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(50));

//       // view.radarModel.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(90));
//       // view.radarModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(80));
//       view.scene.position.x -= 15;
//       // view.radarModel.position.y += 0.5;
//       view.radarModel.position.y += 50;
//       // view.radarModel.add(new THREE.AxesHelper(10));
//       view.radarModel.position.z -= 500;
//       // view.radarModel.position.y += 2;
//       // view.radarModel.rotateOnAxis(new THREE.Vector3(0, 0, 1), view.radian(-25));
//       // view.macbook.position.x -= 10;
//       // view.macbook.position.z += 110;
//       // view.macbook.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(-90));
//       // view.macbook.position.z -= 40;
//       // view.macbook.position.x -= 100;

//       // view.mixer = new THREE.AnimationMixer(view.macbook);
//       // view.action = view.mixer.clipAction(gltf.animations[0]);
//       // view.action.clampWhenFinished = true;
//       // view.action.loop = THREE.LoopOnce;
//       // view.action.play();
//       // view.radarModel.add(new THREE.AxesHelper(50));
//       view.scene.add(view.radarModel);
//       // view.posDelta = -1.5;
//       console.log("STATUS: RADAR ADDED TO SCENE OBJECT");
//       View.renderer.compile(view.scene, view.camera);
//       view.renderToCanvas();
//     },
//     (xhr) => {
//       View.loadStatuses[view.modelLoadIndex] = (xhr.loaded / xhr.total) * 100;
//       if ((xhr.loaded / xhr.total) * 100 == 100) {
//         console.log("STATUS: RADAR LOADED 100%");
//         View.scenesLoaded++;
//         view.LOADED = true;
//         view.clock = new THREE.Clock();
//         console.log("LOADED RADAR");
//         console.log(view.scene);
//       }
//     },
//     (error) => {
//       console.log(error);
//     }
//   );
// }

// function intersect(view) {
//   if (View.currentView.name !== view.name) return;
//   // update the picking ray with the camera and pointer position

//   if (!view.mouseDown) view.intersectObject = null;
//   view.raycaster.setFromCamera(view.pointer, view.camera);
//   var intersects = view.raycaster.intersectObjects(view.scene.children);

//   if (intersects.length > 0) {
//     // pointer logic
//     if (intersects[0].object.parent.name.includes("Plane"))
//       document.body.style.cursor = "pointer";
//     else document.body.style.cursor = "default";

//     // selection logic
//     if (
//       view.currentButton === null &&
//       intersects[0].object.parent.name.includes("Plane") &&
//       view.mouseDown
//     ) {
//       console.log(`FOUND: ${intersects[0].object.parent.name}`);
//       view.currentButton = intersects[0].object.parent;
//       view.buttonMaxBound = view.currentButton.position.z;
//     }
//   }
// }

function render() {
  // var isVisible = this.checkVisible(this.canvas);

  // if (this.initFrameRendered && !isVisible) return [false, false];

  //   if (this.LOADED && this.radarModel) {
  // View.renderer.render(this.scene, this.camera);
  // console.log("RENDERIING JET");

  this.controls.update();
  this.intersect(this, this.pointer);
  View.renderer.render(this.scene, this.camera);
  TWEEN.update();
}

export { setup, render };
