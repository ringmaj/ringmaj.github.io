import NavigationArrows from "@/Components/NavigationArrows";
import Showcase from "@/Components/Pages/Showcase";
import { Position } from "@/Components/Lead";
import PhotoVortexScene from "@/Components/Scenes/PhotoVortexScene";

export default function PhotoVortexPage() {
  return (
    <NavigationArrows>
      <Showcase
        title="A peek into my life."
        description={[
          "I call it a Photo Vortex: a collection of experiences, places, and moments arranged chaotically.",
          "Click a photo... if you can. 😁",
        ]}
        modelUrl="/Models/polaroid-layout-transformed.glb"
        position={Position.Right}
        scene={
          <PhotoVortexScene modelUrl="/Models/polaroid-layout-transformed.glb" />
        }
      />
    </NavigationArrows>
  );
}
