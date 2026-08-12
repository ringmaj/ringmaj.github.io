"use client";

import { useEffect, useRef, useState } from "react";

type TerminalLine =
  | {
      id: number;
      kind: "command";
      text: string;
    }
  | {
      id: number;
      kind: "files" | "skills" | "projects";
      items: string[];
    }
  | {
      id: number;
      kind: "field";
      label: string;
      text: string;
    };

const FILES = ["introduction.sh", "resume.pdf", "skills.txt", "projects.txt"];
const SKILLS = [
  "TypeScript / React / Next.js / R3F",
  "C / C++ / Python / embedded systems",
  "Linux / Docker / CI/CD / cloud platforms",
];
const PROJECTS = [
  "LEO satellite integration and test",
  "AESA radar mission software",
  "Interactive 3D engineering portfolio",
];

const COMPLETE_SESSION: TerminalLine[] = [
  { id: 1, kind: "command", text: "ls" },
  { id: 2, kind: "files", items: FILES },
  { id: 3, kind: "command", text: "./introduction.sh" },
  { id: 4, kind: "field", label: "Name", text: "Henry Ring" },
  {
    id: 5,
    kind: "field",
    label: "College",
    text: "University of California, Merced",
  },
  {
    id: 6,
    kind: "field",
    label: "Field of study",
    text: "B.S. Computer Science and Engineering",
  },
  {
    id: 7,
    kind: "field",
    label: "Focus",
    text: "Full-stack / embedded / DevOps",
  },
  { id: 8, kind: "command", text: "cat skills.txt" },
  { id: 9, kind: "skills", items: SKILLS },
  { id: 10, kind: "command", text: "cat projects.txt" },
  { id: 11, kind: "projects", items: PROJECTS },
  { id: 12, kind: "command", text: "" },
];

function Prompt() {
  return (
    <span aria-hidden="true" className="select-none">
      <span className="text-[#a8e06c]">ring@portfolio</span>
      <span className="text-white/75">:</span>
      <span className="text-[#69c9ff]">~</span>
      <span className="text-white/75">$ </span>
    </span>
  );
}

function TerminalCursor() {
  return (
    <span
      aria-hidden="true"
      className="terminal-cursor ml-[0.12rem] inline-block h-[1.05em] w-[0.52em] translate-y-[0.16em] bg-white/90"
    />
  );
}

