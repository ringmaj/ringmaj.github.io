import React from "react";
import Lead, { Position } from "../Lead";
import RadarScene from "../Scenes/RadarScene";
import { SceneInspectorProvider } from "../SceneInspector";

const header = "Built software for mission-critical flight displays.";
const description = [
  "Developed and integrated display and modeling changes for Operational Flight Program builds, from initial implementation through final delivery.",
  "Tested releases using RSIL (Radar Systems Integration Lab) hardware-in-the-loop systems to validate behavior against real radar hardware.",
  "Improved delivery reliability through automated testing, streamlined integration, and CI/CD.",
  "Trusted with developing, testing, integrating, and delivering critical build images.",
];

const Radar = () => {
  return (
    <SceneInspectorProvider
      modelUrl="/Models/rmu-transformed.glb"
      label="Multi Functional Display"
    >
      <div className="w-full h-full !min-h-[40em]">
        <Lead
          header={header}
          description={description}
          position={Position.Right}
        />
      </div>
      <RadarScene />
    </SceneInspectorProvider>
  );
};

export default Radar;
