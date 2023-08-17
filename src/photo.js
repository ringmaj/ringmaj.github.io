import * as THREE from "three";
import { AxesHelper } from "three";
// import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { DragControls } from "three/addons/controls/DragControls.js";
import { View } from "./View.js";
// import { Outline } from "./Outline.js";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  this.photoModel;
  this.LOADED;
  // this.directionalLight;
  this.ground;
  this.photoGroup;

  this.deltaMaps = {};
  this.rotationMaps = {};
  this.pivotMaps = [];
  this.pivotDict = {};
  this.photo_arr = [];
  this.photoViewer;
  this.rotDelta = 0;

  this.groundLength = null;
  this.groundDelta = null;
  this.objStartPos = null;
  this.controls;

  this.rotation = 0;

  this.camera.position.set(0, 0, 30);

  this.scene.name = "photoScene";
  this.scene.userData.clickable = false;

  loadPhotoTornado(this);
  // initLighting(this);
  // this.ol = new Outline(this.scene, this.camera, View.renderer);

  this.control_point_1_outline = new THREE.Mesh(
    new THREE.CircleGeometry(15, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ff62 })
  );
  // this.scene.add(this.control_point_1_outline);
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

function initLighting(obj, target) {
  const light = new THREE.DirectionalLight();

  light.castShadow = true;
  // light.lookAt(10, 5, 20);
  light.target = target;
  // view.light.position.set(10, 5, 0);
  light.position.set(20, -120, 350);
  light.shadow.camera.far = 400;
  light.shadowCameraVisible = true;
  // light.shadow.radius = 50;
  // light.shadow.blurSamples = 25;
  // light.shadow.radius = 1;
  // view.light.shadow.camera.near = 0;
  setShadowSize(light, 40, 1000);
  const helper = new THREE.DirectionalLightHelper(light, 6, 0x0000ff);
  obj.add(light);
  // obj.add(new THREE.CameraHelper(light.shadow.camera));
  // obj.add(new THREE.AxesHelper(100));
  // obj.add(helper);
}

