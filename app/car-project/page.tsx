import NavigationArrows from "@/Components/NavigationArrows";
import Showcase from "@/Components/Pages/Showcase";
import { Position } from "@/Components/Lead";
import { CarProjectScene } from "@/Components/Scenes/LegacyShowcaseScenes";

export default function CarProjectPage() {
  return (
    <NavigationArrows>
      <Showcase
        title="Sensors and cameras for my car."
        description={[
          "Replaced the head unit with a touchscreen, then expanded the project with four cameras and two compact LIDAR modules for parking assistance.",
          "An ESP32 manages video and range processing, while DPDT switches provide immediate camera-feed control.",
        ]}
        modelUrl="/Models/caritems-carousel.glb"
        badge="Just for fun"
        position={Position.Left}
        scene={<CarProjectScene modelUrl="/Models/caritems-carousel.glb" />}
      />
    </NavigationArrows>
  );
}
