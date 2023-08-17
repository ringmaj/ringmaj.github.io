import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { View } from "./View.js";
import { TWEEN } from "https://unpkg.com/three@0.139.0/examples/jsm/libs/tween.module.min.js";
import { Outline } from "./Outline.js";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  // Satellite Model GLTF
  this.macbook;
  // State data
  this.LOADED = false;
  this.directionalLight;
  this.camera.position.set(0, 0, 80);

  // Models
  this.basketballModel;

  // this.scene.add(new THREE.AxesHelper(10));
  this.LOADED = true;
  this.clock = new THREE.Clock();
  // this.controls = new OrbitControls(this.camera, View.renderer.domElement);

  //Get your video element:
  this.video;
  this.PLAYING = false;
  // this.initVideo = false;
  // this.video = document.getElementById("video");
  // this.video.onloadeddata = function () {
  //   this.video.play();
  // };

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

  loadMacBook(this);
  initLighting(this);
  console.log(this.video);

  // this.ground = new THREE.Mesh(
  //   new THREE.PlaneGeometry(1200, 3000),
  //   new THREE.ShadowMaterial({
  //     opacity: 1,
  //     color: 0xbdbdbd,
  //   })
  // new THREE.ShadowMaterial({
  //   opacity: 1,
  //   color: 0xbdbdbd,
  // })
  // );
  // this.ground.receiveShadow = true;
  // this.ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.radian(2));
  // this.ground.position.y += 0.5;

  // this.scene.add(this.ground);

  this.cameraPivot = new THREE.Object3D();
  let width = window.innerWidth;
  let height = window.innerHeight;
  if (View.MOBILE) height = width;

  this.camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    0.01,
    1000
  );
  // this.camera = new THREE.OrthographicCamera(
  //   window.innerWidth / -2,
  //   window.innerWidth / 2,
  //   window.innerHeight / 2,
  //   window.innerHeight / -2,
  //   0.1,
  //   1000
  // );
  this.camera.zoom = 5;
  this.camera.updateProjectionMatrix();
  this.camera.position.y += 60;
  // this.camera.position.x += 200;
  this.cameraPivot.add(this.camera);
  // this.camera.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.radian(50));
  this.camera.updateProjectionMatrix();

  // this.controls = new OrbitControls(this.camera, View.renderer.domElement);
  // this.controls.update();
  // this.camera.updateProjectionMatrix();
  this.ol = new Outline(this.scene, this.camera, View.renderer);
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

  view.directionalLight.castShadow = true;
  // view.directionalLight.position.set(10, 5, 0);
  view.directionalLight.position.set(50, 200, -600);
  view.directionalLight.shadow.camera.far = 1000;
  setShadowSize(view.directionalLight, 150, 1000);

  const helper = new THREE.DirectionalLightHelper(
    view.directionalLight,
    6,
    0xfff700
  );
  view.scene.add(view.directionalLight);
  // view.scene.add(new THREE.CameraHelper(view.directionalLight.shadow.camera));

  // view.scene.add(new THREE.CameraHelper(view.directionalLight.shadow.camera));
  // view.scene.add(helper);
  // sceneDebug(scene, helper);

  // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  // scene.add(dirLightLeft, dirLightRight, ambientLight);
}

