import * as THREE from "three";
// import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
import { TWEEN } from "https://unpkg.com/three@0.139.0/examples/jsm/libs/tween.module.min.js";
import { View } from "./View.js";
import { MotionBlur } from "./MotionBlur.js";
import { Outline } from "./Outline.js";
// import { MotionBlurPass } from "three/addons/postprocessing/MotionBlurPass.js";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  this.jetModel;
  this.LOADED = false;
  this.spotLight;
  this.camera.position.set(0, 0, 12);
  loadJet(this);

  this.missileGroup = new THREE.Group();
  this.missileGroup.name = "missileGroup";
  console.log(this.scene);

  // this.mb = new MotionBlur(this.scene, this.camera, View.renderer);
  this.ol = new Outline(this.scene, this.camera, View.renderer);
  this.intersect = intersect;
}

function loadJet(view) {
  view.loader.load(
    "/src/assets/Models/jet.glb",
    (gltf) => {
      view.jetModel = gltf.scene;
      view.jetModel.traverse((i) => {
        if (i.isMesh) {
          i.castShadow = true;

          if (i.name === "jet_base") {
            let location = i.position.clone();
            i.userData.location_original = location;
            i.userData.scaleFactor = 1.5;
          } else if (i.name.includes("missile_")) {
            i.userData.clickable = true;
            let spotLight = new THREE.DirectionalLight(0xff9263, 3);
            let helper = new THREE.DirectionalLightHelper(
              spotLight,
              1,
              0x0000ff
            );
            // let spotLight = new THREE.SpotLight(0xff6726, 3);
            // spotLight.add(new THREE.AxesHelper(100));
            // spotLight.add(new THREE.AxesHelper(50));
            i.add(spotLight);
            // i.add(helper);
            spotLight.position.y = 6;
            spotLight.visible = false;

            // if (i.name.includes("missile_008") || i.name.includes("missile_009") || i.name.includes("missile_010") )

            if (
              !i.name.includes("missile_008") &&
              !i.name.includes("missile_009") &&
              !i.name.includes("missile_010") &&
              !i.name.includes("missile_011")
            ) {
              let copyObj = spotLight.clone();
              copyObj.position.y -= 6;
              copyObj.visible = true;
              // copyObj.add(new THREE.AxesHelper(50));
              view.jetModel.attach(copyObj);
            }
          }
        }
      });

      // view.jetModel.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(20));
      // view.jetModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(15));
      // view.scene.position.x += 5;

      view.jetModel.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(20));
      view.jetModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(-10));
      if (!View.MOBILE) view.scene.position.x += 5;

      // view.mixer = new THREE.AnimationMixer(view.jetModel);
      // view.action = view.mixer.clipAction(gltf.animations[0]);
      // view.action.clampWhenFinished = true;
      // view.action.loop = THREE.LoopOnce;
      // view.action.play();
      // view.jetModel.add(new THREE.AxesHelper(200));
      // view.missileGroup.add(new THREE.AxesHelper(200));
      view.jetModel.name = "jetModel";
      view.jetModel.userData.terminate = true;
      view.jetModel.userData.additional = "missileGroup";
      view.scene.add(view.jetModel);
      view.scene.add(view.missileGroup);
      // view.renderer.compile(view.scene, view.camera);
      console.log(view.jetModel);
      view.ol.composer.render();
      View.renderer.render(view.scene, view.camera);
      // view.renderToCanvas();

      // view.ol.outlinePass.selectedObjects = [view.jetModel];
      // view.missileGroup.position.x += 1;

      // view.clock = new THREE.Clock();
      view.posDelta = -1.5;
      console.log("STATUS: JET ADDED TO SCENE OBJECT");
      self.postMessage({
        type: "updateLoadPercentage",
      });
    },
    (xhr) => {
      View.loadStatuses[view.modelLoadIndex] = (xhr.loaded / xhr.total) * 100;
      // console.log(`jet total: ${xhr.loaded} / ${xhr.total}`);
      if ((xhr.loaded / xhr.total) * 100 == 100) {
        // View.renderer.render(view.scene, view.camera);
        console.log("STATUS: JET LOADED 100%");
        View.scenesLoaded++;
        view.LOADED = true;
        view.clock = new THREE.Clock();
      }
    },
    (error) => {
      console.log(error);
    }
  );
}

