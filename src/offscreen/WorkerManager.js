import { Page } from "./PageManager.js";
import { ElementProxy } from "./ElementProxy.js";
import {
  preventDefaultHandler,
  mouseEventHandler,
  touchEventHandler,
  wheelEventHandler,
  filteredKeydownEventHandler,
} from "./EventHandlers.js";

let offscreen;
const renderCanvas = document.getElementById("renderCanvas");
let zoomView = false;

function generateWorker(name, canvasID, worker_path) {
  // importScripts(`src/offscreen/${worker_path}`);
  console.log(`WEBWORKER START: ${name}`);
  const canvas = renderCanvas;
  // alert(`window (${window.innerWidth}, ${window.innerHeight})`);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log(canvas);
  offscreen = canvas.transferControlToOffscreen();
  console.log(canvas);
  console.log(offscreen);
  // const worker = new Worker(`./${worker_path}`, {
  //   type: "module",
  // });
  // const worker = new Worker(`src/offscreen/${worker_path}`, {
  //   type: "module",
  // });
  //https://mringbucket.s3.us-west-1.amazonaws.com/src/offscreen/offscreen_render.js

  // const worker = new Worker(`src/offscreen/${worker_path}`, {
  //   type: "module",
  // });
  // const worker = new Worker({}, {
  //   type: "module",
  // });
  const worker = new Worker(`/src/offscreen/${worker_path}`, {
    type: "module",
  });
  worker.onerror = (event) => {
    console.log("There is an error with your worker!");
    console.log(event);
  };

  console.log(worker);
  // worker.name = name;

  const eventHandlers = {
    contextmenu: preventDefaultHandler,
    mousedown: mouseEventHandler,
    mousemove: mouseEventHandler,
    mouseup: mouseEventHandler,
    pointerdown: mouseEventHandler,
    pointermove: mouseEventHandler,
    pointerup: mouseEventHandler,
    touchstart: touchEventHandler,
    touchmove: touchEventHandler,
    touchend: touchEventHandler,
    wheel: wheelEventHandler,
    keydown: filteredKeydownEventHandler,
  };
  const proxy = new ElementProxy(canvas, worker, eventHandlers);
  // alert(`canvas (${canvas.clientWidth}, ${canvas.clientHeight})`);

  worker.postMessage(
    {
      type: "main",
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      devicePixelRatio: window.devicePixelRatio,
      name: name,
      canvas: offscreen,
      canvasId: proxy.id,
    },
    [offscreen]
  );
  console.log(worker);
  function sendSize() {
    worker.postMessage({
      type: "size",
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      devicePixelRatio: window.devicePixelRatio,
    });

    console.log(`WEBWORKER END: ${name}`);
  }

  worker.onmessage = (e) => {
    // console.log(`Received message from ${worker.name}: ${e.data}`);
    const fn = handlers[e.data.type];
    if (typeof fn !== "function") {
      throw new Error("no handler for type: " + e.data.type);
    }
    fn(e.data);
  };
  sendSize();

  return worker;
}

const navHeight = document.getElementById("nav").offsetHeight + 30;
const viewHeight = Math.max(
  document.documentElement.clientHeight,
  window.innerHeight
);

const numScenes = 1;
let scenesLoaded = -1;

function updateLoadPercentage(data) {
  scenesLoaded++;
  let percentage = document.getElementById("percentage");
  let valueBar = document.getElementById("progressBarValue");
  let totalPercentage = 0;
  let blockPercentage = "(" + scenesLoaded + "/" + numScenes + ")";
  percentage.innerText = blockPercentage;
  totalPercentage = (scenesLoaded / numScenes) * 100;
  valueBar.value = totalPercentage;

  if (totalPercentage === 100) {
    setTimeout(function () {
      //wait a little for user to see 100%
      let progressBar = document.getElementById("ProgressBarContainer");
      console.log(progressBar);
      progressBar.style.visibility = "hidden";
    }, 200);
  }

  // renderToCanvas();
}
updateLoadPercentage(null);

function updateCursor(data) {
  document.body.style.cursor = data.cursor;
}

function checkVisible(elm) {
  var rect = elm.getBoundingClientRect();
  return !(rect.bottom < navHeight || rect.top - viewHeight >= 0);
}

const renderWorker = generateWorker(
  "renderWorker",
  "#renderCanvas",
  "offscreen_render.js"
);
// const jetWorker = generateWorker("jetWorker", "#jetCanvas", "offscreen_jet.js");
// const radarWorker = generateWorker(
//   "radarWorker",
//   "#radarCanvas",
//   "offscreen_radar.js"
// );
// const satWorker = generateWorker("satWorker", "#satCanvas", "offscreen_sat.js");
// const workWorker = generateWorker(
//   "workWorker",
//   "#workCanvas",
//   "offscreen_work.js"
// );

