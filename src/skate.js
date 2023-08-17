// import * as THREE from "three";
import * as THREE from "three";
import { View } from "./View.js";
import { TWEEN } from "https://unpkg.com/three@0.139.0/examples/jsm/libs/tween.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SelectiveGlow } from "./SelectiveGlow.js";
import { Outline } from "./Outline.js";
import { Graph } from "./Graph.js";
import { DragControls } from "three/addons/controls/DragControls.js";
import { Vector3 } from "three";

if (View.MUTE_LOGS) console.log = function () {};

function setup() {
  this.board;
  this.control_arr = [];
  this.LOADED;
  this.directionalLight;
  this.ground;
  this.controls;
  this.rotationSaved;
  this.rotations = new Vector3();

  this.initialized = false;

  this.intersectObject = null;
  let scene = this.scene;

  //   this.ground = new THREE.Mesh(
  //     new THREE.PlaneGeometry(300, 300),
  //     new THREE.ShadowMaterial({
  //       opacity: 1,
  //       color: 0xbdbdbd,
  //     })
  //   );
  //   this.ground.receiveShadow = true;
  //   this.ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.radian(-90));
  //   this.ground.position.y += 2;

  //   this.scene.add(this.ground);
  // console.log(this.scene);
  // View.renderer.render(this.scene, this.camera);

  //   loadCarousel(this);
  //   initLighting(this);
  // this.scene.add(new THREE.AxesHelper(10));

  //   this.initLighting();

  // this.sg = new SelectiveGlow(this.scene, this.camera, View.renderer);

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
  this.camera.position.x = 0;
  this.camera.position.y = 0;
  this.camera.position.z = 50;
  this.camera.updateProjectionMatrix();
  this.ol = new Outline(this.scene, this.camera, View.renderer);
  //   this.scene.background = new THREE.Color(0x0062ff);

  const curve = new THREE.SplineCurve([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0, 10),
    // new THREE.Vector2(-10, 0),
    // new THREE.Vector2(-5, 5),
    // new THREE.Vector2(0, 0),
    // new THREE.Vector2(5, -5),
    // new THREE.Vector2(10, 0),
  ]);

  //   let points = curve.getPoints(50);
  //   let geometry = new THREE.BufferGeometry().setFromPoints(points);

  //   const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

  //   // Create the final object to add to the scene
  //   const splineObject = new THREE.Line(geometry, material);
  //   curve.points[1] = new THREE.Vector2(5, 10);
  //   points = curve.getPoints(50);
  //   geometry = new THREE.BufferGeometry().setFromPoints(points);
  //   splineObject.geometry = geometry;
  //   console.log(splineObject);
  //   //   splineObject.points[1] = new THREE.Vector2(5, 10);
  //   console.log(curve);
  //   console.log(splineObject);
  //   this.scene.add(splineObject);

  console.log(this.scene);
  this.vertGraph = new Graph(
    "vert_graph",
    View.renderer,
    this.scene,
    this.camera,
    28.75,
    13.25
  );
  this.yGraph = new Graph(
    "y_axis_graph",
    View.renderer,
    this.scene,
    this.camera,
    28.75,
    -7.15,
    "y"
  );

  this.xGraph = new Graph(
    "x_axis_graph",
    View.renderer,
    this.scene,
    this.camera,
    28.75,
    3.05,
    "x"
  );
  this.zGraph = new Graph(
    "z_axis_graph",
    View.renderer,
    this.scene,
    this.camera,
    28.75,
    -17.35,
    "z"
  );

  initDragControls(this);
  console.log(this.controls.getObjects()[0].userData.splineObj.v0);
  initLighting(this);
  loadBoard(this);
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

  view.directionalLight.castShadow = true;
  view.directionalLight.position.set(500, 200, -500);
  view.directionalLight.shadow.camera.far = 1000;
  setShadowSize(view.directionalLight, 150, 2000);

  const helper = new THREE.DirectionalLightHelper(
    view.directionalLight,
    6,
    0xfff700
  );
  view.scene.add(view.directionalLight);
}

