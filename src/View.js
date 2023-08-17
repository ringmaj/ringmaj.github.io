import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js";
// import * as THREE from "https://unpkg.com/three@0.155.0/build/three.js";
// import { DRACOLoader } from "https://unpkg.com/three@0.155.0/examples/jsm/loaders/DRACOLoader.js";
// import { GLTFLoader } from "https://unpkg.com/three@0.155.0/examples/jsm/loaders/GLTFLoader.js";
// import { RGBELoader } from "https://unpkg.com/three@0.155.0/examples/jsm/loaders/RGBELoader.js";

class View {
  // static MUTE_LOGS = true;
  // Scene Data
  static vpWidth;
  static vpHeight;
  canvas;
  scene = null;
  camera;
  env;

  // State data
  delta;
  clock;
  playAnimation = false;

  // Loaders
  dLoader;
  loader;

  sectionContainer;
  canvasEntryID;
  sectionContainerID;
  canvasEntry;
  devicePixelRatio;
  static neutralEnv = null;

  zoomObject = null;
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  moveMouse = new THREE.Vector2();
  intersectObject;
  dragObject = null;
  selectionMode = false;
  zoomObject = null;
  ONLY_SCENE_ZOOM = false;

  static currentView;
  static previousView;
  static zoomView;
  static scrollDirection = "down";
  static cursor = "default";
  static rgbLoader;
  static MOBILE = false;
  static log = {};

  name;
  clicked = false;
  mouseDown = false;
  mouseDrag = false;
  delta = 6;
  startX;
  startY;
  initFrameRendered = false;
  static viewDict = {};
  entryID;
  context;
  renderer;
  static renderer = null;
  static inputElement = null;
  static renderSet = new Set();
  static canvasSet = new Set();
  static loadStatuses = [];
  static scenesLoaded = 0;
  static numScenes = 0;
  static testVal = null;
  modelLoadIndex;

  constructor(data, canvas, name, setup, render, env = "neutral.hdr") {
    this.canvas = canvas;
    if (env) this.env = env;
    this.name = name;
    this.setup = setup;
    this.render = render;
    this.devicePixelRatio = data.devicePixelRatio;
    this.canvasEntryID =
      this.name.substring(0, this.name.length - 5) + "CanvasEntry";
    this.sectionContainerID =
      this.name.substring(0, this.name.length - 5) + "SectionContainer";
    console.log(this.canvasEntryID);
    let viewName = this.name.substring(0, this.name.length - 5) + "View";
    View.viewDict[viewName] = this;
    if (this.name === "zoomScene") View.zoomView = this;
    if (View.testVal === null) {
      console.log(`TEST VAL INIT: ${name}`);
      View.testVal = true;
    }
    this.init();
    this.setup();
  }

  intersect(view, pointer) {
    return;
  }
  onZoomBtnClick(event) {
    this.disableScroll();
    document.body.style.cursor = "zoom-in";
    console.log(`${this.name} zoom button clicked`);
    this.selectionMode = true;
    View.previousView = this;
  }

  onZoomExitBtnClick() {
    View.inputElement.top = 52.4375;
    View.renderer.setPixelRatio(1);
    console.log(`zoom exit button clicked`);
    // View.zoomView.sectionContainer.setAttribute(
    //   "style",
    //   "display:none !important"
    // );
    let ID = View.zoomView.sectionContainerID;
    View.currentView.setAttribute(ID, "style", "display:none !important");
    View.zoomView.controls.enabled = false;
    View.currentView = View.previousView;
    // View.currentView.canvasEntry.appendChild(View.renderer.domElement);
    View.currentView.moveRenderer(View.currentView.canvasEntryID);
    if (View.currentView.ONLY_SCENE_ZOOM) {
      console.log(View.currentView.scene);
      console.log(View.zoomView.scene);
      for (let i = View.zoomView.scene.children.length - 1; i >= 0; i--) {
        let child = View.zoomView.scene.children[i];
        let newScale;
        if (child.type === "Group" && child.userData.location_original)
          child.position.copy(child.userData.location_original);
        if (child.userData.scaleFactor) {
          newScale = child.scale.divideScalar(child.userData.scaleFactor);
          child.scale.copy(newScale);
        }
        View.currentView.scene.add(child);
      }
    } else {
      let child = View.zoomView.model;
      let newScale;
      if (child.userData.location_original)
        child.position.copy(child.userData.location_original);
      if (child.userData.scaleFactor) {
        newScale = child.scale.divideScalar(child.userData.scaleFactor);
        child.scale.copy(newScale);
      }
      View.zoomView.model_parent.add(View.zoomView.model);
    }
    View.currentView.render();
    this.enableScroll();
  }

  onMouseDown(event) {
    this.startX = event.pageX;
    this.startY = event.pageY;
    this.mouseDown = true;
    this.mouseUp = false;
    var ProgressBarContainer = document.getElementById("ProgressBarContainer");
    ProgressBarContainer.style.top = "0";
  }

  onPointerDrag(event) {}

