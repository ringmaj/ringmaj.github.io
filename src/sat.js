import * as THREE from "three";

import { SelectiveGlow } from "./SelectiveGlow.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { View } from "./View.js";
import { Outline } from "./Outline.js";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  // this.ONLY_SCENE_ZOOM = true;
  // console.log("ENTERING SAT SETUP");

  // Satellite Model GLTF
  this.satModel = undefined;
  this.starModel = undefined;

  // State data
  this.LOADED = false;
  this.stars = [];
  this.pivot = new THREE.Object3D();

  this.satMesh = undefined;
  this.satMaterial = undefined;

  this.darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  this.lightMaterial = new THREE.MeshLambertMaterial({ color: 0x1e9cff });

  this.sg = new SelectiveGlow(this.scene, this.camera, View.renderer);
  console.log(this.sg);

  // Load Models
  loadStars(this);
  loadSatellite(this);
  this.ol = new Outline(this.scene, this.camera, View.renderer);
}

function generateStarfield(view) {
  let index = 0;
  const dummy = new THREE.Object3D();
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const count = 2000;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  view.scene.add(mesh);

  for (var z = -1000; z < 1000; z += 1) {
    // This time we give the sphere random x and y positions between -500 and 500
    let x = Math.random() * 1000 - 500;
    let y = Math.random() * 1000 - 500;

    // Then set the z position to where it is in the loop (distance of camera)
    // sphere.position.z = z;

    // scale it up a bit
    // sphere.scale.x = sphere.scale.y = 2;

    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);

    index++;
  }

  //  let starClone;
  //  // The loop will move from z position of -1000 to z position 1000, adding a random particle at each position.
  //  for (var z = -1000; z < 1000; z += 1) {
  //    var geometry = new THREE.SphereGeometry(0.5, 32, 32);
  //    var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  //    var sphere = new THREE.Mesh(geometry, material);

  //    // This time we give the sphere random x and y positions between -500 and 500
  //    sphere.position.x = Math.random() * 1000 - 500;
  //    sphere.position.y = Math.random() * 1000 - 500;

  //    // Then set the z position to where it is in the loop (distance of camera)
  //    sphere.position.z = z;

  //    // scale it up a bit
  //    sphere.scale.x = sphere.scale.y = 2;

  //    //add the sphere to the scene
  //    if (view.starModel) {
  //      starClone = clone(view.starModel);
  //      starClone.position.set(
  //        sphere.position.x,
  //        sphere.position.y,
  //        sphere.position.z
  //      );
  //      if ((z > 500) | (z < -500)) {
  //        if (Math.random() > 0.85) view.scene.add(starClone);
  //        else view.scene.add(sphere);
  //      } else view.scene.add(sphere);
  //    }
  //  }
}

// function generateStarfield2(view) {
//   let starClone;
//   // The loop will move from z position of -1000 to z position 1000, adding a random particle at each position.
//   for (var z = -1000; z < 1000; z += 1) {
//     var geometry = new THREE.SphereGeometry(0.5, 32, 32);
//     var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
//     var sphere = new THREE.Mesh(geometry, material);

//     // This time we give the sphere random x and y positions between -500 and 500
//     sphere.position.x = Math.random() * 1000 - 500;
//     sphere.position.y = Math.random() * 1000 - 500;

//     // Then set the z position to where it is in the loop (distance of camera)
//     sphere.position.z = z;

//     // scale it up a bit
//     sphere.scale.x = sphere.scale.y = 2;

//     //add the sphere to the scene
//     if (view.starModel) {
//       starClone = clone(view.starModel);
//       starClone.position.set(
//         sphere.position.x,
//         sphere.position.y,
//         sphere.position.z
//       );
//       if ((z > 500) | (z < -500)) {
//         if (Math.random() > 0.85) view.scene.add(starClone);
//         else view.scene.add(sphere);
//       } else view.scene.add(sphere);
//     }
//   }
// }

function loadStars(view) {
  view.loader.load(
    "/src/assets/Models/star.glb",
    (gltf) => {
      view.starModel = gltf.scene;
      // view.starModel.children[0].material.emissiveIntensity = -100;
      generateStarfield(view);
    },

    (xhr) => {
      //   console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      // if ((xhr.loaded / xhr.total) * 100 == 100) {
      //   // view.LOADED = true;
      // }
    },
    (error) => {
      console.log(error);
    }
  );
}