function loadPhotoTornado(view) {
  view.loader.load(
    "/src/assets/Models/polaroid_layout.glb",
    (gltf) => {
      view.photoModel = gltf.scene;
      view.photoModel.traverse((i) => {
        if (i.isMesh) {
          i.castShadow = true;
          i.receiveShadow = true;
        }
      });
      view.photoModel.scale.set(20, 20, 20);
      view.photoModel.position.y += 2.1;
      view.photoModel.position.x += 8;
      view.scene.add(view.photoModel);
      view.clock = new THREE.Clock();
      console.log("STATUS: PHOTO ADDED TO SCENE OBJECT");
      // View.renderer.compile(view.scene, view.camera);
      // view.renderToCanvas();
      view.renderer.render(view.scene, view.camera);
      self.postMessage({
        type: "updateLoadPercentage",
      });
    },

    (xhr) => {
      View.loadStatuses[view.modelLoadIndex] = (xhr.loaded / xhr.total) * 100;
      if ((xhr.loaded / xhr.total) * 100 == 100) {
        console.log("STATUS: PHOTO LOADED 100%");
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

function generateRandomFloatInRange(min, max) {
  return Math.random() * (min - max) + max;
}

function handleClick(view) {
  if (view.clicked && view.intersectObject) {
    console.log(`CLICKED: ${view.intersectObject.parent.name}`);
    view.clicked = false;
  }
}

// function intersect(view) {
//   // console.log(view.mouseDrag);
//   // if (View.currentViewView.currentView.name !== view.name) return;
//   if (!view.mouseDown) view.intersectObject = null;
//   // update the picking ray with the camera and pointer position

//   view.raycaster.setFromCamera(view.pointer, view.camera);
//   var intersects = view.raycaster.intersectObjects(view.scene.children);

//   if (intersects.length > 0) {
//     if (
//       view.intersectObject != intersects[0].object &&
//       !intersects[0].object.parent.userData.isGround &&
//       intersects[0].object.parent.userData.clickable &&
//       intersects[0].object.parent.name !== "viewer"
//     ) {
//       // console.log(`FOUND: ${intersects[0].object.parent.name}`);
//       document.body.style.cursor = "pointer";

//       if (view.mouseDown) {
//         // reset previous object
//         if (view.intersectObject) {
//           console.log(
//             `NEW. DESELECTING ${view.intersectObject.parent.userData.name}`
//           );
//         }
//         // notice new object
//         view.intersectObject = intersects[0].object;
//         document.body.style.cursor = "grabbing";
//         view.dragObject = view.intersectObject.parent;
//         // console.log(view.intersectObject.parent);
//         view.photoViewer.children[1].material =
//           view.intersectObject.parent.children[1].material;

//         view.photoViewer.children[0].geometry =
//           view.intersectObject.parent.children[0].geometry;
//         view.photoViewer.children[1].geometry =
//           view.intersectObject.parent.children[1].geometry;
//       }
//     } else {
//       view.intersectObject = null;
//       document.body.style.cursor = "default";
//     }
//   } else {
//     // reset opacity
//     document.body.style.cursor = "default";
//     if (view.intersectObject) view.intersectObject = null;
//   }
//   handleClick(view);
// }

function initDragControls(view) {
  // Setup Drag Controls
  view.controls = new DragControls(
    // view.photo_arr,
    view.scene.children,
    view.camera,
    View.renderer.domElement
  );
  view.controls.transformRoot = false;
  view.controls.enabled = false;

  view.controls.addEventListener("dragstart", function (event) {
    view.mouseDrag = true;
    console.log(`DRAGGING ITEM USING DRAG CONTROLS: ${event.object.name}`);
    console.log(event.object);
    event.object.parent.userData.grabbing = true;
  });
  view.controls.addEventListener("drag", function (event) {
    event.object.parent.children[0].position.copy(event.object.position);
  });
  view.controls.addEventListener("dragend", function (event) {
    view.mouseDrag = false;
    console.log("STOP DRAGGING ITEM USING DRAG CONTROLS");
    event.object.parent.userData.grabbing = false;
  });
}

function sceneTransformations(view) {
  // setup photo group rotations
  view.photoGroup.position.y -= 5;
  view.photoGroup.position.x += 10;
  view.photoGroup.position.z -= 4;
  view.photoGroup.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(65));

  view.photoViewer.position.set(-2.3, -0.3, 27);
  // view.photoViewer.rotateOnAxis(new THREE.Vector3(1, 1, 0), view.radian(45));
  // view.photoViewer.rotateOnAxis(new THREE.Vector3(0, 0, 1), view.radian(-2));
  // view.photoViewer.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(-15));
  // view.photoViewer.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(20));
  view.scene.add(view.photoViewer);
  // view.photoViewer.position.x += 1;
  view.photoViewer.name = "viewer";
  view.photoViewer.userData.name = "viewer";
  view.photoViewer.scale.set(20, 20, 20);
  // view.photoViewer.position.y += 29;
  // view.photoViewer.position.x += 11;
  // view.photoViewer.rotateOnAxis(new THREE.Vector3(0, 0, 1), view.radian(50));

  // view.photoViewer.position.y += 2.2;
  // view.photoViewer.position.x += -2.3;
  // view.photoViewer.add(new THREE.AxesHelper(10));
  view.photoViewer.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(90));
  view.photoViewer.rotateOnAxis(new THREE.Vector3(0, 0, 1), view.radian(90));
  view.photoViewer.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(5));
  view.photoViewer.userData.clickable = true;

  initLighting(view.scene, view.photoGroup);
}

function render(initFrame = false) {
  // intersect(this);

  // Init setup
  if (this.photoModel && this.LOADED) {
    if (
      Object.keys(this.deltaMaps).length === 0 &&
      this.photoModel.children.length === 49
    ) {
      this.photoGroup = new THREE.Group();
      this.photoGroup.name = "photoGroup";
      this.scene.add(this.photoGroup);
      this.scene.remove(this.scene.getObjectByName("Scene"));
      for (let i = this.photoModel.children.length - 1; i >= 0; i--) {
        var item = this.photoModel.children[i];
        // Handle floor and shadows
        if (item.isMesh && item.name === "floor") {
          item.scale.set(100, 100, 100);
          item.material = new THREE.ShadowMaterial({
            opacity: 1,
            color: 0xf2f2f2,
            // side: 1,
          });
          this.photoGroup.add(item);
        }
        // Photo objects
        if (item.isGroup && item.name.includes("photo_")) {
          item.userData.clickable = true;
          item.userData.grabbing = false;
          this.photo_arr.push(item);

          // setup photoviewer
          if (item.name === "photo_tree") {
            this.photoViewer = item.clone();
            this.photoViewer.children[0].castShadow = false;
            this.photoViewer.children[0].receiveShadow = false;
            this.photoViewer.children[1].castShadow = false;
            this.photoViewer.children[1].receiveShadow = false;
          }

          // setup pivot maps
          this.pivotMaps.push(new THREE.Object3D());
          var currentPivot = this.pivotMaps.slice(-1)[0];
          var pivotName = item.userData.name;
          let pos_delta = generateRandomFloatInRange(0.0001, 0.0005);
          let rot_delta = generateRandomFloatInRange(0.0001, 0.01);
          this.deltaMaps[pivotName] = pos_delta;
          this.rotationMaps[pivotName] = rot_delta;
          currentPivot.add(item);
          currentPivot.name = `${pivotName}_pivot`;
          currentPivot.userData.name = `${pivotName}_pivot`;
          currentPivot.scale.set(20, 20, 20);
          this.pivotDict[pivotName] = currentPivot;
          this.photoGroup.add(currentPivot);
        }
      }

      sceneTransformations(this);
      // initDragControls(this);
    }

    for (var key in this.pivotDict) {
      var currentSelectKey = "";
      if (this.intersectObject)
        currentSelectKey = this.intersectObject.parent.userData.name;
      if (
        currentSelectKey !== key &&
        this.pivotDict[key].children[0].userData.grabbing === false
      ) {
        this.pivotDict[key].rotateOnAxis(
          new THREE.Vector3(0, 1, 0),
          this.radian(0.75)
        );
        let photo = this.pivotDict[key].children[0];
        let pos = photo.position.clone();
        let rot = photo.rotation.clone();
        if (this.clock)
          this.floatModel(
            photo,
            this.clock.getElapsedTime(),
            this.deltaMaps[key],
            this.rotationMaps[key]
          );
        photo.position.x += pos.x;
        photo.position.y += pos.y;
      }
    }

    // calc rotations
    // if (this.mouseDown) {
    //   this.photoViewer.rotateOnAxis(
    //     new THREE.Vector3(0, 1, 0),
    //     this.radian(0.5)
    //   );
    //   this.rotation += 0.5;
    //   console.log(this.rotation);
    // }

    if (this.clock) {
      let time = this.clock.getElapsedTime();
      this.photoViewer.children[0].rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        Math.cos(time) * 0.005
      );
      this.photoViewer.children[1].rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        Math.cos(time) * 0.005
      );
    }

    this.renderer.render(this.scene, this.camera);
  }
}
export { setup, render };