// const carWorker = generateWorker(
//   "carWorker",
//   "#carItemsCanvas",
//   "offscreen_car.js"
// );
// const skateWorker = generateWorker(
//   "skateWorker",
//   "#skateCanvas",
//   "offscreen_skate.js"
// );
// const photoWorker = generateWorker(
//   "photoWorker",
//   "#photoCanvas",
//   "offscreen_photo.js"
// );
// const laptopWorker = generateWorker(
//   "laptopWorker",
//   "#laptopCanvas",
//   "offscreen_jet.js"
// );

// generateWorker("#zoomCanvas", "offscreen_jet.js");

// Message Events -------------------------------------------------

const handlers = {
  updateLoadPercentage,
  carouselAnimation,
  updateCursor,
  moveRenderer,
  updateStyle,
  setAttribute,
  setScrollEnabled,
  createPointLabel,
};

const state = {
  width: 1440, // canvas default
  height: 900, // canvas default
  visible: false,
  name: "",
  mouseDown: false,
  mouseUp: false,
};

const introPage = new Page("introSectionContainer");
const skillsPage = new Page("skillsSectionContainer");
const terminalPage = new Page("terminalSectionContainer");
const jetPage = new Page("jetSectionContainer", renderWorker, 1.4);
const radarPage = new Page("radarSectionContainer", renderWorker, 2);
const seniorPage = new Page("seniorSectionContainer", renderWorker, 2);
const satPage = new Page("satSectionContainer", renderWorker, 1.6);
const awardPage = new Page("awardSectionContainer");
const workPage = new Page("workSectionContainer", renderWorker, 1.1);
const carPage = new Page("carItemsSectionContainer", renderWorker, 1.7);
const skatePage = new Page("skateSectionContainer", renderWorker, 2);
const photoPage = new Page("photoSectionContainer", renderWorker);
const laptopPage = new Page("laptopSectionContainer");
const timelinePage = new Page("timelineSectionContainer");
const contactPage = new Page("contactSectionContainer");

const pagesArr = [
  introPage,
  skillsPage,
  terminalPage,
  jetPage,
  radarPage,
  satPage,
  awardPage,
  workPage,
  carPage,
  skatePage,
  photoPage,
  laptopPage,
  timelinePage,
  contactPage,
];

Page.target = null;
getCurrentPage();
console.log(Page.current);
var oldScrollY = window.scrollY;
let scrolling = false;
const visibleDict = {};

pagesArr.forEach((page) => {
  visibleDict[page.name] = false;
});

function getCurrentPage() {
  console.log("CHECKING CURRENT PAGE");
  pagesArr.every((page) => {
    if (checkVisible(page.sectionContainer)) {
      // console.log(page);
      Page.current = page;
      return false;
    } else return true;
  });
}

function getScrollDirection() {
  let direction = null;
  Page.target = Page.current;
  if (oldScrollY < window.scrollY) {
    if (Page.current) {
      if (Page.current.nextPage) Page.target = Page.current.nextPage;
      direction = " Down";
    }
  } else {
    if (Page.current) {
      direction = " Up";
      if (Page.current.previousPage) Page.target = Page.current.previousPage;
    }
  }

  // console.log(`oldScrollY: ${oldScrollY} | window y: ${window.scrollY}}`);
  oldScrollY = window.scrollY;
  return direction;
}

function renderToCanvas(elem) {
  elem.width = 1440;
  elem.height = 900;

  var context = elem.getContext("2d");
  context.clearRect(0, 0, elem.width, elem.height);
  context.drawImage(renderCanvas, 0, 0, elem.width, elem.height);
  // console.log(`renderCanvas: ${renderCanvas.width} | ${renderCanvas.height}`);
  // console.log(`testCanvas: ${elem.width} | ${elem.height}`);
}

function updateView() {
  renderWorker.postMessage({
    type: "updateView",
    name: Page.current.viewName,
  });
}