function loadBoard(view) {
  view.loader.load(
    "/src/assets/Models/board.glb",
    (gltf) => {
      view.model = gltf.scene;
      view.model.traverse((i) => {
        if (i.isMesh) {
          i.castShadow = true;
          i.receiveShadow = true;

          if (i.name === "floor") {
            i.material = new THREE.ShadowMaterial({
              opacity: 1,
              color: 0xbdbdbd,
              // side: 1,
            });
            view.floor = i;
          } else if (i.name === "board") view.board = i;
        }
      });

      //   view.board.position.y += 1;
      view.directionalLight.target = view.board;
      let pos = view.board.position.clone();
      view.directionalLight.position.copy(pos);
      view.directionalLight.position.y = 200;
      view.directionalLight.position.x -= 30;
      view.directionalLight.position.z -= 400;
      let distance = view.board.position.y - view.floor.position.y;
      view.board.position.y = 0;
      view.floor.position.y = 0 - distance + 0.01;
      console.log(`distance is: ${distance}`);
      //   view.board.position.y = 0;
      view.rotationSaved = view.board.rotation.clone();
      view.scene.add(view.model);
      //   view.scene.add(new THREE.AxesHelper(50));

      //   view.camera.position.set(0, 0, 50);
      view.model.scale.set(10, 10, 10);
      view.model.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(10));
      view.model.rotateOnAxis(new THREE.Vector3(0, 1, 0), view.radian(-20));
      view.model.position.x -= 15;
      view.model.position.y -= 10;
      //   view.scene.position.x += 10.5;
      //   view.scene.position.y += 7.5;
      //   view.scene.rotateOnAxis(new THREE.Vector3(1, 0, 0), view.radian(6));
      //   view.scene.add(view.carouselModel);
      //   view.mainPivot.name = "mainPivot";
      //   view.scene.add(view.mainPivot);
      //   view.clock = new THREE.Clock();
      //   console.log("STATUS: CAROUSEL ADDED TO SCENE OBJECT");
      //   console.log(view.scene);
      //   console.log(view.pivotDict);
      // View.renderer.compile(view.scene, view.camera);
      // view.renderToCanvas();
      View.renderer.render(view.scene, view.camera);
      self.postMessage({
        type: "updateLoadPercentage",
      });
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

function intersect(view, pointer) {
  if (view.mouseDrag) return;
  view.raycaster.setFromCamera(pointer, view.camera);
  // var intersects = view.raycaster.intersectObjects(view.objs_list, false);
  var intersects = view.raycaster.intersectObjects(Graph.control_points_arr);

  if (intersects.length > 0) {
    if (intersects[0].object.userData.isControlPoint)
      view.updateCursor("pointer");
    else view.updateCursor("default");
  } else {
    view.updateCursor("default");
  }
  // if (view.selectionMode) document.body.style.cursor = "zoom-in";
}

function initDragControls(view) {
  // Setup Drag Control
  //   controls_arr.push(view.vertGraph.control_point_1);
  console.log("INIT DRAG CONTROLS");
  console.log(Graph.control_points_arr.length);
  console.log(View.inputElement);

  view.controls = new DragControls(
    Graph.control_points_arr,
    view.camera,
    View.inputElement
  );
  view.controls.activate();
  view.controls.transformRoot = false;

  // view.controls.enabled = true;

  view.controls.addEventListener("dragstart", function (event) {
    view.mouseDrag = true;
    console.log(`DRAGGING ITEM USING DRAG CONTROLS: ${event.object.name}`);
    view.updateCursor("grabbing");
    // console.log(event.object);
    // event.object.parent.userData.grabbing = true;
  });
  view.controls.addEventListener("drag", function (event) {
    let obj = event.object;
    if (obj.userData.isControlPoint) {
      let index = obj.userData.controlIndex;
      let xPos = obj.position.x;
      let yPos = obj.position.y;
      if (obj.position.y < obj.userData.lowerBound) {
        yPos = obj.userData.lowerBound;
        obj.position.y = yPos;
      } else if (obj.position.y > obj.userData.upperBound) {
        yPos = obj.userData.upperBound;
        obj.position.y = yPos;
      }

      if (obj.userData.previousControlPoint)
        obj.userData.leftBound = obj.userData.previousControlPoint.position.x;
      if (obj.position.x < obj.userData.leftBound) {
        xPos = obj.userData.leftBound;
        obj.position.x = xPos;
      }

      if (obj.userData.nextControlPoint)
        obj.userData.rightBound = obj.userData.nextControlPoint.position.x;
      if (obj.position.x > obj.userData.rightBound) {
        xPos = obj.userData.rightBound;
        obj.position.x = xPos;
      }

      obj.userData.splineObj[index].x = xPos;
      obj.userData.splineObj[index].y = yPos;
      obj.userData.Graph.updateGeometry();
      obj.userData.Graph.moveLabels(obj);

      //   console.log(xPos, obj.position.y);
    }
  });
  view.controls.addEventListener("dragend", function (event) {
    view.mouseDrag = false;
    console.log("STOP DRAGGING ITEM USING DRAG CONTROLS");
    view.updateCursor("default");
    // event.object.parent.userData.grabbing = false;
  });
}

function render() {
  if (this.board) {
    this.board.rotation.copy(this.rotationSaved);

    if (Graph.graphs_arr) {
      Graph.graphs_arr.forEach((graphObj) => {
        graphObj.play();

        if (graphObj.rotation && this.board)
          this.board.rotateOnAxis(
            graphObj.rotationVector,
            this.radian(graphObj.degrees)
          );
      });
    }
    this.board.position.y = Graph.vert_value;
    this.intersect(this, this.pointer);
    View.renderer.render(this.scene, this.camera);
  }
}
export { setup, render };
