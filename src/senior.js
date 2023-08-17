import * as THREE from "three";
// import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
import { View } from "./View.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Outline } from "./Outline.js";

import { SelectiveGlow } from "./SelectiveGlow.js";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  this.ONLY_SCENE_ZOOM = true;
  this.seniorModel;
  // State data
  this.LOADED = false;
  this.directionalLight;
  //   this.camera.position.set(0, 0, 10);

  this.LOADED = true;
  this.clock = new THREE.Clock();

  loadSenior(this);
  initLighting(this);

  //   this.ground = new THREE.Mesh(
  //     new THREE.PlaneGeometry(300, 300),
  //     new THREE.ShadowMaterial({
  //       opacity: 1,
  //       color: 0xbdbdbd,
  //     })
  //   );
  //   this.ground.receiveShadow = true;
  //   this.ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.radian(-65));
  //   this.ground.position.y -= 2;

  let width = View.vpWidth;
  let height = View.vpHeight;

  this.camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    0.0001,
    10000
  );
  this.camera.zoom = 1.5;
  this.camera.updateProjectionMatrix();
  this.camera.position.x = -80;
  this.camera.position.z = 300;

  this.ol = new Outline(this.scene, this.camera, View.renderer);
  this.sg = new SelectiveGlow(this.scene, this.camera, View.renderer);
  //   this.intersect = intersect;
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
  //   view.directionalLight.position.set(-200, 200, -100);
  //   view.directionalLight.shadow.camera.far = 1000;
  //   setShadowSize(view.directionalLight, 1000, 1500);
  view.directionalLight.position.set(300, 500, -100);
  view.directionalLight.shadow.camera.far = 2000;
  setShadowSize(view.directionalLight, 1000, 400);

  const helper = new THREE.DirectionalLightHelper(
    view.directionalLight,
    6,
    0x0000ff
  );
  view.scene.add(view.directionalLight);
}

function loadSenior(view) {
  view.loader.load(
    "/src/assets/Models/senior.glb",
    (gltf) => {
      view.seniorModel = gltf.scene;
      view.seniorModel.traverse((i) => {
        if (i.isMesh) {
          i.castShadow = true;
          i.receiveShadow = true;

          if (i.name === "Ground") {
            i.material = new THREE.ShadowMaterial({
              opacity: 1,
              color: 0xf2f2f2,
              // side: 1,
            });
          } else if (i.name.includes("cover_1")) {
            i.renderOrder = -1;
            i.material.colorWrite = false;
          }
        }
      });
      view.mixer = new THREE.AnimationMixer(view.seniorModel);
      view.action = view.mixer.clipAction(gltf.animations[0]);
      view.action.clampWhenFinished = true;
      view.action.loop = THREE.LoopOnce;
      view.action.play();

      //   view.scene.add(new THREE.AxesHelper(100));
      view.seniorModel.scale.set(25, 25, 25);
      view.seniorModel.rotateOnAxis(
        new THREE.Vector3(1, 0, 0),
        view.radian(15)
      );
      view.seniorModel.rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        view.radian(-80.8)
      );

      //   view.seniorModel.rotation.y = -1.4117304763960312;
      view.seniorModel.rotation.y = -1.7602260356114192;
      view.seniorModel.position.y = -70;
      //   view.scene.position.x -= 15;
      //   view.seniorModel.position.y += 50;
      //   view.seniorModel.position.z -= 500;
      view.seniorModel.name = "senior_glb";
      //   view.seniorModel.userData.scaleFactor = 0.046;
      //   let location = view.seniorModel.position.clone();
      //   view.seniorModel.userData.location_original = location;

      view.scene.add(view.seniorModel);
      console.log("STATUS: SENIOR ADDED TO SCENE OBJECT");
      view.mixer.update(0.013);
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

function render() {
  if (this.LOADED && this.seniorModel) {
    if (this.mouseDown) {
      //   this.seniorModel.position.y -= 1;
      //   console.log(this.seniorModel.position.y);
    }

    // console.log("RENDERING");
    // intersect(this, this.pointer);
    this.startAnimation(true);
    if (this.selectionMode) this.ol.composer.render();
    else View.renderer.render(this.scene, this.camera);
    // this.sg.bloom1.render();
    // this.sg.final.render();

    if (this.mouseDown && this.zoomObject && this.selectionMode) {
      console.log("MOUSE DOWN");
      View.zoomView.outline(this);
    }
  }
}

export { setup, render };
