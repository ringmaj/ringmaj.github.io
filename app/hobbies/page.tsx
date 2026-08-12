import NavigationArrows from "@/Components/NavigationArrows";
import Showcase from "@/Components/Pages/Showcase";
import { HobbiesScene } from "@/Components/Scenes/LegacyShowcaseScenes";

export default function HobbiesPage() {
  return (
    <NavigationArrows>
      <Showcase
        title="A few hobbies here and there."
        description={[
          "Cruising, basketball, photography, digital art, and making things that mix software with the physical world.",
          "I am usually up for anything creative, technical, or fun.",
        ]}
        modelUrl="/Models/macbook-transformed.glb"
        scene={<HobbiesScene modelUrl="/Models/macbook-transformed.glb" />}
      />
    </NavigationArrows>
  );
}