function updateCursor(cursor) {
  self.postMessage({
    type: "updateCursor",
    cursor: cursor,
  });
}
function intersect(view, pointer) {
  // console.log(view);
  view.raycaster.setFromCamera(pointer, view.camera);
  var intersects = view.raycaster.intersectObjects(view.scene.children);
  if (intersects.length > 0) {
    if (
      view.selectionMode &&
      view.ol.outlinePass.selectedObjects !== [intersects[0].object]
    ) {
      if (view.ONLY_SCENE_ZOOM) {
        view.ol.outlinePass.selectedObjects = [view.scene];
        view.zoomObject = view.scene;
      } else {
        let selected = view.getRootGroup(intersects[0].object);
        view.ol.outlinePass.selectedObjects = [selected];
        view.zoomObject = selected;
      }
    } else if (
      view.intersectObject !== intersects[0].object &&
      intersects[0].object.userData.clickable
    ) {
      console.log(`FOUND: ${intersects[0].object.name}`);
      updateCursor("pointer");
      if (view.mouseDown) {
        view.intersectObject = intersects[0].object;
        // console.log(view.jetModel);
        view.missileGroup.rotation.copy(view.jetModel.rotation);
        view.missileGroup.position.copy(view.jetModel.position);
        view.missileGroup.attach(view.intersectObject);
        const launch = new TWEEN.Tween(view.intersectObject.position)
          .to(
            {
              z: view.intersectObject.position.z + 20,
            },
            300
          )
          .easing(TWEEN.Easing.Linear.None)
          .onComplete(() => {
            view.missileGroup.remove(view.intersectObject);
            view.intersectObject = null;
          });

        const dim = new TWEEN.Tween(view.intersectObject.children[0]).to(
          {
            intensity: 0,
          },
          300
        );

        const drop = new TWEEN.Tween(view.intersectObject.position)
          .to(
            {
              y: view.intersectObject.position.y - 0.65,
              z: view.intersectObject.position.z - 0.45,
            },
            500
          )
          .easing(TWEEN.Easing.Quadratic.Out)
          .chain(launch)
          .onComplete(() => {
            // view.intersectObject.children[0].visible = true;
            view.intersectObject.children[0].intensity = 3;
            dim.start();
            // let spotLight = new THREE.SpotLight(0xff6726, 5);
            // spotLight.add(new THREE.AxesHelper(100));
            // let spotLightHelper = new THREE.SpotLightHelper(spotLight);
            // view.intersectObject.add(new THREE.AxesHelper(100));
            // view.intersectObject.add(spotLight);
            // spotLight.position.y = 3;
            // view.intersectObject.add(spotLightHelper);
            // spotLight.position.z -= 1;
            // light.position.copy(view.intersectObject.positon);
            // view.missileGroup.add(spotLight);
            // spotLight.position.copy(view.intersectObject.position);
            // view.missileGroup.add(spotLightHelper);
            // console.log("DROP COMPLETED");
          });

        const rotate = new TWEEN.Tween(view.intersectObject.rotation)
          .to(
            {
              y: view.intersectObject.rotation.y + view.radian(40),
            },
            2000
          )
          .easing(TWEEN.Easing.Linear.None);

        drop.start();
        rotate.start();

        // if (view.intersectObject)
        //   console.log(`intersect object is now: ${view.intersectObject.name}`);
      }
    } else {
      if (view.selectionMode) view.ol.outlinePass.selectedObjects = [];
    }

    // if (intersects[0].object.userData.clickable)
    //   document.body.style.cursor = "pointer";
  } else {
    if (view.selectionMode) {
      view.ol.outlinePass.selectedObjects = [];
      view.zoomObject = null;
    }
    updateCursor("default");
  }
  if (view.selectionMode) updateCursor("zoom-in");
}

function render() {
  // var isVisible = this.checkVisible(this.canvas);

  // if (this.initFrameRendered && !isVisible) return [false, false];

  if (this.LOADED && this.jetModel) {
    this.intersect(this, this.pointer);
    if (this.selectionMode) this.ol.composer.render();
    else View.renderer.render(this.scene, this.camera);
    // View.renderer.render(this.scene, this.camera);

    if (this.mouseDown && this.zoomObject && this.selectionMode) {
      console.log("MOUSE DOWN");
      View.zoomView.outline(this);
    }
    // if (!this.initFrameRendered) {
    //   this.initFrameRendered = true;
    //   console.log("FINISHED JET INIT RENDER");
    // }
    // this.startAnimation(isVisible);
    if (this.jetModel)
      this.floatModel(this.jetModel, this.clock.getElapsedTime(), 0.1, 0.0001);

    TWEEN.update();
    // if (this.intersectObject) {
    //   this.intersectObject.position.z += 1;
    // }
    // }
  }

  // let renderCheck = true;
  // let canvasCheck = this.renderToCanvas();
  // return [renderCheck, canvasCheck];
}

export { setup, render };
