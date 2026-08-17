"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

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

const FILES = [
  "app",
  "next.config.mjs",
  "package.json",
  "postcss.config.js",
  "public",
  "Components",
  "introduction.sh",
  "pnpm-lock.yaml",
  "projects.txt",
  "resume.pdf",
  "next-env.d.ts",
  "pnpm-workspace.yaml",
  "README.md",
  "scripts",
  "skills.txt",
];
const DIRECTORIES = new Set([
  "app",
  "Components",
  "node_modules",
  "public",
  "scripts",
]);
const SKILLS = [
  "TypeScript / React / Next.js / R3F",
  "C / C++ / Python / embedded systems",
  "Linux / Docker / CI/CD / cloud platforms",
];
const PROJECTS = [
  "Amazon Leo satellite integration and test",
  "Spacecraft simulation and processing automation",
  "APG-79 / APG-82 AESA radar mission software",
  "MFD (Multi Functional Display) software + RSIL HIL validation",
  "AI, data analytics, and cybersecurity platforms",
  "Privacy-preserving identity and compliance systems",
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
    text: "B.S. Computer Science and Engineering · 2018",
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

type TerminalSnapshot = {
  lines: TerminalLine[];
  activeLineId: number | null;
};

const SERVER_TERMINAL_SNAPSHOT: TerminalSnapshot = {
  lines: [],
  activeLineId: null,
};

let terminalSnapshot: TerminalSnapshot = SERVER_TERMINAL_SNAPSHOT;
let terminalStarted = false;
let terminalRunId = 0;
const terminalListeners = new Set<() => void>();

function subscribeToTerminal(listener: () => void) {
  terminalListeners.add(listener);
  return () => terminalListeners.delete(listener);
}

function getTerminalSnapshot() {
  return terminalSnapshot;
}

function getServerTerminalSnapshot() {
  return SERVER_TERMINAL_SNAPSHOT;
}

function updateTerminalSnapshot(
  update: (current: TerminalSnapshot) => TerminalSnapshot,
) {
  terminalSnapshot = update(terminalSnapshot);
  terminalListeners.forEach((listener) => listener());
}

function runTerminalSession() {
  const runId = ++terminalRunId;
  terminalStarted = true;
  let nextId = 0;
  const isCurrentRun = () => terminalRunId === runId;
  const sleep = (duration: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, duration));

  const setLines = (
    update: (current: TerminalLine[]) => TerminalLine[],
  ) => {
    if (!isCurrentRun()) return;
    updateTerminalSnapshot((current) => ({
      ...current,
      lines: update(current.lines),
    }));
  };

  const setActiveLineId = (activeLineId: number | null) => {
    if (!isCurrentRun()) return;
    updateTerminalSnapshot((current) => ({ ...current, activeLineId }));
  };

  const append = (line: TerminalLine) => {
    setLines((current) => [...current, line]);
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
      if (!isCurrentRun()) return;
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
    updateTerminalSnapshot(() => ({ lines: [], activeLineId: null }));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updateTerminalSnapshot(() => ({
        lines: COMPLETE_SESSION,
        activeLineId: COMPLETE_SESSION.at(-1)?.id ?? null,
      }));
      return;
    }

    await sleep(550);
    if (!isCurrentRun()) return;
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
    await typeLine("field", "B.S. Computer Science and Engineering · 2018", {
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

    if (!isCurrentRun()) return;
    const finalId = ++nextId;
    append({ id: finalId, kind: "command", text: "" });
    setActiveLineId(finalId);
  };

  void run();
}

function ensureTerminalSession() {
  if (!terminalStarted) runTerminalSession();
}

function Prompt() {
  return (
    <span aria-hidden="true" className="select-none">
      <span className="text-[#a8e06c]">ring@cloud</span>
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
      <div className="min-h-[1.35em] whitespace-pre-wrap text-white">
        <Prompt />
        <span>{line.text}</span>
        {active && <TerminalCursor />}
      </div>
    );
  }

  if (line.kind === "field") {
    return (
      <div className="grid min-h-[1.35em] grid-cols-[8.75rem_minmax(0,1fr)] gap-x-3">
        <span className="text-white/45">{line.label}:</span>
        <span className="min-w-0 text-white">
          {line.text}
          {active && <TerminalCursor />}
        </span>
      </div>
    );
  }

  const itemColor =
    line.kind === "skills" ? "text-[#72d6c9]" : "text-[#ffc26f]";

  return (
    <div
      className={`grid gap-y-0 ${
        line.kind === "files"
          ? "grid-cols-2 gap-x-3 sm:grid-cols-[13ch_19ch_14ch_17ch_10ch] sm:gap-x-2"
          : "grid-cols-1"
      } ${itemColor}`}
    >
      {line.items.map((item) => (
        <span
          key={item}
          className={`min-h-[1.35em] whitespace-nowrap ${
            line.kind === "files"
              ? DIRECTORIES.has(item)
                ? "font-semibold text-[#54e879]"
                : "text-white/70"
              : ""
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function Terminal() {
  const { lines, activeLineId } = useSyncExternalStore(
    subscribeToTerminal,
    getTerminalSnapshot,
    getServerTerminalSnapshot,
  );
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureTerminalSession();
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [activeLineId, lines]);

  return (
    <div
      id="terminal-container"
      className="terminal-font mx-auto w-full min-w-0 max-w-[43rem] overflow-hidden rounded-xl bg-[#111316] shadow-[0_24px_70px_rgba(0,0,0,0.22)] max-sm:shadow-none"
      role="region"
      aria-label="Animated portfolio terminal"
    >
      <div
        id="status-bar"
        className="relative flex h-10 w-full items-center bg-[#111316] px-4"
      >
        <ul aria-hidden="true" className="flex items-center gap-2">
          <li className="size-3 rounded-full border border-black/10 bg-[#ff5f57]" />
          <li className="size-3 rounded-full border border-black/10 bg-[#febc2e]" />
          <li className="size-3 rounded-full border border-black/10 bg-[#28c840]" />
        </ul>
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[0.68rem] text-white">
          ring@cloud — zsh
        </span>
        <button
          type="button"
          onClick={runTerminalSession}
          className="ml-auto grid size-7 place-items-center rounded-md text-base text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
          aria-label="Replay terminal session"
          title="Replay terminal session"
        >
          ↻
        </button>
      </div>
      <div
        ref={bodyRef}
        id="terminal-body"
        className="h-[clamp(22rem,52vh,29rem)] overflow-y-auto px-[1.125rem] py-5 text-[clamp(0.66rem,0.72vw,0.73rem)] leading-[1.35] tracking-normal text-white/90 [scrollbar-color:#3f4650_transparent] [scrollbar-width:thin] max-sm:h-full max-sm:min-h-0 max-sm:px-3 max-sm:py-3 max-sm:text-[0.58rem]"
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
