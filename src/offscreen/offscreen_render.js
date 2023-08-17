import { View } from "../View.js";
// import { setup as jetSetup, render as jetRender } from "../jet.js";
// import { setup as radarSetup, render as radarRender } from "../radar.js";
import { setup as seniorSetup, render as seniorRender } from "../senior.js";
// import { setup as satSetup, render as satRender } from "../sat.js";
// import { setup as workSetup, render as workRender } from "../work.js";
// import { setup as carSetup, render as carRender } from "../carItems.js";
// import { setup as skateSetup, render as skateRender } from "../skate.js";
// import { setup as laptopSetup, render as laptopRender } from "../laptop.js";
// import { setup as zoomSetup, render as zoomRender } from "../zoom.js";
// import { ElementProxyReceiver } from "./ElementProxyReceiver.js";
import { ProxyManager } from "./ProxyManager.js";

const proxyManager = new ProxyManager();

const handlers = {
  main,
  size,
  setVisibility,
  updateView,
  //   mouse,
  mouseDown,
  mouseUp,
  selectionMode,
  zoomExit,
  carouselRotation,
  updatePixelRatio,
  makeProxy,
  event: proxyManager.handleEvent,
};

// let sendMouse;
// sendMouse = (x, y) => {
//   if (View.currentView === null || View.currentView === undefined) return;
//   View.currentView.pointer.x = pos.x;
//   View.currentView.pointer.y = pos.y;
//   //   renderWorker.postMessage({
//   //     type: "mouse",
//   //     x,
//   //     y,
//   //   });
// };

function clearMousePosition() {
  if (View.currentView === null || View.currentView === undefined) return;
  View.currentView.pointer.x = -100000;
  View.currentView.pointer.y = -100000;
}

function getCanvasRelativePosition(event) {
  const rect = View.inputElement.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / (rect.width - rect.left)) * 2 - 1,
    y: -((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1,
  };
}

function getMousePosition(event) {
  //   console.log("getting mouse poosition");
  if (View.currentView === null || View.currentView === undefined) return;
  let pos = getCanvasRelativePosition(event);
  View.currentView.pointer.x = pos.x;
  View.currentView.pointer.y = pos.y;
  //   console.log(`(${pos.x}, ${pos.y})`);
}

const state = {
  width: 1440, // canvas default
  height: 900, // canvas default
  visible: false,
  name: "",
  mouseDown: false,
  selectionMode: false,
};

function makeProxy(data) {
  proxyManager.makeProxy(data);
}

self.onmessage = function (e) {
  const fn = handlers[e.data.type];
  if (typeof fn !== "function") {
    throw new Error("no handler for type: " + e.data.type);
  }
  fn(e.data);
};

function size(data) {
  state.width = data.width;
  state.height = data.height;
}

function setVisibility(data) {
  state.visible = data.visible;
  console.log(`${state.name} | Received State: visible(${state.visible})`);
}

function updateView(data) {
  const { name } = data;
  console.log(data.name);
  View.currentView = View.viewDict[name];
  if (View.currentView) View.currentView.render();
  console.log(`Changed view to: ${name}`);
}

// function mouse(data) {
//   if (View.currentView === null || View.currentView === undefined) return;
//   View.currentView.pointer.x = data.x;
//   View.currentView.pointer.y = data.y;
//   console.log(`mouse (${data.x}, ${data.y})`);
// }

function mouseDown(data) {
  if (View.currentView === null || View.currentView === undefined) return;
  state.mouseDown = data.mouseDown;
  state.mouseUp = !state.mouseUp;
  View.currentView.mouseDown = state.mouseDown;
  View.currentView.mouseUp = state.mouseUp;
}

function mouseUp(data) {
  if (View.currentView === null || View.currentView === undefined) return;
  state.mouseDown = data.mouseDown;
  state.mouseDown = !state.mouseDown;
  View.currentView.mouseUp = state.mouseUp;
  View.currentView.mouseDown = state.mouseDown;
}

function selectionMode(data) {
  if (View.currentView === null || View.currentView === undefined) return;
  View.currentView.disableScroll();
  View.currentView.selectionMode = true;
  View.previousView = View.currentView;
}

function zoomExit(data) {
  if (View.currentView === null || View.currentView === undefined) return;
  View.currentView.onZoomExitBtnClick();
}

function updatePixelRatio(data) {
  View.renderer.setPixelRatio(data.value);
}

// CarItemsView
function carouselRotation(data) {
  View.currentView.handleClick(data.direction);
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = state.width;
  const height = state.height;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function postUpdate() {
  self.postMessage({
    type: "updateLoadPercentage",
  });
}

function setupControls(proxy) {
  View.inputElement = proxy;
  View.inputElement.top = 52.4375;
  View.inputElement.addEventListener("mousemove", getMousePosition);
  View.inputElement.addEventListener("mouseout", clearMousePosition);
  View.inputElement.addEventListener("mouseleave", clearMousePosition);

  View.inputElement.addEventListener(
    "touchstart",
    (event) => {
      // prevent the window from scrolling
      event.preventDefault();
      getMousePosition(event.touches[0]);
    },
    { passive: false }
  );
  View.inputElement.addEventListener("touchmove", (event) => {
    getMousePosition(event.touches[0]);
  });
  View.inputElement.addEventListener("touchend", clearMousePosition);
}

function main(data) {
  View.vpWidth = data.width;
  View.vpHeight = data.height;
  const proxy = proxyManager.getProxy(data.canvasId);
  self.document = {};
  setupControls(proxy);
  console.log(proxy);
  const { canvas } = data;

  // Generate Views
  // const jetView = new View(data, canvas, "jetScene", jetSetup, jetRender);
  // const radarView = new View(
  //   data,
  //   canvas,
  //   "radarScene",
  //   radarSetup,
  //   radarRender
  // );
  const seniorView = new View(
    data,
    canvas,
    "seniorScene",
    seniorSetup,
    seniorRender
  );
  // const satView = new View(data, canvas, "satScene", satSetup, satRender);
  // const workView = new View(data, canvas, "workScene", workSetup, workRender);
  // const carItemsView = new View(
  //   data,
  //   canvas,
  //   "carItemsScene",
  //   carSetup,
  //   carRender
  // );
  // const skateView = new View(
  //   data,
  //   canvas,
  //   "skateScene",
  //   skateSetup,
  //   skateRender
  // );
  // const zoomView = new View(data, canvas, "zoomScene", zoomSetup, zoomRender);
  // View.zoomView = zoomView;
  View.currentView = seniorView;

  console.log(View.viewDict);
  View.renderer.setPixelRatio(1.6);
  console.log(`DEVICE PIXEL RATIO: ${View.renderer.getPixelRatio()}`);
  // postUpdate();
  // console.log(jetView);
  function render() {
    if (View.currentView) View.currentView.render();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
