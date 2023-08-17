// import { ShaderMaterial, Vector2 } from "three";
import * as THREE from "three";
import { View } from "./View.js";
import { ShaderMaterial, Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SavePass } from "three/addons/postprocessing/SavePass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

if (View.MUTE_LOGS) console.log = function () {};

class MotionBlur {
  constructor(scene, camera, renderer) {
    // Post-processing inits
    const composer = new EffectComposer(renderer);

    // render pass
    const renderPass = new RenderPass(scene, camera);

    const renderTargetParameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
    };

    // save pass
    const savePass = new SavePass(
      new THREE.WebGLRenderTarget(
        renderer.domElement.width,
        renderer.domElement.height,
        renderTargetParameters
      )
    );

    // blend pass
    //const blendPass = new ShaderPass(THREE.BlendShader, "tDiffuse1");

    const blendPass = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          tDiffuse1: { type: "t", value: null },
          tDiffuse2: { type: "t", value: savePass.renderTarget.texture },
          mixRatio: { type: "f", value: 0.8 },
          opacity: { type: "f", value: 1.0 },
        },

        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
          `,
        fragmentShader: `

		uniform float opacity;
		uniform float mixRatio;
		uniform sampler2D tDiffuse1;
		uniform sampler2D tDiffuse2;
		varying vec2 vUv;

		void main() {
			vec4 texel1 = texture2D( tDiffuse1, vUv );
			vec4 texel2 = texture2D( tDiffuse2, vUv );
			gl_FragColor = opacity * mix( texel1, texel2, mixRatio );
		}`,
        defines: {},
      }),
      "abc"
    );

    // blendPass.uniforms["tDiffuse2"].value = savePass.renderTarget.texture;
    // blendPass.uniforms["mixRatio"].value = 0.8;

    // output pass
    const outputPass = new ShaderPass(THREE.CopyShader);
    outputPass.renderToScreen = true;

    // adding passes to composer
    composer.addPass(renderPass);
    composer.addPass(blendPass);
    composer.addPass(savePass);
    composer.addPass(outputPass);

    this.composer = composer;
    this.renderPass = renderPass;
    this.blendPass = blendPass;
    this.savePass = savePass;
    this.outputPass = outputPass;

    // const renderScene = new RenderPass(scene, camera);
    // const bloomPass1 = new UnrealBloomPass(
    //   new Vector2(window.innerWidth, window.innerHeight),
    //   1.6,
    //   0.1,
    //   0.5
    // );
    // const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
    // const bloomComposer1 = new EffectComposer(renderer);
    // bloomComposer1.renderToScreen = false;
    // bloomComposer1.addPass(renderScene);
    // bloomComposer1.addPass(bloomPass1);
    // const bloomPass2 = new UnrealBloomPass(
    //   new Vector2(window.innerWidth, window.innerHeight),
    //   1.6,
    //   0.1,
    //   1
    // );
    // const bloomComposer2 = new EffectComposer(renderer);
    // bloomComposer2.renderToScreen = false;
    // bloomComposer2.addPass(renderScene);
    // bloomComposer2.addPass(bloomPass2);
    // const finalPass = new ShaderPass(
    //   new ShaderMaterial({
    //     uniforms: {
    //       baseTexture: { value: null },
    //       bloomTexture1: { value: bloomComposer1.renderTarget2.texture },
    //     },
    //     vertexShader: `
    //       varying vec2 vUv;
    //       void main() {
    //         vUv = uv;
    //         gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    //       }
    //       `,
    //     fragmentShader: `
    //       uniform sampler2D baseTexture;
    //       uniform sampler2D bloomTexture1;
    //       uniform sampler2D bloomTexture2;
    //       varying vec2 vUv;
    //       void main() {
    //         gl_FragColor = texture2D( baseTexture, vUv );
    //         gl_FragColor += vec4( 1.0 ) * texture2D( bloomTexture1, vUv );
    //       }
    //       `,
    //     defines: {},
    //   }),
    //   "baseTexture"
    // );
    // finalPass.needsSwap = true;
    // const finalComposer = new EffectComposer(renderer);
    // finalComposer.addPass(renderScene);
    // // finalComposer.addPass(gammaCorrectionPass);
    // finalComposer.addPass(finalPass);
    // this.bloomPass1 = bloomPass1;
    // this.bloom1 = bloomComposer1;
    // this.bloomPass2 = bloomPass2;
    // this.bloom2 = bloomComposer2;
    // this.final = finalComposer;
  }
}

export { MotionBlur };
