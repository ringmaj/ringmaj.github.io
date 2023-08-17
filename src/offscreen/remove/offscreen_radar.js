import { View } from "../View.js";
import * as THREE from "https://unpkg.com/three@0.151.3/build/three.module.js";
import { setup as radarSetup, render as radarRender } from "../radar.js";

const handlers = {
  main,
  size,
  setVisibility,
};

const state = {
  width: 1440, // canvas default
  height: 900, // canvas default
  visible: false,
  name: "",
};

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

function main(data) {
  const { canvas } = data;
  const radarView = new View(
    data,
    canvas,
    "radarScene",
    radarSetup,
    radarRender
  );
  console.log(radarView);
  function render() {
    if (state.visible) {
      radarView.render();
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
