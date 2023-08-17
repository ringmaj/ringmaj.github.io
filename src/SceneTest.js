import { View } from "./View.js";

import { setup as satSetup, render as satRender } from "./sat.js";
import { setup as workSetup, render as workRender } from "./work.js";
import { setup as jetSetup, render as jetRender } from "./jet.js";
import { setup as photoSetup, render as photoRender } from "./photo.js";
import { setup as laptopSetup, render as laptopRender } from "./laptop.js";
import { setup as radarSetup, render as radarRender } from "./radar.js";
import { setup as skateSetup, render as skateRender } from "./skate.js";
import { setup as zoomSetup, render as zoomRender } from "./zoom.js";
import {
  setup as carItemsSetup,
  render as carItemsRender,
} from "./carItems.js";
import Stats from "./stats.js";

if (View.MUTE_LOGS) console.log = function () {};

let views = [];
// console.log = function () {};

let initFrameCompleted = false;
let initFrameTable = new Array(4).fill(false);
let checkFrameInit = (arr) => arr.every(Boolean);

console.log("STATUS: INITIALIZING SCENES");
// const jetView = new View("#jetCanvas", "jetScene", jetSetup, jetRender);
// const radarView = new View(
//   "#radarCanvas",
//   "radarScene",
//   radarSetup,
//   radarRender
//   // "cave.hdr"
// );
// const satView = new View("#satCanvas", "satScene", satSetup, satRender);
// const workView = new View("#workCanvas", "workScene", workSetup, workRender);
// const carItemsView = new View(
//   "#carItemsCanvas",
//   "carItemsScene",
//   carItemsSetup,
//   carItemsRender
// );
const photoView = new View(
  "#photoCanvas",
  "photoScene",
  photoSetup,
  photoRender
);
// const laptopView = new View(
//   "#laptopCanvas",
//   "laptopScene",
//   laptopSetup,
//   laptopRender
// );

const skateView = new View(
  "#skateCanvas",
  "skateScene",
  skateSetup,
  skateRender
);

console.log(View.currentView);

// const zoomView = new View("#zoomCanvas", "zoomScene", zoomSetup, zoomRender);

// views.push(jetView);
// views.push(radarView);
// views.push(satView);
// views.push(workView);
// views.push(carItemsView);
// views.push(photoView);
// views.push(laptopView);
// views.push(zoomView);

// export { carItemsView };

// console.log(`CURRENT VIEW: ${View.currentView.name}`);

var stats = new Stats();
stats.showPanel(2);
// stats.dom.style.display = "none";
const body = document.querySelector("body");
body.appendChild(stats.dom);
var LOADED = false;
var frameCount = 0;
var sum = 0;

let res;

// Setup isScrolling variable
var isScrolling;
var SCROLLING = false;
var lastScrollTop = document.documentElement.scrollTop;

// if (window.devicePixelRatio >= 2)
//   View.renderer.setPixelRatio(window.devicePixelRatio);
// else View.renderer.setPixelRatio(2);

// Listen for scroll events
window.addEventListener(
  "scroll",
  function (event) {
    // get scroll direction
    let direction = {};
    var st = window.pageYOffset || document.documentElement.scrollTop;
    if (st > lastScrollTop) {
      // console.log(`lastScrollTop: ${lastScrollTop} | st: ${st}`);
      // console.log("DOWN");
      direction = "down";
      View.scrollDirection = "down";
    } else if (st < lastScrollTop) {
      // console.log("UP");
      // console.log(`lastScrollTop: ${lastScrollTop} | st: ${st}`);
      direction = "up";
      View.scrollDirection = "up";
    }
    // else console.log(`lastScrollTop: ${lastScrollTop} | st: ${st}`);
    lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
    // console.log(`lastScrollTop: ${lastScrollTop} | st: ${st}`);

    // if (SCROLLING === false) {
    //   SCROLLING = true;
    //   if (View.sceneMap["currentView"].prev !== null && direction === "up") {
    //     let key = View.sceneMap["currentView"].prev;
    //     View.sceneMap["currentView"] = View.sceneMap[key];
    //   } else if (
    //     View.sceneMap["currentView"].next !== null &&
    //     direction === "down"
    //   ) {
    //     let key = View.sceneMap["currentView"].next;
    //     View.sceneMap["currentView"] = View.sceneMap[key];
    //   }
    // }
    // console.log(`SCROLLING: ${SCROLLING}`);
    // Clear our timeout throughout the scroll
    window.clearTimeout(isScrolling);

    // Set a timeout to run after scrolling ends
    isScrolling = setTimeout(function () {
      // Run the callback
      // SCROLLING = false;
      // console.log(`SCROLLING: ${SCROLLING}`);
    }, 66);
  },
  false
);

