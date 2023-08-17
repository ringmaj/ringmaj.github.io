// import * as THREE from "three";
import * as THREE from "three";
import { View } from "./View.js";
import { TWEEN } from "https://unpkg.com/three@0.139.0/examples/jsm/libs/tween.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SelectiveGlow } from "./SelectiveGlow.js";
import { Outline } from "./Outline.js";

// function createPage(infoID, titleID) {
//   return {
//     titleElem: document.getElementById(titleID),
//     infoElem: document.getElementById(infoID),
//     previous: null,
//     next: null,
//   };
// }
// function updatePage(page, prev, next) {
//   page.previous = prev;
//   page.next = next;
// }

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  this.carouselModel;
  this.LOADED;
  this.directionalLight;
  this.ground;

  this.initialized = false;

  this.handleClick = handleClick;

  // Mesh objects
  this.ultrawide;
  this.laptop_top;
  this.chair;
  this.upper_drawer;
  this.lower_drawer;
  this.window;
  this.plant;

  this.mainPivot = new THREE.Object3D();
  this.pivotDict = {};
  this.positionDict = {};
  this.objs_list = [];
  this.obj_names = [
    "display_module",
    "camera_module",
    "lidar_module",
    "esp32_module",
  ];
  this.rotation_delta = 0;

  // Animation data
  this.screen_on = true;
  this.screen_on_material;
  this.lid_rotation = 110;
  this.window_rotation = 110;
  this.drawer_delta = 0.3;

  this.intersectObject = null;
  let scene = this.scene;

  this.controls;

  this.ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.ShadowMaterial({
      opacity: 1,
      color: 0xbdbdbd,
    })
  );
  this.ground.receiveShadow = true;
  this.ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.radian(-90));
  this.ground.position.y += 2;

  loadCarousel(this);
  initLighting(this);

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
  this.camera.zoom = 20;
  this.camera.updateProjectionMatrix();
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
  view.directionalLight.position.set(20, 20, 30);
  view.scene.add(view.directionalLight);
  // view.directionalLight.castShadow = true;
  // view.directionalLight.position.set(30, 100, 100);
  // view.directionalLight.shadow.camera.far = 400;
  // setShadowSize(view.directionalLight, 30, 1000);

  const helper = new THREE.DirectionalLightHelper(
    view.directionalLight,
    6,
    0x0000ff
  );
}