function TerminalLineView({
  line,
  active,
}: {
  line: TerminalLine;
  active: boolean;
}) {
  if (line.kind === "command") {
    return (
      <div className="min-h-[1.25em] whitespace-pre-wrap text-white">
        <Prompt />
        <span>{line.text}</span>
        {active && <TerminalCursor />}
      </div>
    );
  }

  if (line.kind === "field") {
    return (
      <div className="grid min-h-[1.25em] grid-cols-[8.75rem_minmax(0,1fr)] gap-x-3">
        <span className="text-white/45">{line.label}:</span>
        <span className="min-w-0 text-white">
          {line.text}
          {active && <TerminalCursor />}
        </span>
      </div>
    );
  }

  const itemColor =
    line.kind === "files"
      ? "text-[#aaaaff]"
      : line.kind === "skills"
        ? "text-[#72d6c9]"
        : "text-[#ffc26f]";

  return (
    <div
      className={`mb-[0.25rem] grid gap-x-4 gap-y-0 ${
        line.kind === "files" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1"
      } ${itemColor}`}
    >
      {line.items.map((item) => (
        <span key={item} className="min-h-[1.25em] truncate">
          {item}
        </span>
      ))}
    </div>
  );
}

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  const [session, setSession] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let nextId = 0;
    const timers = new Set<number>();

    const sleep = (duration: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, duration);
        timers.add(timer);
      });

    const append = (line: TerminalLine) => {
      if (!cancelled) setLines((current) => [...current, line]);
    };

    const typeLine = async (
      kind: "command" | "field",
      value: string,
      options?: { label?: string; speed?: number },
    ) => {
      const id = ++nextId;
      const speed = options?.speed ?? 42;
      const line: TerminalLine =
        kind === "command"
          ? { id, kind, text: "" }
          : { id, kind, label: options?.label ?? "", text: "" };
      append(line);
      setActiveLineId(id);

      for (let index = 1; index <= value.length; index += 1) {
        const character = value[index - 1];
        const punctuationPause = /[./]/.test(character) ? 18 : 0;
        await sleep(speed + punctuationPause);
        if (cancelled) return;
        setLines((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, text: value.slice(0, index) } : entry,
          ),
        );
      }

    };

    const appendItems = (
      kind: "files" | "skills" | "projects",
      items: string[],
    ) => {
      setActiveLineId(null);
      append({ id: ++nextId, kind, items });
    };

    const run = async () => {
      setLines([]);
      setActiveLineId(null);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setLines(COMPLETE_SESSION);
        setActiveLineId(COMPLETE_SESSION.at(-1)?.id ?? null);
        return;
      }

      await sleep(550);
      await typeLine("command", "ls", { speed: 115 });
      await sleep(260);
      appendItems("files", FILES);
      await sleep(520);

      await typeLine("command", "./introduction.sh");
      await sleep(420);
      await typeLine("field", "Henry Ring", { label: "Name", speed: 34 });
      await sleep(240);
      await typeLine("field", "University of California, Merced", {
        label: "College",
        speed: 21,
      });
      await sleep(240);
      await typeLine("field", "B.S. Computer Science and Engineering", {
        label: "Field of study",
        speed: 20,
      });
      await sleep(240);
      await typeLine("field", "Full-stack / embedded / DevOps", {
        label: "Focus",
        speed: 22,
      });
      await sleep(450);

      await typeLine("command", "cat skills.txt");
      await sleep(260);
      appendItems("skills", SKILLS);
      await sleep(650);

      await typeLine("command", "cat projects.txt");
      await sleep(260);
      appendItems("projects", PROJECTS);
      await sleep(520);

      const finalId = ++nextId;
      append({ id: finalId, kind: "command", text: "" });
      setActiveLineId(finalId);
    };

    void run();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [session]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [activeLineId, lines]);

  return (
    <div
      id="terminal-container"
      className="mx-auto w-full min-w-0 max-w-[43rem] overflow-hidden rounded-xl border border-black/15 bg-[#111316] shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
      role="region"
      aria-label="Animated portfolio terminal"
    >
      <div
        id="status-bar"
        className="relative flex h-10 w-full items-center border-b border-black/10 bg-[#e7e7e7] px-4"
      >
        <ul aria-hidden="true" className="flex items-center gap-2">
          <li className="size-3 rounded-full border border-black/10 bg-[#ff5f57]" />
          <li className="size-3 rounded-full border border-black/10 bg-[#febc2e]" />
          <li className="size-3 rounded-full border border-black/10 bg-[#28c840]" />
        </ul>
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-mono text-[0.68rem] font-medium text-black/55">
          ring@portfolio — zsh
        </span>
        <button
          type="button"
          onClick={() => setSession((value) => value + 1)}
          className="ml-auto grid size-7 place-items-center rounded-md font-mono text-base text-black/45 transition hover:bg-black/10 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black"
          aria-label="Replay terminal session"
          title="Replay terminal session"
        >
          ↻
        </button>
      </div>
      <div
        ref={bodyRef}
        id="terminal-body"
        className="h-[clamp(22rem,52vh,29rem)] overflow-y-auto bg-[radial-gradient(circle_at_80%_0%,#17202b_0%,#0d0f12_42%,#08090b_100%)] px-[1.125rem] py-4 font-mono text-[clamp(0.72rem,0.82vw,0.8rem)] leading-[1.35] tracking-[-0.01em] text-white/90 [scrollbar-color:#3f4650_transparent] [scrollbar-width:thin]"
      >
        {lines.map((line) => (
          <TerminalLineView
            key={line.id}
            line={line}
            active={activeLineId === line.id}
          />
        ))}
      </div>
    </div>
  );
}