function loadSatellite(view) {
  view.loader.load(
    "/src/assets/Models/satellite.glb",
    (gltf) => {
      view.satModel = gltf.scene;
      // View.renderer.outputEncoding = THREE.sRGBEncoding;
      // View.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      view.satModel.traverse((i) => {
        if (i.isMesh) {
          i.toneMapped = false;
          // i.emissive = "red";
          i.emissiveIntensity = 0;
          view.satMesh = i;
          view.satMaterial = i.material;
        }
      });
      view.mixer = new THREE.AnimationMixer(view.satModel);
      view.action = view.mixer.clipAction(gltf.animations[0]);
      view.action.clampWhenFinished = true;
      view.action.loop = THREE.LoopOnce;
      view.action.play();

      view.pivot.add(view.satModel);
      view.pivot.userData.terminate = true;
      view.scene.add(view.pivot);

      // view.satModel.position.set(-3.5, 0, 0);

      view.satModel.name = "satModel";
      view.satModel.position.set(-1.5, 0, 0);
      view.satModel.rotation.y += view.radian(65);
      view.satModel.userData.scaleFactor = 3;
      let location = view.satModel.position.clone();
      view.satModel.userData.location_original = location;
      console.log(view.scene);
      view.camera.position.set(0, 1, 5); // this sets the boom's length
      view.clock = new THREE.Clock();
      console.log("STATUS: SAT ADDED TO SCENE OBJECT");
      // View.renderer.compile(view.scene, view.camera);
      // view.renderToCanvas();
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
        console.log("STATUS: SAT LOADED 100%");
        View.scenesLoaded++;
        view.LOADED = true;
      }
    },
    (error) => {
      console.log(error);
    }
  );
}

function intersect(view, pointer) {
  if (View.currentView.name !== view.name) return;
  // if (!view.mouseDown) view.intersectObject = null;
  // update the picking ray with the camera and pointer position

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
        // if (intersects[0].object.isInstancedMesh === false) {
        let selected = view.getRootGroup(intersects[0].object);
        if (selected.isInstancedMesh) view.zoomObject === null;
        else {
          view.ol.outlinePass.selectedObjects = [selected];
          view.zoomObject = selected;
        }

        // }
      }
      // console.log(view.zoomObject);
    } else if (
      view.intersectObject !== intersects[0].object &&
      intersects[0].object.userData.clickable
    ) {
      console.log(`FOUND: ${intersects[0].object.name}`);
      document.body.style.cursor = "pointer";
      if (view.mouseDown) {
        view.intersectObject = intersects[0].object;
      }
    } else {
      view.ol.outlinePass.selectedObjects = [];
    }

    // if (intersects[0].object.userData.clickable)
    //   document.body.style.cursor = "pointer";
  } else {
    if (view.selectionMode) {
      view.ol.outlinePass.selectedObjects = [];
      view.zoomObject = null;
    }
  }
  // if (view.selectionMode && view.ol.outlinePass.selectedObjects !== []) {
  //   document.body.style.cursor = "zoom-in";
  //   view.ol.outlinePass.selectedObjects
  // }
  // view.ol.outlinePass.selectedObjects = [];
  if (view.selectionMode) view.updateCursor("zoom-in");

  //else document.body.style.cursor = "default";
}

function render(visible) {
  if (this.LOADED && this.satModel) {
    if (this.clock != null) {
      if (!this.initFrameRendered) this.initFrameRendered = true;
      this.startAnimation(true);
      if (this.satModel) {
        this.floatModel(
          this.satModel,
          this.clock.getElapsedTime(),
          0.1,
          0.0001
        );
        // if (this.satModel) this.satModel.position.x = -3.5;
        if (this.satModel) this.satModel.position.x = -1.5;
        // if (this.satModel) this.satModel.rotation.y += 0.01;
        this.scene.rotation.y += 0.001;
        this.pivot.rotation.y -= 0.001;
      }

      intersect(this, this.pointer);
      if (this.selectionMode) this.ol.composer.render();
      else {
        if (this.satModel) this.satMesh.material = this.darkMaterial;
        this.sg.bloom1.render();
        if (this.satModel) this.satMesh.material = this.satMaterial;
        this.sg.final.render();
      }

      if (this.mouseDown && this.zoomObject && this.selectionMode) {
        console.log("MOUSE DOWN");
        View.zoomView.outline(this);
      }
    }
  }
}

export { setup, render };