function processViews(view, res) {
  let id = "#" + view.name.substring(0, view.name.length - 5);
  if (res[0]) View.renderSet.add(id);
  else View.renderSet.delete(id);

  if (res[1]) View.canvasSet.add(id);
  else View.canvasSet.delete(id);

  if (res[0] && res[1]) View.renderSet.delete(id);

  // View.updateViewList();
}

function renderViews() {
  // if (View.checkVisible(View.currentView.container)) {
  // if (View.currentView) {

  // if (View.checkVisible(zoomView.sectionContainer))
  //   console.log(`rendering: ${zoomView.name}`);
  // if (View.checkVisible(View.currentView.sectionContainer))
  //   console.log(`rendering: ${View.currentView.name}`);
  if (View.checkVisible(View.currentView.sectionContainer)) {
    // console.log(`rendering: ${View.currentView.name}`);
    View.currentView.render();
  }
  // View.updateViewList();
  // }
  // }

  // views.forEach((item, index) => {
  //   if (View.currentView !== item) {
  //     res = item.render();
  //     processViews(item, res);
  //     if (!initFrameCompleted) initFrameTable[index] = item.initFrameRendered;
  //   }
  // });
  // res = View.currentView.render();
  // processViews(View.currentView, res);
  // if (!initFrameCompleted)
  //   initFrameTable[0] = View.currentView.initFrameRendered;

  // // console.log(`frames init: ${checkFrameInit(initFrameTable)}`);

  // // console.log(
  // //   `[0]: ${initFrameTable[0]} | [1]: ${initFrameTable[1]} | [2]: ${initFrameTable[2]} | [3]: ${initFrameTable[3]} | `
  // // );

  // if (!initFrameCompleted && checkFrameInit(initFrameTable)) {
  //   View.currentView.initFrameRendered = false;
  //   initFrameCompleted = true;
  //   LOADED = true;
  //   let progressBar = document.getElementById("ProgressBarContainer");
  //   progressBar.style.visibility = "hidden";

  //   console.log("statuses: ");
  //   console.log(View.loadStatuses);

  //   if (window.devicePixelRatio >= 2)
  //     View.renderer.setPixelRatio(window.devicePixelRatio);
  //   else View.renderer.setPixelRatio(2);
  // }
}

function updateLoadPercentage() {
  if (!LOADED) {
    let percentage = document.getElementById("percentage");
    let valueBar = document.getElementById("progressBarValue");
    let totalPercentage = 0;
    let blockPercentage = "(" + View.scenesLoaded + "/" + View.numScenes + ")";
    percentage.innerText = blockPercentage;

    let sum = 0;
    View.loadStatuses.forEach((val) => {
      sum += val;
    });
    totalPercentage = sum / View.numScenes;
    valueBar.value = totalPercentage;
  }
}

function updateRes(currentFPS) {
  if (currentFPS > 110) {
    View.renderer.setPixelRatio(View.renderer.getPixelRatio() + 0.1);
    console.log("++UPDATED PIXEL RATIO: " + View.renderer.getPixelRatio());
  }

  if (currentFPS < 55) {
    View.renderer.setPixelRatio(View.renderer.getPixelRatio() - 0.1);
    console.log("--UPDATED PIXEL RATIO: " + View.renderer.getPixelRatio());
  }
}

function checkVisible(elm) {
  var rect = elm.getBoundingClientRect();
  var navHeight = document.getElementById("nav").offsetHeight + 30;
  var viewHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight
  );
  return !(rect.bottom < navHeight || rect.top - viewHeight >= 0);
}

function animate() {
  // if (checkVisible(View.renderer.domElement))
  //   console.log("RENDER CANVAS VISIBLE");
  requestAnimationFrame(animate);
  stats.begin();
  updateLoadPercentage();
  renderViews();
  stats.end();
  stats.update();

  // if (frameCount == 500) {
  //   var avgFPS = sum / 500;
  //   updateRes(avgFPS);
  //   frameCount = 0;
  //   sum = 0;
  // } else frameCount++;
  // sum += stats.getFPS();
}

animate();
