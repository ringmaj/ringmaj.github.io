import * as THREE from "three";
import { View } from "./View.js";
// import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass";
import { RenderPass } from "three/addons/postprocessing/RenderPass";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass";
import { FXAAShader } from "three/addons/shaders/FXAAShader";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer";

// import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
// import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
// import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
// import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
// import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";

if (View.MUTE_LOGS) console.log = function () {};

class Outline {
  constructor(scene, camera, renderer) {
    // - composer
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(Math.min(renderer.getPixelRatio(), 2));
    // - render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    // - outline pass
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(1440, 900),
      scene,
      camera
    );
    // -- parameter config
    this.outlinePass.edgeStrength = 20;
    this.outlinePass.edgeGlow = 1;
    this.outlinePass.edgeThickness = 0.1;
    this.outlinePass.pulsePeriod = 2;
    this.outlinePass.usePatternTexture = false; // patter texture for an object mesh
    // #13106f
    // this.outlinePass.visibleEdgeColor.set("#FFEE38"); // set basic edge color
    // this.outlinePass.hiddenEdgeColor.set("#000000"); // set edge color when it hidden by other objects
    this.outlinePass.visibleEdgeColor.set("#DEC177"); // set basic edge color
    this.outlinePass.hiddenEdgeColor.set("#000000"); // set edge color when it hidden by other objects
    this.composer.addPass(this.outlinePass);

    //shader
    this.effectFXAA = new ShaderPass(FXAAShader);
    this.effectFXAA.uniforms["resolution"].value.set(1 / 1440, 1 / 900);
    this.effectFXAA.renderToScreen = true;
    // this.composer.addPass(this.effectFXAA);

    console.log(this.outlinePass);
  }
}

export { Outline };

// // import { ShaderMaterial, Vector2 } from "three";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
// import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
// import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
// import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
// import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
// import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
// import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

// class Outline {
//   Configuration() {
//     this.visibleEdgeColor = "#ffffff";
//     this.hiddenEdgeColor = "#190a05";
//   }
//   constructor(scene, camera, renderer) {
//     let container, stats;
//     let camera, scene, renderer, controls;
//     let composer, effectFXAA, outlinePass;

//     let selectedObjects = [];

//     const raycaster = new THREE.Raycaster();
//     const mouse = new THREE.Vector2();

//     const obj3d = new THREE.Object3D();
//     const group = new THREE.Group();

//     const params = {
//       edgeStrength: 3.0,
//       edgeGlow: 0.0,
//       edgeThickness: 1.0,
//       pulsePeriod: 0,
//       rotate: false,
//       usePatternTexture: false,
//     };

//     // Init gui

//     const gui = new GUI({ width: 280 });

//     gui.add(params, "edgeStrength", 0.01, 10).onChange(function (value) {
//       outlinePass.edgeStrength = Number(value);
//     });

//     gui.add(params, "edgeGlow", 0.0, 1).onChange(function (value) {
//       outlinePass.edgeGlow = Number(value);
//     });

//     gui.add(params, "edgeThickness", 1, 4).onChange(function (value) {
//       outlinePass.edgeThickness = Number(value);
//     });

//     gui.add(params, "pulsePeriod", 0.0, 5).onChange(function (value) {
//       outlinePass.pulsePeriod = Number(value);
//     });

//     gui.add(params, "rotate");

//     gui.add(params, "usePatternTexture").onChange(function (value) {
//       outlinePass.usePatternTexture = value;
//     });

//     const conf = new Configuration();

//     gui.addColor(conf, "visibleEdgeColor").onChange(function (value) {
//       outlinePass.visibleEdgeColor.set(value);
//     });

//     gui.addColor(conf, "hiddenEdgeColor").onChange(function (value) {
//       outlinePass.hiddenEdgeColor.set(value);
//     });
//   }
// }

// export { Outline };