function loadMacBook(view) {
  view.loader.load(
    "src/assets/Models/macbook.glb",
    (gltf) => {
      view.macbook = gltf.scene;
      view.macbook.traverse((i) => {
        let location;
        if (i.isGroup) {
          if (i.name.includes("key")) i.userData.isKey = true;
        } else if (i.isMesh) {
          i.castShadow = true;
          i.receiveShadow = true;

          if (i.name === "floor") {
            // console.log("found floor");
            // console.log(i);
            i.material = new THREE.ShadowMaterial({
              opacity: 1,
              color: 0xbdbdbd,
              // side: 1,
            });
          } else if (i.name == "camera_base") {
            location = i.position.clone();
            i.userData.location_original = location;
            i.userData.scaleFactor = 0.09;
          } else if (i.name == "video_1") {
            // console.log(i);
            //Get your video element:
            view.video = document.getElementById("video");
            view.video.onloadeddata = function () {
              console.log("VIDEO LOADED");
              view.video.play();
            };

            //Create your video texture:
            const videoTexture = new THREE.VideoTexture(view.video);
            videoTexture.rotation = view.radian(90);
            videoTexture.center = new THREE.Vector2(0.5, 0.5);
            videoTexture.wrapS = THREE.RepeatWrapping;
            videoTexture.repeat.x = -1;
            videoTexture.needsUpdate = true;
            const videoMaterial = new THREE.MeshBasicMaterial({
              map: videoTexture,
              side: THREE.FrontSide,
              toneMapped: false,
            });
            videoMaterial.needsUpdate = true;
            i.material = videoMaterial;
            i.material.needsUpdate = true;
          }
          // if (i.name == "basketball") {
          //   view.basketballModel = i;
          //   view.basketballModel.position.y += 500;
          //   view.ballDestination = new THREE.Vector3(
          //     view.basketballModel.position.x,
          //     100,
          //     view.basketballModel.position.z
          //   );
          // }
        }
      });
      // console.log(view.scene);
      view.macbook.scale.set(0.3, 0.3, 0.3);
      // view.macbook.add(view.ground);
      // view.ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(-90));
      // view.ground.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(-1.5));
      // view.ground.add(new THREE.AxesHelper(500));
      // view.ground.position.y += 4;
      view.macbook.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(-135));
      // view.camera.rotation.y += view.radian(20);
      // view.macbook.add(new THREE.AxesHelper(500));
      view.camera.updateProjectionMatrix();
      view.macbook.rotateOnAxis(new THREE.Vector3(0, 1, 1), view.radian(-10));
      view.macbook.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(-5));
      view.macbook.rotateOnAxis(new THREE.Vector3(1, 0, 1), view.radian(-5));
      view.directionalLight.target = view.macbook;
      view.macbook.position.z -= 500;
      view.macbook.position.x += 30;
      view.macbook.position.y -= 10;

      // init userData
      view.macbook.traverse((i) => {
        let location;
        if (i.name == "camera_base") {
          location = i.position.clone();
          i.userData.location_original = location;
          i.userData.scaleFactor = 0.09;
        } else if (i.name == "macbook_base") {
          location = i.position.clone();
          i.userData.location_original = location;
          i.userData.scaleFactor = 0.03;
        } else if (i.name == "hoop_base") {
          location = i.position.clone();
          i.userData.location_original = location;
          i.userData.scaleFactor = 0.07;
        }
      });

      view.macbook.name = "macbook_glb";
      view.macbook.userData.terminate = true;

      // view.macbook.rotateOnAxis(new THREE.Vector3(0, 0, 1), view.radian(-2));
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
      view.scene.add(view.macbook);
      // view.posDelta = -1.5;
      console.log("STATUS: LAPTOP ADDED TO SCENE OBJECT");
      View.renderer.compile(view.scene, view.camera);
      view.renderToCanvas();
      self.postMessage({
        type: "updateLoadPercentage",
      });
    },
    (xhr) => {
      View.loadStatuses[view.modelLoadIndex] = (xhr.loaded / xhr.total) * 100;
      if ((xhr.loaded / xhr.total) * 100 == 100) {
        console.log("STATUS: LAPTOP LOADED 100%");
        View.scenesLoaded++;
        view.LOADED = true;
        view.clock = new THREE.Clock();
        console.log("LOADED Macbook");
      }
    },
    (error) => {
      console.log(error);
    }
  );
}

function processKey(view) {
  let button = view.currentButton;
  if (button.name === "keyspace") {
    console.log("SPACE PRESSED");
    if (view.PLAYING === true) view.video.pause();
    else view.video.play();

    view.PLAYING = !view.PLAYING;
  }
}

function moveButton(view, button, distance, bound) {
  if (view.currentButton === null) return;

  if (view.mouseDown) {
    if (button.position.y > bound) {
      if (button.position.y - distance < bound) {
        button.position.y = bound;
      } else {
        button.position.y -= distance;
      }
    }
  } else {
    if (button.position.y < view.buttonMaxBound) {
      if (button.position.y + distance > view.buttonMaxBound) {
        button.position.y = view.buttonMaxBound;
        processKey(view);
        view.currentButton = null;
      } else {
        button.position.y += distance;
      }
    }
  }
}

