import { ReactNode } from "react";
import Lead, { Position } from "../Lead";
import ShowcaseScene from "../Scenes/ShowcaseScene";
import { SceneInspectorProvider } from "../SceneInspector";

interface ShowcaseProps {
  title: string;
  description: string[];
  modelUrl: string;
  position?: Position;
  scene?: ReactNode;
  leadOnDark?: boolean;
  defaultNormalScale?: number;
  badge?: string;
}

export default function Showcase({
  title,
  description,
  modelUrl,
  position = Position.Left,
  scene,
  leadOnDark = false,
  defaultNormalScale,
  badge,
}: ShowcaseProps) {
  return (
    <SceneInspectorProvider
      modelUrl={modelUrl}
      label={title}
      defaultNormalScale={defaultNormalScale}
    >
      <section className="relative h-full min-h-[40em]">
        <div className="pointer-events-none relative z-10 h-full">
          <Lead
            header={title}
            description={description}
            position={position}
            onDark={leadOnDark}
            badge={badge}
          />
        </div>
        {scene ?? <ShowcaseScene modelUrl={modelUrl} />}
      </section>
    </SceneInspectorProvider>
  );
}
