import React from "react";
import Lead from "../Lead";
import JetScene from "../Scenes/JetScene";
import { SceneInspectorProvider } from "../SceneInspector";

const header = "Worked on one of these.";
const description = [
  "APG79/APG82. F-15 Eagle, F/A-18 Hornet.",
  "Developed software for APG79/APG82 Active Electronically Scanned Array Radar. Delivered builds for U.S, Japan, Kuwait, and Qatar radar systems.",
  "Mode development including Air-to-Air, Sea Surface Search, GTMI (Ground Moving Target Indicator), Air-to-Ground, SAR Maps (Synthetic Aperture Radar), Attack modes, and more modes.",
];

const Jets = () => {
  return (
    <SceneInspectorProvider
      modelUrl="/Models/jet-test-transformed.glb"
      label="F/A-18 Hornet"
    >
      <div className="w-full h-full !min-h-[40em]">
        <Lead header={header} description={description} />
      </div>
      <JetScene />
    </SceneInspectorProvider>
  );
};

export default Jets;
