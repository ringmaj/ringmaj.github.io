import { Environment } from "@react-three/drei";

export default function NeutralEnvironment({
  intensity = 1,
}: {
  intensity?: number;
}) {
  return (
    <Environment
      files="/Images/neutral.hdr"
      environmentIntensity={intensity}
    />
  );
}