  onMouseUp(event) {
    const diffX = Math.abs(event.pageX - this.startX);
    const diffY = Math.abs(event.pageY - this.startY);

    if (diffX < this.delta && diffY < this.delta) {
      console.log("CLICKED");
    } else console.log("DRAGGED");

    this.mouseUp = true;
    this.mouseDown = false;
    this.mouseDrag = false;
    this.dragObject = null;
    document.body.style.cursor = "default";
  }

  onMouseClick(event) {
    this.clicked = true;
    let ID = this.name.substring(0, this.name.length - 5) + "SectionContainer";
    console.log(`MOUSE CLICKED: ${ID}`);
  }
  onPointerMove(event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    var rect = View.renderer.domElement.getBoundingClientRect();
    this.pointer.x =
      ((event.clientX - rect.left) / (rect.width - rect.left)) * 2 - 1;
    this.pointer.y =
      -((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
  }

  onMouseDrag(event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    var rect = View.renderer.domElement.getBoundingClientRect();
    this.moveMouse.x =
      ((event.clientX - rect.left) / (rect.width - rect.left)) * 2 - 1;
    this.moveMouse.y =
      -((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
  }

  static updateViewList() {
    let navList = document.getElementById("navList");
    let renderList = document.getElementById("renderList");
    if (renderList) renderList.remove();

    renderList = document.createElement("ul");
    renderList.style.listStyleType = "none";
    renderList.setAttribute("id", "renderList");
    renderList.setAttribute(
      "class",
      "d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start"
    );

    let renderListTitle = document.createElement("li");
    let text = document.createTextNode("Render");
    renderListTitle.appendChild(text);
    renderListTitle.style.marginRight = "0.5em";
    renderListTitle.style.fontWeight = "700";
    renderList.appendChild(renderListTitle);

    // Add rendered list
    View.renderSet.forEach((item) => {
      let listItem = document.createElement("li");
      listItem.style.marginRight = "0.5em";
      let text = document.createTextNode(item);
      listItem.appendChild(text);
      renderList.append(listItem);
    });

    let canvasListTitle = document.createElement("li");
    text = document.createTextNode("Canvas");
    canvasListTitle.appendChild(text);
    canvasListTitle.style.marginRight = "0.5em";
    canvasListTitle.style.marginLeft = "0.5em";
    canvasListTitle.style.fontWeight = "700";
    renderList.appendChild(canvasListTitle);

    // Add canvas list
    View.canvasSet.forEach((item) => {
      let listItem = document.createElement("li");
      listItem.style.marginRight = "0.5em";
      let text = document.createTextNode(item);
      listItem.appendChild(text);
      renderList.append(listItem);
    });

    let listItem = document.createElement("li");
    listItem.style.marginRight = "0.5em";
    text = document.createTextNode(
      "Device Ratio: " +
        window.devicePixelRatio +
        " | Ratio: " +
        View.renderer.getPixelRatio()
    );
    listItem.appendChild(text);
    renderList.append(listItem);

    navList.appendChild(renderList);
  }

  static checkVisible(elm) {
    var rect = elm.getBoundingClientRect();
    var navHeight = document.getElementById("nav").offsetHeight + 30;
    var viewHeight = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight
    );
    return !(rect.bottom < navHeight || rect.top - viewHeight >= 0);
  }

  startAnimation(visible) {
    if (visible && !this.playAnimation) {
      this.playAnimation = true;
      console.log(`STARTING ANIMATION: ${this.name}`);
      console.log(`Visible: ${visible}`);
      console.log(`playAnimation: ${this.playAnimation}`);
    }
    if (this.playAnimation) {
      if (this.mixer) {
        // this.delta = this.clock.getDelta();
        this.mixer.update(0.015);
      }
    }
  }

  renderToCanvas() {
    const id = "#" + this.name.substring(0, this.name.length - 5) + "Canvas";
    const elem = document.querySelector(id);
    console.log(`renderToCanvas id: ${id}`);

    elem.style.visibility = "visible";
    var context = elem.getContext("2d");
    this.render();
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.drawImage(
      View.renderer.domElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  static elemHoverStatus(id) {
    const isHover = (e) => e.parentElement.querySelector(":hover") === e;
    const divCheck = document.getElementById(id);
    if (isHover(divCheck) && View.currentView !== this) {
      return true;
    }
    return false;
  }

  static changeView(IDs) {
    if (IDs.length === 0) return;
    let renderID = IDs[0];
    if (View.scrollDirection === "down" && IDs.length === 2) renderID = IDs[1];

    if (View.currentView !== View.viewDict[renderID]) {
      View.currentView.renderToCanvas();
      console.log(`RENDERING CANVAS: ${View.currentView.name}`);
      console.log(`RENDERING SCENE: ${renderID}`);
      console.log(`renderID: ${renderID}`);
      View.currentView = View.viewDict[renderID];
      let entryID = renderID.replace("SectionContainer", "CanvasEntry");
      let div = document.getElementById(entryID);
      let canvasID = entryID.substring(0, entryID.length - 5);
      let canvasElem = document.getElementById(canvasID);
      canvasElem.style.visibility = "hidden";
      div.appendChild(View.renderer.domElement);
    }
  }

  static initScrolling() {
    var sectionIDs = [
      "zoomSectionContainer",
      "jetSectionContainer",
      "radarSectionContainer",
      "satSectionContainer",
      "workSectionContainer",
      "photoSectionContainer",
      "laptopSectionContainer",
      "carItemsSectionContainer",
      "skateSectionContainer",
    ];

    document.addEventListener("scroll", function checkScroll() {
      let numViews = 0;
      let viewList = [];
      sectionIDs.every((ID) => {
        if (View.checkVisible(document.getElementById(ID))) {
          numViews++;
          viewList.push(ID);
          if (numViews == 2) return false;
        }
        return true;
      });
      View.changeView(viewList);
    });
  }
  onWindowResize() {
    this.canvas.width = View.renderer.domElement.width;
    this.canvas.height = View.renderer.domElement.height;

    console.log(`WINDOW WIDTH: ${window.innerWidth}`);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    View.renderer.setSize(window.innerWidth, window.innerHeight);
    View.renderer.setPixelRatio(window.devicePixelRatio);
    console.log(window.devicePixelRatio);

    // Effect Composers resize
    if (this.sg) {
      console.log(this.sg.bloom1);
      console.log(this.sg.final);
    }
  }

  // let zoomExitBtn = document.getElementById("zoomExitBtn");
  // zoomExitBtn.addEventListener("click", this.onZoomExitBtnClick);
  setupLoaders() {
    this.rgbLoader = new RGBELoader();
    this.dLoader = new DRACOLoader();
    this.loader = new GLTFLoader();

    this.dLoader.setDecoderConfig({ type: "js" });
    this.dLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    this.dLoader.preload();
    this.loader.setDRACOLoader(this.dLoader);
  }

  init() {
    THREE.Cache.enabled = true;
    this.setupLoaders();
    if (View.renderer === null) {
      console.log(this.canvas);
      console.log("Initializing WebGLRenderer");
      View.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: this.canvas,
        powerPreference: "high-performance",
      });
      View.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      View.renderer.toneMapping = THREE.ReinhardToneMapping;
      View.renderer.toneMappingExposure = 8;
      View.renderer.setSize(this.canvas.width, this.canvas.height, false);
      View.renderer.setPixelRatio(this.devicePixelRatio);
      View.renderer.shadowMap.enabled = true;
      View.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      console.log(`pixel ratio: ${View.renderer.getPixelRatio()}`);
    }

    this.scene = new THREE.Scene();
    this.scene.name = this.name;

    // Camera Setup
    // let width = 1440;
    // let height = 900;

    let width = View.inputElement.clientWidth;
    let height = View.inputElement.clientHeight;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    // Init Neutral HDR
    let scene = this.scene;
    if (scene.environment) scene.environment.dispose();
    if (View.neutralEnv !== null) {
      this.scene.environment = View.neutralEnv;
    } else if (this.env) {
      this.rgbLoader
        .setPath("/src/assets/textures/")
        .load(this.env, function (texture) {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          View.neutralEnv = texture;
          scene.environment = View.neutralEnv;
          // console.log(this.name)
        });
    }
    // this.scene = scene;
  }

  floatModel(model, time, position_delta, rotation_delta) {
    model.position.y = Math.cos(time) * position_delta;
    model.position.x = Math.cos(time) * position_delta;
    model.rotateOnAxis(
      new THREE.Vector3(0, 1, 0),
      Math.cos(time) * rotation_delta
    );
    model.rotateOnAxis(
      new THREE.Vector3(1, 0, 0),
      Math.cos(time) * rotation_delta
    );
    model.rotateOnAxis(
      new THREE.Vector3(0, 0, 1),
      Math.cos(time) * (rotation_delta / 2)
    );
  }

  radian(degrees) {
    return degrees * (Math.PI / 180);
  }

  getRootGroup(obj) {
    let res = obj;
    while (
      res.parent &&
      res.parent.type !== "Scene" &&
      res.parent.userData.terminate === undefined
    ) {
      res = res.parent;
    }
    console.log(res);
    return res;
  }

  moveRenderer(ID) {
    self.postMessage({
      type: "moveRenderer",
      ID: ID,
    });
  }

  updateStyle(ID, selector, value) {
    self.postMessage({
      type: "updateStyle",
      ID: ID,
      selector: selector,
      value: value,
    });
  }

  setAttribute(ID, selector, value) {
    console.log("IN ATTRIBUTE FUNCTION");
    self.postMessage({
      type: "setAttribute",
      ID: ID,
      selector: selector,
      value: value,
    });
  }

  updateCursor(cursor) {
    if (View.cursor === cursor) return;
    View.cursor = cursor;
    console.log(`Updating cursor: ${cursor}`);
    self.postMessage({
      type: "updateCursor",
      cursor: cursor,
    });
  }

  disableScroll() {
    this.setScrollEnabled("hidden");
  }

  enableScroll() {
    this.setScrollEnabled("auto");
  }

  setScrollEnabled(val) {
    self.postMessage({
      type: "setScrollEnabled",
      value: val,
    });
  }
}

export { View };
