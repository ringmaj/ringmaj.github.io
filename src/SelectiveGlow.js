// import { ShaderMaterial, Vector2 } from "three";
import { ShaderMaterial, Vector2 } from "three";
import { View } from "./View.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

if (View.MUTE_LOGS) console.log = function () {};

class SelectiveGlow {
  constructor(scene, camera, renderer) {
    const renderScene = new RenderPass(scene, camera);

    const bloomPass1 = new UnrealBloomPass(
      new Vector2(1440, 900),
      1.6,
      0.1,
      0.5
    );

    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);

    const bloomComposer1 = new EffectComposer(renderer);
    bloomComposer1.renderToScreen = false;
    bloomComposer1.addPass(renderScene);
    bloomComposer1.addPass(bloomPass1);

    // const bloomPass2 = new UnrealBloomPass(new Vector2(1440, 900), 1.6, 0.1, 1);

    // const bloomComposer2 = new EffectComposer(renderer);
    // bloomComposer2.renderToScreen = false;
    // bloomComposer2.addPass(renderScene);
    // bloomComposer2.addPass(bloomPass2);

    const finalPass = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture1: { value: bloomComposer1.renderTarget2.texture },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
          `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture1;
          uniform sampler2D bloomTexture2;
    
          varying vec2 vUv;
    
          void main() {
            gl_FragColor = texture2D( baseTexture, vUv );
            gl_FragColor += vec4( 1.0 ) * texture2D( bloomTexture1, vUv );
          }
          `,
        defines: {},
      }),
      "baseTexture"
    );
    finalPass.needsSwap = true;

    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    // finalComposer.addPass(gammaCorrectionPass);
    finalComposer.addPass(finalPass);

    this.bloomPass1 = bloomPass1;
    this.bloom1 = bloomComposer1;
    // this.bloomPass2 = bloomPass2;
    // this.bloom2 = bloomComposer2;
    this.final = finalComposer;
  }
}

export { SelectiveGlow };
