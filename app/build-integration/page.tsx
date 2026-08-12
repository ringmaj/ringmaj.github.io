import NavigationArrows from "@/Components/NavigationArrows";
import Showcase from "@/Components/Pages/Showcase";
import { BuildIntegrationScene } from "@/Components/Scenes/LegacyShowcaseScenes";

export default function BuildIntegrationPage() {
  return (
    <NavigationArrows>
      <Showcase
        title="Build integration in under a minute."
        description={[
          "Spearheaded an internal system for processing mission files, reducing integration wait time from two to three days to less than a minute.",
          "Led research, vendor testing, automation, and DevOps integration so teams could generate stable mission files consistently and on demand.",
        ]}
        modelUrl="/Models/senior-transformed.glb"
        scene={
          <BuildIntegrationScene modelUrl="/Models/senior-transformed.glb" />
        }
      />
    </NavigationArrows>
  );
}