function intersect(view) {
  // console.log("here");
  // if (View.currentView.name !== view.name) return;
  // update the picking ray with the camera and pointer position

  if (!view.mouseDown) view.intersectObject = null;
  view.raycaster.setFromCamera(view.pointer, view.camera);
  var intersects = view.raycaster.intersectObjects(view.scene.children);

  if (intersects.length > 0) {
    // pointer logic
    if (intersects[0].object.parent.userData.isKey) {
      document.body.style.cursor = "pointer";
      // console.log(intersects[0].object.parent.position.y);
      // console.log(intersects[0].object.parent.name);
    } else document.body.style.cursor = "default";

    // selection logic
    if (
      view.selectionMode &&
      view.ol.outlinePass.selectedObjects !== [intersects[0].object] &&
      intersects[0].object.name !== "floor"
    ) {
      // view.ol.outlinePass.selectedObjects = [intersects[0].object];
      if (view.ONLY_SCENE_ZOOM) {
        view.ol.outlinePass.selectedObjects = [view.scene];
        view.zoomObject = view.scene;
      } else {
        let selected = view.getRootGroup(intersects[0].object);
        view.ol.outlinePass.selectedObjects = [selected];
        view.zoomObject = selected;
      }
      console.log(view.zoomObject);
    } else if (
      view.currentButton === null &&
      intersects[0].object.parent.userData.isKey &&
      view.mouseDown
    ) {
      console.log(`FOUND: ${intersects[0].object.parent.name}`);
      view.currentButton = intersects[0].object.parent;
      // view.currentButton.position.y += 1;
      console.log(view.currentButton.position.y);
      // view.currentButton.add(new THREE.AxesHelper(500));
      view.buttonMaxBound = view.currentButton.position.y;
    }
  } else {
    if (view.selectionMode) {
      view.ol.outlinePass.selectedObjects = [];
      view.zoomObject = null;
    }
  }
  if (view.selectionMode) document.body.style.cursor = "zoom-in";
}

function render() {
  // var isVisible = View.checkVisible(this.canvas);

  // if (this.initFrameRendered && !isVisible) return [false, false];

  if (this.LOADED && this.macbook) {
    // View.renderer.render(this.scene, this.camera);
    // console.log("RENDERIING JET");

    intersect(this);
    moveButton(this, this.currentButton, 2.2, 2.2);
    // moveButton(this, this.currentButton, 0.03, 0.31);
    // View.renderer.render(this.scene, this.camera);
    if (this.selectionMode) this.ol.composer.render();
    else View.renderer.render(this.scene, this.camera);

    if (this.mouseDown && this.zoomObject && this.selectionMode) {
      console.log("MOUSE DOWN");
      View.zoomView.outline(this);
    }
    if (!this.initFrameRendered) {
      this.initFrameRendered = true;
      // this.video.play();
    }
    // this.startAnimation(isVisible);

    // if (this.basketballModel) {
    //   // let pos = this.basketballModel.position.clone();
    //   // this.basketballModel.position.set(0, 0, 0);
    //   this.basketballModel.rotateOnAxis(
    //     new THREE.Vector3(0, 0, 1),
    //     this.radian(5)
    //   );
    //   // this.basketballModel.position.copy(pos);
    // }
    // if (this.basketballModel) {
    //   // this.basketballModel.position.lerp(this.ballDestination, 0.1);
    //   if (this.animationRunning == false) {
    //     new TWEEN.Tween(this.basketballModel.position)
    //       .to(
    //         {
    //           x: this.ballDestination.x,
    //           y: this.ballDestination.y,
    //           z: this.ballDestination.z,
    //         },
    //         4000
    //       )
    //       .easing(TWEEN.Easing.Bounce.Out)
    //       .yoyo(true)
    //       .repeat(Infinity)
    //       .start();
    //     this.animationRunning = true;
    //   }
    //   TWEEN.update();
    // }

    // if (this.jetModel)
    //   this.floatModel(
    //     this.jetModel,
    //     this.clock.getElapsedTime(),
    //     0.1,
    //     0.0001
    //   );
  }

  // let renderCheck = true;
  // let canvasCheck = this.renderToCanvas();
  // return [renderCheck, canvasCheck];
}

export { setup, render };
