import NavigationArrows from "@/Components/NavigationArrows";
import Showcase from "@/Components/Pages/Showcase";
import { WorkspaceScene } from "@/Components/Scenes/LegacyShowcaseScenes";

export default function WorkspacePage() {
  return (
    <NavigationArrows>
      <Showcase
        title="My humble abode."
        description={[
          "A quiet home office with maximum desk room and the tools to move comfortably between embedded systems, full-stack development, and creative work.",
          "The 3D scene is interactive. Drag to orbit and scroll to inspect the workspace.",
        ]}
        modelUrl="/Models/workdesk-window-transformed.glb"
        scene={
          <WorkspaceScene modelUrl="/Models/workdesk-window-transformed.glb" />
        }
      />
    </NavigationArrows>
  );
}
