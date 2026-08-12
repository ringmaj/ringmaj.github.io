import React from "react";
import Lead, { Position } from "../Lead";
import RadarScene from "../Scenes/RadarScene";
import { SceneInspectorProvider } from "../SceneInspector";

const header = "MFD (Multi Functional Display)";
const description = [
  "Developed software features and updates for mission critical computer display/modeling for OFP (Operational Flight Plan) builds.",
  "Streamlined Development Processes: Recognizing the importance of efficiency in defense projects, I led initiatives to streamline the software development processes. I introduced agile methodologies, automated testing frameworks, and continuous integration/continuous deployment (CI/CD) pipelines, reducing development time and ensuring faster delivery of software updates. This enabled quicker responses to evolving defense requirements and facilitated iterative improvements to the systems.",
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