function checkScroll() {
  if (scrolling || zoomView) return;
  console.log("checking scroll");
  if (Page.target === null && Page.current) {
    let direction = getScrollDirection();
    // console.log(direction);
    // console.log(Page.current);
    console.log(`page name: ${Page.current.name}`);
    // if (Page.current.isRendered) {
    //   // Page.current.worker.postMessage({
    //   //   type: "setVisibility",
    //   //   visible: false,
    //   // });
    //   visibleDict[Page.current.name] = false;
    // }
    if (Page.current.canvas) {
      renderToCanvas(Page.current.canvas);
      Page.current.canvas.style.display = "block";
      document.body.style.cursor = "default";
    }
    Page.current = Page.target;
    if (Page.current.canvasEntry) {
      updatePixelRatio(1);
      Page.current.canvas.style.display = "none";
      Page.current.canvasEntry.appendChild(renderCanvas);
    }
    // Page.current.canvas.style.display = "none";
    // console.log(Page.current.previousPage);
    // if (Page.current.previousPage.canvas)
    //   Page.current.previousPage.canvas.style.display = "block";

    // console.log(Page.current);
    renderWorker.postMessage({
      type: "updateView",
      name: Page.current.viewName,
    });

    // if (Page.current.canvas) renderToCanvas(Page.current.canvas);

    // let canvasEntry = document.getElementById(data.ID);
    // canvasEntry.appendChild(renderCanvas);
    if (Page.current.isRendered) {
      // Page.current.worker.postMessage({
      //   type: "setVisibility",
      //   visible: true,
      // });

      // console.log(`SEND TRUE VISIBLE to ${Page.current.name}`);
      visibleDict[Page.current.name] = true;
    }
    Page.target = null;
    if (Page.current) console.log(Page.current.name);
    scrolling = true;

    // console.log(Page.target);
  }
}

document.addEventListener("scroll", checkScroll);
document.addEventListener("scrollend", (event) => {
  if (zoomView) return;
  console.log("SCROLL ENDED");
  // console.log(visibleDict);
  scrolling = false;
  oldScrollY = window.scrollY;

  console.log(Page.current);

  if (Page.current && Page.current.isRendered) {
    let ratio = Page.current.pixelRatio;
    updatePixelRatio(ratio);
  }

  if (checkVisible(Page.current.sectionContainer) === false) {
    console.log("PAGE INCORRECT");
    // Set correct page visibility
    getCurrentPage();
    if (Page.current.canvasEntry) {
      updateView();
      let ratio = Page.current.pixelRatio;
      updatePixelRatio(ratio);
      Page.current.canvasEntry.appendChild(renderCanvas);
    }

    console.log(`Reset Page to: ${Page.current.name}`);
  }
});
// document.addEventListener("scrollend", (event) => {});

// Scroll through car items carousel
let carouoselIndex = 0;
let animationReady = true;
let car_module_items = [
  { title: "lidar_module_title", info: "carousel-item-lidar" },
  { title: "display_module_title", info: "carousel-item-display" },
  { title: "esp32_module_title", info: "carousel-item-esp32" },
  { title: "camera_module_title", info: "carousel-item-camera" },
];
car_module_items.forEach((item) => {
  item.title = document.getElementById(item.title);
  item.info = document.getElementById(item.info);
});

let leftBtn = document.getElementById("carouselLeft");
let rightBtn = document.getElementById("carouselRight");
leftBtn.onclick = function () {
  rotateCarousel("previous");
};
rightBtn.onclick = function () {
  rotateCarousel("next");
};

function rotateCarousel(direction) {
  if (!animationReady) return;
  let delta = 0;
  if (direction === "next") delta = 1;
  else delta = -1;
  let item = getCircularArrayItem(car_module_items, carouoselIndex);
  item.title.style.display = "none";
  item.info.style.display = "none";
  carouoselIndex += delta;
  item = getCircularArrayItem(car_module_items, carouoselIndex);
  item.title.style.display = "block";
  item.info.style.display = "block";

  // Send message direction to car worker
  animationReady = false;
  renderWorker.postMessage({
    type: "carouselRotation",
    direction: direction,
  });
}

function carouselAnimation() {
  animationReady = !animationReady;
}

function getCircularArrayItem(arr, index) {
  let n = arr.length;
  return arr[((index % n) + n) % n];
}

console.log(car_module_items);

// function renderToCanvas() {
//   const id = "#renderCanvas";
//   const elem = document.querySelector(id);
//   elem.width = 1440;
//   elem.height = 900;
//   const renderCanvas = document.querySelector("#jetCanvas");
//   // console.log(`renderToCanvas id: ${id}`);

//   // elem.style.visibility = "visible";
//   var context = elem.getContext("2d");
//   context.clearRect(0, 0, elem.width, elem.height);
//   context.drawImage(renderCanvas, 0, 0, elem.width, elem.height);
//   // console.log(`renderCanvas: ${renderCanvas.width} | ${renderCanvas.height}`);
//   // console.log(`testCanvas: ${elem.width} | ${elem.height}`);
// }

