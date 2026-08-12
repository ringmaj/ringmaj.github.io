import NavigationArrows from "@/Components/NavigationArrows";
import Showcase from "@/Components/Pages/Showcase";
import { Position } from "@/Components/Lead";
import SatelliteScene from "@/Components/Scenes/SatelliteScene";

export default function SatellitePage() {
  return (
    <NavigationArrows color="white">
      <Showcase
        title="Next-generation space systems."
        description={[
          "Worked with Next-Generation Overhead Persistent Infrared polar-orbiting satellite systems and spacecraft simulation software.",
          "Improved analysis and processing scripts from 2.5 hours to 3 minutes and 45 seconds, a 96% reduction in processing time.",
        ]}
        modelUrl="/Models/orbital-space-satellite-transformed.glb"
        defaultNormalScale={2.8}
        position={Position.Right}
        leadOnDark
        scene={
          <SatelliteScene modelUrl="/Models/orbital-space-satellite-transformed.glb" />
        }
      />
    </NavigationArrows>
  );
}