function loadCarousel(view) {
  view.loader.load(
    "/src/assets/Models/carItems.glb",
    (gltf) => {
      view.carouselModel = gltf.scene;

      view.camera.position.set(0, 1, 50);
      view.carouselModel.scale.set(6, 6, 6);
      view.scene.position.x += 10.5;
      view.scene.position.y += 7.5;
      view.scene.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(6));
      view.scene.add(view.carouselModel);
      view.mainPivot.name = "mainPivot";
      view.scene.add(view.mainPivot);
      view.clock = new THREE.Clock();
      console.log("STATUS: CAROUSEL ADDED TO SCENE OBJECT");
      console.log(view.scene);
      console.log(view.pivotDict);
      view.ol.composer.render();
      View.renderer.render(view.scene, view.camera);
      self.postMessage({
        type: "updateLoadPercentage",
      });
      // View.renderer.compile(view.scene, view.camera);
      // view.renderToCanvas();
    },

    (xhr) => {
      View.loadStatuses[view.modelLoadIndex] = (xhr.loaded / xhr.total) * 100;
      if ((xhr.loaded / xhr.total) * 100 == 100) {
        console.log("STATUS: CAROUSEL LOADED 100%");
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
  view.raycaster.setFromCamera(pointer, view.camera);
  // var intersects = view.raycaster.intersectObjects(view.objs_list, false);
  var intersects = view.raycaster.intersectObjects(view.scene.children);

  // if (View.mouseDown) console.log("MOUSE DOWN");
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
        let selected = view.getRootGroup(intersects[0].object);
        view.ol.outlinePass.selectedObjects = [selected];
        view.zoomObject = selected;
        // console.log(view.zoomObject.name);
      }
      // console.log(view.zoomObject);
    } else {
      if (
        intersects[0].object.userData.clickable &&
        view.intersectObject === null
      )
        view.updateCursor("pointer");

      // selection logic
      if (
        view.intersectObject === null &&
        intersects[0].object.userData.clickable &&
        view.mouseDown
      ) {
        view.intersectObject = intersects[0].object;
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

function changePage(direction, view) {
  // console.log(view.current_page);
  view.current_page.titleElem.style.display = "none";
  view.current_page.infoElem.style.display = "none";
  view.current_page = view.current_page[direction];
  view.current_page.titleElem.style.display = "block";
  view.current_page.infoElem.style.display = "block";

  // console.log(view.current_page);
}

// function handleClick(direction, view) {
//   let rot = 90;
//   let object = view.mainPivot;
//   if (direction === "next") rot = -90;

//   const rotate = new TWEEN.Tween(object.rotation)
//     .to(
//       {
//         y: object.rotation.y + view.radian(rot),
//       },
//       300
//     )
//     .easing(TWEEN.Easing.Quadratic.Out)
//     .onComplete(() => {
//       // console.log(`ROTATED: ${rot}`);
//       // view.lid_rotation *= -1;
//       // view.intersectObject = null;
//     });
//   rotate.start();
// }

function handleClick(direction) {
  let rot = 90;
  let object = this.mainPivot;
  if (direction === "next") rot = -90;

  const rotate = new TWEEN.Tween(object.rotation)
    .to(
      {
        y: object.rotation.y + this.radian(rot),
      },
      300
    )
    .easing(TWEEN.Easing.Quadratic.Out)
    .onComplete(() => {
      self.postMessage({
        type: "carouselAnimation",
      });
      // console.log(`ROTATED: ${rot}`);
      // view.lid_rotation *= -1;
      // view.intersectObject = null;
    });
  rotate.start();
}

function init(view) {
  view.carouselModel.userData.terminate = true;
  view.carouselModel.traverse((i) => {
    if (i.isMesh) {
      i.castShadow = true;
      i.receiveShadow = true;
    }

    if (view.obj_names.includes(i.name)) {
      console.log(i);
      if (i.name === "display_module") {
        i.userData.position_delta = 0.1;
        i.userData.rotation_delta = 0;
        i.userData.time_delta = 1;
      } else if (i.name === "camera_module") {
        i.userData.position_delta = 0.1;
        i.userData.rotation_delta = 0.002;
        i.userData.time_delta = 2;
      } else if (i.name === "lidar_module") {
        i.userData.position_delta = 0.1;
        i.userData.rotation_delta = 0.001;
        i.userData.time_delta = 3;
      } else if (i.name === "esp32_module") {
        i.userData.position_delta = 0.1;
        i.userData.rotation_delta = 0.001;
        i.userData.time_delta = 4;
      }

      // view.satModel.userData.scaleFactor = 3;
      let location = i.position.clone();
      i.userData.location_original = location;
      console.log(view.scene);

      let pivot = new THREE.Object3D();
      console.log(i);
      pivot.name = `pivot_${i.name}`;
      console.log(`found: ${i.name}`);
      view.objs_list.push(i);
      i.add(pivot);
      view.mainPivot.attach(pivot);
      view.pivotDict[i.name] = pivot;
    }
  });

  view.objs_list.forEach((obj) => {
    view.scene.attach(obj);
    // obj.add(new THREE.AxesHelper(15));
  });

  view.initialized = true;

  // let leftBtn = document.getElementById("carouselLeft");
  // let rightBtn = document.getElementById("carouselRight");
  // leftBtn.onclick = function () {
  //   handleClick("previous", view);
  // };
  // rightBtn.onclick = function () {
  //   handleClick("next", view);
  // };
}

function rotateCarousel(view) {
  if (view.carouselModel) {
    let time_offset = 0;
    view.objs_list.forEach((obj) => {
      let pivot = view.pivotDict[obj.name];
      let pos = new THREE.Vector3();
      pivot.localToWorld(pos);
      pos.x *= 0.4;
      view.floatModel(
        obj,
        view.clock.getElapsedTime() + obj.userData.time_delta,
        obj.userData.position_delta,
        obj.userData.rotation_delta
      );
      obj.position.copy(pos);
      time_offset += 1;
    });
  }
}
function render() {
  // var isVisible = View.checkVisible(this.canvas);
  // if (this.initFrameRendered && !isVisible) return [false, false];

  if (this.LOADED && this.carouselModel) {
    if (this.initialized === false) init(this);
    rotateCarousel(this);

    // if (this.carouselModel) {
    //   let time_offset = 0;
    //   this.objs_list.forEach((obj) => {
    //     let pivot = this.pivotDict[obj.name];
    //     let pos = new THREE.Vector3();
    //     pivot.localToWorld(pos);
    //     pos.x *= 0.4;
    //     this.floatModel(
    //       obj,
    //       this.clock.getElapsedTime() + obj.userData.time_delta,
    //       obj.userData.position_delta,
    //       obj.userData.rotation_delta
    //     );
    //     obj.position.copy(pos);
    //     time_offset += 1;
    //   });
    // }

    TWEEN.update();
    intersect(this, this.pointer);
    if (this.selectionMode) this.ol.composer.render();
    else View.renderer.render(this.scene, this.camera);
    if (this.mouseDown && this.zoomObject && this.selectionMode) {
      console.log("MOUSE DOWN");
      View.zoomView.outline(this);
    }
  }
}
export { setup, render };