// let sendMouse;
// sendMouse = (x, y) => {
//   renderWorker.postMessage({
//     type: "mouse",
//     x,
//     y,
//   });
// };

// const renderCanvas = document.getElementById("jetCanvas");
// function getCanvasRelativePosition(event) {
//   const rect = renderCanvas.getBoundingClientRect();
//   return {
//     x: ((event.clientX - rect.left) / (rect.width - rect.left)) * 2 - 1,
//     y: -((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1,
//   };
// }

function moveRenderer(data) {
  if (data.ID === "zoomCanvasEntry") zoomView = true;
  // console.log(`MOVING RENDERER TO : ${data.ID}`);
  let canvasEntry = document.getElementById(data.ID);
  let canvas = document.getElementById("renderCanvas");
  console.log(canvasEntry);
  console.log(renderCanvas);
  canvasEntry.appendChild(canvas);

  let res = canvasEntry.contains(renderCanvas);
  console.log(`STATUS: ${res}`);
  console.log(canvasEntry.children);
  console.log(`${data.ID} length: ${canvasEntry.children.length}`);
  if (canvasEntry.children.length === 1) {
    console.log("RENDER MOVE FAILED. Retrying...");
    moveRenderer(data);
  }
}

function updateStyle(data) {
  let { ID, selector, value } = data;
  let elem = document.getElementById(ID);
  elem.style[selector] = value;
}

function setAttribute(data) {
  console.log("SETTNG ATTRIBUTE");
  let { ID, selector, value } = data;
  let elem = document.getElementById(ID);
  elem.setAttribute(selector, value);
}

function setScrollEnabled(data) {
  console.log(`Setting Scroll: ${data.value}`);
  document.body.style.overflowY = data.value;
}

function createPointLabel(data) {
  const { labelID, labelText } = data;
  let graphContainer = document.getElementById("skateSectionContainer");
  let point_label_elem = document.createElement("p");
  point_label_elem.setAttribute("class", "point-label");
  point_label_elem.setAttribute("id", labelID);
  point_label_elem.innerHTML = labelText;
  graphContainer.appendChild(point_label_elem);
}

function movePointLabel(data) {}

// function setPickPosition(event) {
//   const pos = getCanvasRelativePosition(event);

//   sendMouse(pos.x, pos.y); // note we flip Y

//   // sendMouse((pos.x / 1440) * 2 - 1, (pos.y / 900) * -2 + 1); // note we flip Y

//   // console.log(`mouse: (${pos.x}, ${pos.y})`);
// }
// window.addEventListener("mousemove", setPickPosition);

function mouseDown() {
  if (state.mouseDown === false) {
    state.mouseDown = true;
    state.mouseUp = false;
    renderWorker.postMessage({
      type: "mouseDown",
      mouseDown: state.mouseDown,
    });

    console.log("MOUSE DOWN SENT");
  }
}

function mouseUp() {
  if (state.mouseUp === false) {
    state.mouseUp = true;
    state.mouseDown = false;
    renderWorker.postMessage({
      type: "mouseUp",
      mouseDown: state.mouseUp,
    });

    console.log("MOUSE UP SENT");
  }
}

window.addEventListener("mousedown", mouseDown);
window.addEventListener("mouseup", mouseUp);

function zoomBtnClick() {
  renderWorker.postMessage({
    type: "selectionMode",
  });
}

function zoomExitBtnClick() {
  renderWorker.postMessage({
    type: "zoomExit",
  });
  zoomView = false;
}

function updatePixelRatio(val) {
  renderWorker.postMessage({
    type: "updatePixelRatio",
    value: val,
  });
}

function workerClick() {
  alert("Senior Zoom clicked");
  const worker = new Worker(`/src/offscreen/offscreen_render.js`, {
    type: "module",
  });
  worker.onerror = (event) => {
    console.log("There is an error with your worker!");
    console.log(event);
  };
}

window.onload = function () {
  var anchors = document.getElementsByClassName("searchButtons");
  for (var i = 0; i < anchors.length; i++) {
    var anchor = anchors[i];
    console.log(anchor);
    anchor.onclick = zoomBtnClick;
  }

  let zoomExitBtn = document.getElementById("zoomExitBtn");
  zoomExitBtn.addEventListener("click", zoomExitBtnClick);

  let workerBtn = document.getElementById("seniorZoomBtn");
  workerBtn.onclick = workerClick;
};
