import * as THREE from "three";
// import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
import { View } from "./View.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Outline } from "./Outline.js";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  this.ONLY_SCENE_ZOOM = true;
  // Satellite Model GLTF
  this.radarModel;
  // State data
  this.LOADED = false;
  this.directionalLight;
  this.camera.position.set(0, 0, 10);

  // this.scene.add(new THREE.AxesHelper(10));
  this.LOADED = true;
  this.clock = new THREE.Clock();
  // this.controls = new OrbitControls(this.camera, View.renderer.domElement);

  //Get your video element:

  // this.ballDestination = new THREE.Vector3(0, 0, 0);
  this.animationRunning = false;

  this.currentButton = null;
  this.buttonMaxBound;

  //Create your video texture:
  // const videoTexture = new THREE.VideoTexture(video);
  // videoTexture.needsUpdate = true;
  // const videoMaterial = new THREE.MeshBasicMaterial({
  //   map: videoTexture,
  //   side: THREE.FrontSide,
  //   toneMapped: false,
  // });
  // videoMaterial.needsUpdate = true;
  // // Create screen
  // const screen = new THREE.PlaneGeometry(100, 100);
  // const videoScreen = new THREE.Mesh(screen, videoMaterial);
  // this.scene.add(videoScreen);

  loadRadarMFD(this);
  // initLighting(this);

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
  let width = 1440;
  let height = 900;

  this.camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    0.01,
    1000
  );
  this.camera.zoom = 1.5;
  this.camera.updateProjectionMatrix();
  this.camera.position.x += 275;

  // this.controls = new OrbitControls(this.camera, View.renderer.domElement);
  // this.controls.update();
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

function loadRadarMFD(view) {
  view.loader.load(
    "/src/assets/Models/RMU.glb",
    (gltf) => {
      view.radarModel = gltf.scene;
      view.radarModel.traverse((i) => {
        if (i.isMesh) {
          i.castShadow = true;
          i.receiveShadow = true;
        }

        if (i.name === "screen_glass") {
          View.rgbLoader
            .setPath("src/assets/textures/")
            .load("cave.hdr", function (texture) {
              texture.mapping = THREE.EquirectangularReflectionMapping;
              // texture.outputColorSpace = THREE.LinearSRGBColorSpace;
              i.material.envMap = texture;
            });
        }
      });
      // view.radarModel.scale.set(1.5, 1.5, 1.5);
      view.radarModel.scale.set(65, 65, 65);
      view.radarModel.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(10));
      view.radarModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(50));

      // view.radarModel.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(90));
      // view.radarModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(80));
      view.scene.position.x -= 15;
      // view.radarModel.position.y += 0.5;
      view.radarModel.position.y += 50;
      // view.radarModel.add(new THREE.AxesHelper(10));
      view.radarModel.position.z -= 500;
      view.radarModel.name = "radar_glb";
      view.radarModel.userData.scaleFactor = 0.046;
      let location = view.radarModel.position.clone();
      view.radarModel.userData.location_original = location;
      // view.radarModel.position.y += 2;
      // view.radarModel.rotateOnAxis(new THREE.Vector3(0, 0, 1), view.radian(-25));
      // view.macbook.position.x -= 10;
      // view.macbook.position.z += 110;
      // view.macbook.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(-90));
      // view.macbook.position.z -= 40;
      // view.macbook.position.x -= 100;

      // view.mixer = new THREE.AnimationMixer(view.macbook);
      // view.action = view.mixer.clipAction(gltf.animations[0]);
      // view.action.clampWhenFinished = true;
      // view.action.loop = THREE.LoopOnce;
      // view.action.play();
      // view.radarModel.add(new THREE.AxesHelper(50));
      view.scene.add(view.radarModel);
      // view.posDelta = -1.5;
      console.log("STATUS: RADAR ADDED TO SCENE OBJECT");
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
        console.log("STATUS: RADAR LOADED 100%");
        View.scenesLoaded++;
        view.LOADED = true;
        view.clock = new THREE.Clock();
        console.log("LOADED RADAR");
        console.log(view.scene);
      }
    },
    (error) => {
      console.log(error);
    }
  );
}

function moveButton(view, button, distance, bound) {
  if (view.currentButton === null) return;

  if (view.mouseDown) {
    if (button.position.z > bound) {
      if (button.position.z - distance < bound) {
        button.position.z = bound;
      } else {
        button.position.z -= distance;
      }
    }
  } else {
    if (button.position.z < view.buttonMaxBound) {
      if (button.position.z + distance > view.buttonMaxBound) {
        button.position.z = view.buttonMaxBound;
        view.currentButton = null;
      } else {
        button.position.z += distance;
      }
    }
  }
}

function intersect(view, pointer) {
  if (View.currentView.name !== view.name) return;
  // update the picking ray with the camera and pointer position

  if (!view.mouseDown) view.intersectObject = null;
  view.raycaster.setFromCamera(pointer, view.camera);
  var intersects = view.raycaster.intersectObjects(view.scene.children);

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

      // view.zoomObject = [intersects[0].object];
      console.log(view.zoomObject);
    } else {
      // pointer logic
      if (intersects[0].object.parent.name.includes("Plane"))
        view.updateCursor("pointer");
      else view.updateCursor("default");

      // selection logic
      if (
        view.currentButton === null &&
        intersects[0].object.parent.name.includes("Plane") &&
        view.mouseDown
      ) {
        console.log(`FOUND: ${intersects[0].object.parent.name}`);
        view.currentButton = intersects[0].object.parent;
        view.buttonMaxBound = view.currentButton.position.z;
      }
    }
  } else {
    if (view.selectionMode) {
      view.ol.outlinePass.selectedObjects = [];
      view.zoomObject = null;
    }
  }
  if (view.selectionMode) view.updateCursor("zoom-in");

  // Button handling
  moveButton(view, view.currentButton, 0.03, 0.31);
}
function render() {
  if (this.LOADED && this.radarModel) {
    intersect(this, this.pointer);
    // moveButton(this, this.currentButton, 0.03, 0.31);
    if (this.selectionMode) this.ol.composer.render();
    else View.renderer.render(this.scene, this.camera);

    if (this.mouseDown && this.zoomObject && this.selectionMode) {
      console.log("MOUSE DOWN");
      View.zoomView.outline(this);
    }
  }
}

export { setup, render };
