import Image from "next/image";
import Lead from "../Lead";
import { PCB_MODEL_URL } from "../Models/PCBModel";
import { SceneInspectorProvider } from "../SceneInspector";
import PCBScene from "../Scenes/PCBScene";

const header = "Designed a desktop PCB etcher.";
const description = [
  "A complete hardware and software system for rapid PCB prototyping and small-scale production, designed and modeled in Fusion 360 for stable, repeatable etching.",
  "An ESP32 coordinates the motor, timing, power regulation, and TFT interface through a custom control board.",
  "The embedded C/C++ software manages motion sequences and real-time status while keeping the controls responsive throughout an etch cycle.",
];

export default function PCB() {
  return (
    <SceneInspectorProvider modelUrl={PCB_MODEL_URL} label="DIY PCB Etcher">
      <div className="relative h-full w-full !min-h-[40em]">
        <Lead header={header} description={description} badge="Just for fun" />
        <figure className="absolute left-[42%] top-10 z-0 w-[30%] overflow-hidden rounded-lg border border-black/10 bg-[#f5f5f5] shadow-[0_12px_28px_rgba(0,0,0,0.08)] max-sm:hidden">
          <div className="relative aspect-[1.5/1] w-full bg-white">
            <Image
              src="/Images/PCB_Shaker.png"
              alt="Fusion 360 bisected view of the desktop PCB etcher"
              fill
              sizes="(max-width: 1200px) 30vw, 360px"
              className="object-contain p-3"
              priority
            />
          </div>
          <figcaption className="border-t border-black/10 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-black/55">
            Fusion 360 · Inspect assembly view
          </figcaption>
        </figure>
      </div>
      <PCBScene />
    </SceneInspectorProvider>
  );
}
