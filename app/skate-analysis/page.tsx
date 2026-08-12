import NavigationArrows from "@/Components/NavigationArrows";
import Showcase from "@/Components/Pages/Showcase";
import { SkateAnalysisScene } from "@/Components/Scenes/SkateAnalysisScene";

export default function SkateAnalysisPage() {
  return (
    <NavigationArrows>
      <Showcase
        title="Analysis tools with expressive interfaces."
        description={[
          "Designed an OpenGL application to simulate and analyze skateboarding tricks in 3D.",
          "The system combined custom interlocking parts, gravity simulation, Bezier and Lagrange interpolation, and environmental interaction.",
        ]}
        modelUrl="/Models/skate.glb"
        badge="Just for fun"
        scene={<SkateAnalysisScene modelUrl="/Models/skate.glb" />}
      />
    </NavigationArrows>
  );
}
