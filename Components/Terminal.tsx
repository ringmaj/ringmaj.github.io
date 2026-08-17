"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";

type TerminalLine =
  | {
      id: number;
      kind: "command";
      text: string;
      directory?: string;
    }
  | {
      id: number;
      kind: "files" | "skills" | "projects";
      items: string[];
      directories?: string[];
    }
  | {
      id: number;
      kind: "field";
      label: string;
      text: string;
    }
  | {
      id: number;
      kind: "output";
      text: string;
      tone?: "default" | "error" | "muted" | "success";
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
const HELP_SUMMARY =
  "Available commands: cd, ls, cat, open, pwd, whoami, date, echo, history, clear, help";
const HELP_ALIASES = "Help aliases: commands, ?";
const HELP_PATH_HINT =
  "Paths support ., .., ~, and absolute project paths. Try `cd app`, `ls`, then `cat page.tsx`.";
const TERMINAL_COMMANDS = [
  "cd",
  "ls",
  "cat",
  "open",
  "pwd",
  "whoami",
  "date",
  "echo",
  "history",
  "clear",
  "help",
  "commands",
  "?",
];
const HOME_PATH = "/home/ring/portfolio";

type VirtualFile = {
  contents?: string;
  binaryLabel?: string;
  openPath?: string;
  executable?: boolean;
};

const VIRTUAL_DIRECTORIES = new Map<string, string[]>([
  ["", FILES],
  ["app", ["globals.css", "layout.tsx", "page.tsx"]],
  [
    "Components",
    ["Pages", "Scenes", "PageNavigationController.tsx", "Terminal.tsx"],
  ],
  ["Components/Pages", ["AboutMe.tsx", "Overview.tsx"]],
  ["Components/Scenes", ["SkateAnalysisScene.tsx", "WorkspaceScene.tsx"]],
  ["public", ["Fonts", "Images", "Models", "Henry_Ring_Resume.pdf"]],
  ["public/Fonts", []],
  ["public/Images", []],
  ["public/Models", []],
  ["scripts", ["optimize-models.mjs"]],
]);

const VIRTUAL_FILES = new Map<string, VirtualFile>([
  [
    "next.config.mjs",
    {
      contents:
        'const nextConfig = {\n  allowedDevOrigins: ["192.168.4.40"],\n};\n\nexport default nextConfig;',
    },
  ],
  [
    "package.json",
    {
      contents:
        '{\n  "name": "next-portfolio",\n  "private": true,\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build"\n  }\n}',
    },
  ],
  [
    "postcss.config.js",
    { contents: 'export default { plugins: { "@tailwindcss/postcss": {} } };' },
  ],
  [
    "introduction.sh",
    {
      contents:
        '#!/bin/zsh\nprintf "Name: Henry Ring\\n"\nprintf "Focus: Full-stack / embedded / DevOps\\n"',
      executable: true,
    },
  ],
  ["pnpm-lock.yaml", { contents: "lockfileVersion: '9.0'" }],
  ["projects.txt", { contents: PROJECTS.join("\n") }],
  [
    "resume.pdf",
    {
      binaryLabel: "PDF document",
      openPath: "/Henry_Ring_Resume.pdf",
    },
  ],
  [
    "next-env.d.ts",
    {
      contents:
        '/// <reference types="next" />\n/// <reference types="next/image-types/global" />',
    },
  ],
  ["pnpm-workspace.yaml", { contents: "packages:\n  - ." }],
  [
    "README.md",
    {
      contents:
        "# Henry Ring Portfolio\n\nAn interactive Next.js and React Three Fiber portfolio.",
    },
  ],
  ["skills.txt", { contents: SKILLS.join("\n") }],
  ["app/globals.css", { contents: "@import \"tailwindcss\";" }],
  [
    "app/layout.tsx",
    { contents: "export default function RootLayout({ children }) { return children; }" },
  ],
  ["app/page.tsx", { contents: 'export { default } from "@/Components/Home";' }],
  [
    "Components/PageNavigationController.tsx",
    { contents: "// Smooth page-to-page carousel navigation controller." },
  ],
  ["Components/Terminal.tsx", { contents: "// Interactive portfolio terminal." }],
  ["Components/Pages/AboutMe.tsx", { contents: "// About and technical skills page." }],
  ["Components/Pages/Overview.tsx", { contents: "// Interactive terminal overview page." }],
  [
    "Components/Scenes/SkateAnalysisScene.tsx",
    { contents: "// Motion-curve skateboard analysis scene." },
  ],
  ["Components/Scenes/WorkspaceScene.tsx", { contents: "// Interactive workspace scene." }],
  [
    "public/Henry_Ring_Resume.pdf",
    {
      binaryLabel: "PDF document",
      openPath: "/Henry_Ring_Resume.pdf",
    },
  ],
  ["scripts/optimize-models.mjs", { contents: "// Model optimization pipeline." }],
]);
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
  { id: 12, kind: "command", text: "commands" },
  { id: 13, kind: "output", text: HELP_SUMMARY, tone: "success" },
  { id: 14, kind: "output", text: HELP_ALIASES, tone: "muted" },
  { id: 15, kind: "output", text: HELP_PATH_HINT, tone: "muted" },
];

type TerminalSnapshot = {
  lines: TerminalLine[];
  activeLineId: number | null;
  interactive: boolean;
  currentDirectory: string;
  previousDirectory: string | null;
};

const SERVER_TERMINAL_SNAPSHOT: TerminalSnapshot = {
  lines: [],
  activeLineId: null,
  interactive: false,
  currentDirectory: "",
  previousDirectory: null,
};

let terminalSnapshot: TerminalSnapshot = SERVER_TERMINAL_SNAPSHOT;
let terminalStarted = false;
let terminalRunId = 0;
let interactiveLineId = 1000;
const terminalCommandHistory: string[] = [];
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

function nextInteractiveLineId() {
  interactiveLineId += 1;
  return interactiveLineId;
}

function outputLine(
  text: string,
  tone: Extract<TerminalLine, { kind: "output" }>["tone"] = "default",
): TerminalLine {
  return { id: nextInteractiveLineId(), kind: "output", text, tone };
}

function normalizeVirtualPath(path: string, currentDirectory: string) {
  const expandedPath = path.startsWith(HOME_PATH)
    ? path.slice(HOME_PATH.length)
    : path;
  const absolute =
    expandedPath === "~" ||
    expandedPath.startsWith("~/") ||
    expandedPath.startsWith("/");
  const pathWithoutRoot = expandedPath
    .replace(/^~\/?/, "")
    .replace(/^\/+/, "");
  const segments = absolute
    ? []
    : currentDirectory.split("/").filter(Boolean);

  for (const segment of pathWithoutRoot.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }

  return segments.join("/");
}

function displayAbsolutePath(directory: string) {
  return directory ? `${HOME_PATH}/${directory}` : HOME_PATH;
}

function displayPromptPath(directory: string) {
  return directory ? `~/${directory}` : "~";
}

function getVirtualEntry(path: string) {
  if (VIRTUAL_DIRECTORIES.has(path)) {
    return { kind: "directory" as const, items: VIRTUAL_DIRECTORIES.get(path) ?? [] };
  }
  const file = VIRTUAL_FILES.get(path);
  return file ? { kind: "file" as const, file } : null;
}

function getDirectoryNames(path: string, items: string[]) {
  return items.filter((item) => {
    const childPath = path ? `${path}/${item}` : item;
    return VIRTUAL_DIRECTORIES.has(childPath);
  });
}

function getCanonicalVirtualDirectory(path: string) {
  if (VIRTUAL_DIRECTORIES.has(path)) return path;
  let canonicalPath = "";

  for (const segment of path.split("/").filter(Boolean)) {
    const items = VIRTUAL_DIRECTORIES.get(canonicalPath);
    const canonicalSegment = items?.find((item) => {
      const childPath = canonicalPath ? `${canonicalPath}/${item}` : item;
      return (
        item.toLowerCase() === segment.toLowerCase() &&
        VIRTUAL_DIRECTORIES.has(childPath)
      );
    });
    if (!canonicalSegment) return null;
    canonicalPath = canonicalPath
      ? `${canonicalPath}/${canonicalSegment}`
      : canonicalSegment;
  }

  return canonicalPath;
}

type CompletionOption = {
  value: string;
  cursor: number;
};

function getTerminalCompletions(
  value: string,
  cursor: number,
  currentDirectory: string,
): CompletionOption[] {
  const beforeCursor = value.slice(0, cursor);
  const afterCursor = value.slice(cursor);
  const token = beforeCursor.match(/[^\s]*$/)?.[0] ?? "";
  const tokenStart = beforeCursor.length - token.length;
  const precedingInput = beforeCursor.slice(0, tokenStart);
  const command = precedingInput.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

  const replaceToken = (replacement: string): CompletionOption => ({
    value: `${value.slice(0, tokenStart)}${replacement}${afterCursor}`,
    cursor: tokenStart + replacement.length,
  });

  if (tokenStart === 0) {
    if (!token.includes("/") && !token.startsWith(".") && token !== "~") {
      return TERMINAL_COMMANDS.filter((candidate) =>
        candidate.startsWith(token.toLowerCase()),
      ).map((candidate) => replaceToken(`${candidate} `));
    }
  } else if (!["cd", "ls", "cat", "open"].includes(command)) {
    return [];
  }

  if (token === "~") return [replaceToken("~/")];
  if (token === ".") return [replaceToken("./")];
  if (token === "..") return [replaceToken("../")];

  const lastSlash = token.lastIndexOf("/");
  const typedParent = lastSlash >= 0 ? token.slice(0, lastSlash + 1) : "";
  const fragment = token.slice(lastSlash + 1);
  const normalizedParentPath = normalizeVirtualPath(
    typedParent || ".",
    currentDirectory,
  );
  const parentPath = getCanonicalVirtualDirectory(normalizedParentPath);
  if (parentPath === null) return [];
  const parent = getVirtualEntry(parentPath);
  if (!parent || parent.kind !== "directory") return [];
  const completionParent =
    normalizedParentPath === parentPath
      ? typedParent
      : parentPath
        ? `~/${parentPath}/`
        : "~/";

  const directoriesOnly = command === "cd";
  return parent.items
    .filter((item) =>
      item.toLowerCase().startsWith(fragment.toLowerCase()),
    )
    .filter((item) => {
      if (!directoriesOnly) return true;
      const childPath = parentPath ? `${parentPath}/${item}` : item;
      return VIRTUAL_DIRECTORIES.has(childPath);
    })
    .sort((left, right) => left.localeCompare(right))
    .map((item) => {
      const childPath = parentPath ? `${parentPath}/${item}` : item;
      const suffix = VIRTUAL_DIRECTORIES.has(childPath) ? "/" : " ";
      return replaceToken(`${completionParent}${item}${suffix}`);
    });
}

function executeTerminalCommand(rawCommand: string) {
  const input = rawCommand.trim();
  const [command = "", ...args] = input.split(/\s+/);
  const normalizedCommand = command.toLowerCase();
  const startingDirectory = terminalSnapshot.currentDirectory;
  let nextDirectory = startingDirectory;
  let nextPreviousDirectory = terminalSnapshot.previousDirectory;
  const append: TerminalLine[] = [
    {
      id: nextInteractiveLineId(),
      kind: "command",
      text: rawCommand,
      directory: startingDirectory,
    },
  ];

  const appendIntroduction = () => {
    append.push(
      {
        id: nextInteractiveLineId(),
        kind: "field",
        label: "Name",
        text: "Henry Ring",
      },
      {
        id: nextInteractiveLineId(),
        kind: "field",
        label: "College",
        text: "University of California, Merced",
      },
      {
        id: nextInteractiveLineId(),
        kind: "field",
        label: "Field of study",
        text: "B.S. Computer Science and Engineering · 2018",
      },
      {
        id: nextInteractiveLineId(),
        kind: "field",
        label: "Focus",
        text: "Full-stack / embedded / DevOps",
      },
    );
  };

  const appendFileContents = (path: string, requestedPath: string) => {
    const entry = getVirtualEntry(path);
    if (!entry) {
      append.push(
        outputLine(`cat: ${requestedPath}: No such file or directory`, "error"),
      );
      return;
    }
    if (entry.kind === "directory") {
      append.push(outputLine(`cat: ${requestedPath}: Is a directory`, "error"));
      return;
    }
    if (path === "skills.txt") {
      append.push({
        id: nextInteractiveLineId(),
        kind: "skills",
        items: SKILLS,
      });
      return;
    }
    if (path === "projects.txt") {
      append.push({
        id: nextInteractiveLineId(),
        kind: "projects",
        items: PROJECTS,
      });
      return;
    }
    if (entry.file.binaryLabel) {
      append.push(
        outputLine(
          `${requestedPath}: ${entry.file.binaryLabel} — use \`open ${requestedPath}\``,
        ),
      );
      return;
    }
    append.push(outputLine(entry.file.contents ?? ""));
  };

  if (!input) {
    updateTerminalSnapshot((current) => ({
      ...current,
      lines: [...current.lines, ...append],
    }));
    return;
  }

  if (normalizedCommand === "clear") {
    updateTerminalSnapshot((current) => ({
      ...current,
      lines: [],
      activeLineId: null,
    }));
    return;
  }

  switch (normalizedCommand) {
    case "help":
    case "commands":
    case "?":
      append.push(
        outputLine(HELP_SUMMARY, "success"),
        outputLine(HELP_ALIASES, "muted"),
        outputLine(HELP_PATH_HINT, "muted"),
      );
      break;
    case "cd": {
      if (args.length > 1) {
        append.push(outputLine("cd: too many arguments", "error"));
        break;
      }
      const requestedPath = args[0] ?? "~";
      if (requestedPath === "-") {
        if (terminalSnapshot.previousDirectory === null) {
          append.push(outputLine("cd: OLDPWD not set", "error"));
          break;
        }
        nextDirectory = terminalSnapshot.previousDirectory;
        nextPreviousDirectory = startingDirectory;
        append.push(outputLine(displayAbsolutePath(nextDirectory)));
        break;
      }
      const resolvedPath = normalizeVirtualPath(
        requestedPath,
        startingDirectory,
      );
      const entry = getVirtualEntry(resolvedPath);
      if (!entry) {
        append.push(
          outputLine(`cd: no such file or directory: ${requestedPath}`, "error"),
        );
      } else if (entry.kind !== "directory") {
        append.push(outputLine(`cd: not a directory: ${requestedPath}`, "error"));
      } else {
        nextDirectory = resolvedPath;
        nextPreviousDirectory = startingDirectory;
      }
      break;
    }
    case "ls": {
      const unsupportedOption = args.find(
        (arg) => arg.startsWith("-") && !/^-([alh]+)$/.test(arg),
      );
      if (unsupportedOption) {
        append.push(
          outputLine(`ls: illegal option -- ${unsupportedOption.slice(1)}`, "error"),
        );
        break;
      }
      const operands = args.filter((arg) => !arg.startsWith("-"));
      if (operands.length > 1) {
        append.push(outputLine("ls: too many paths", "error"));
        break;
      }
      const requestedPath = operands[0] ?? ".";
      const resolvedPath = normalizeVirtualPath(
        requestedPath,
        startingDirectory,
      );
      const entry = getVirtualEntry(resolvedPath);
      if (!entry) {
        append.push(
          outputLine(`ls: ${requestedPath}: No such file or directory`, "error"),
        );
      } else if (entry.kind === "file") {
        append.push(outputLine(requestedPath.split("/").at(-1) ?? requestedPath));
      } else {
        const showHidden = args.some((arg) => arg.includes("a"));
        const items = showHidden ? [".", "..", ...entry.items] : entry.items;
        append.push({
          id: nextInteractiveLineId(),
          kind: "files",
          items,
          directories: [
            ...(showHidden ? [".", ".."] : []),
            ...getDirectoryNames(resolvedPath, entry.items),
          ],
        });
      }
      break;
    }
    case "pwd":
      append.push(outputLine(displayAbsolutePath(startingDirectory)));
      break;
    case "whoami":
      append.push(outputLine("ring"));
      break;
    case "date":
      append.push(outputLine(new Date().toString()));
      break;
    case "echo":
      append.push(outputLine(args.join(" ")));
      break;
    case "history":
      append.push(
        ...terminalCommandHistory.map((entry, index) =>
          outputLine(`${String(index + 1).padStart(3, " ")}  ${entry}`),
        ),
      );
      break;
    case "cat": {
      const requestedFiles = args.filter((arg) => !arg.startsWith("-"));
      if (requestedFiles.length === 0) {
        append.push(outputLine("cat: missing file operand", "error"));
      } else {
        requestedFiles.forEach((requestedPath, index) => {
          if (requestedFiles.length > 1) {
            if (index > 0) append.push(outputLine(""));
            append.push(outputLine(`==> ${requestedPath} <==`, "muted"));
          }
          appendFileContents(
            normalizeVirtualPath(requestedPath, startingDirectory),
            requestedPath,
          );
        });
      }
      break;
    }
    case "open": {
      const requestedPath = args[0];
      if (!requestedPath) {
        append.push(outputLine("open: missing file operand", "error"));
      } else {
        const resolvedPath = normalizeVirtualPath(
          requestedPath,
          startingDirectory,
        );
        const entry = getVirtualEntry(resolvedPath);
        if (!entry) {
          append.push(
            outputLine(
              `open: ${requestedPath}: No such file or directory`,
              "error",
            ),
          );
        } else if (entry.kind === "directory") {
          append.push(
            outputLine("open: folders cannot be opened from this browser terminal", "error"),
          );
        } else if (entry.file.openPath) {
          window.open(entry.file.openPath, "_blank", "noopener,noreferrer");
          append.push(outputLine(`Opening ${requestedPath}…`, "success"));
        } else {
          append.push(
            outputLine(
              `open: ${requestedPath}: no browser viewer is configured`,
              "error",
            ),
          );
        }
      }
      break;
    }
    default: {
      const executablePath = normalizeVirtualPath(command, startingDirectory);
      const executable = VIRTUAL_FILES.get(executablePath);
      if (executable?.executable) appendIntroduction();
      else if (command.includes("/")) {
        append.push(outputLine(`zsh: no such file or directory: ${command}`, "error"));
      } else {
        append.push(outputLine(`zsh: command not found: ${command}`, "error"));
      }
    }
  }

  updateTerminalSnapshot((current) => ({
    ...current,
    lines: [...current.lines, ...append],
    currentDirectory: nextDirectory,
    previousDirectory: nextPreviousDirectory,
  }));
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
    append({
      id: ++nextId,
      kind,
      items,
      directories: kind === "files" ? [...DIRECTORIES] : undefined,
    });
  };

  const run = async () => {
    updateTerminalSnapshot(() => ({
      lines: [],
      activeLineId: null,
      interactive: false,
      currentDirectory: "",
      previousDirectory: null,
    }));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updateTerminalSnapshot(() => ({
        lines: COMPLETE_SESSION,
        activeLineId: null,
        interactive: true,
        currentDirectory: "",
        previousDirectory: null,
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

    await typeLine("command", "commands", { speed: 85 });
    await sleep(260);
    setActiveLineId(null);
    append({ id: ++nextId, kind: "output", text: HELP_SUMMARY, tone: "success" });
    append({ id: ++nextId, kind: "output", text: HELP_ALIASES, tone: "muted" });
    append({ id: ++nextId, kind: "output", text: HELP_PATH_HINT, tone: "muted" });
    await sleep(260);

    if (!isCurrentRun()) return;
    setActiveLineId(null);
    updateTerminalSnapshot((current) => ({
      ...current,
      interactive: true,
    }));
  };

  void run();
}

function ensureTerminalSession() {
  if (!terminalStarted) runTerminalSession();
}

function Prompt({ directory = "" }: { directory?: string }) {
  return (
    <span aria-hidden="true" className="select-none">
      <span className="text-[#a8e06c]">ring@cloud</span>
      <span className="text-white/75">:</span>
      <span className="text-[#69c9ff]">{displayPromptPath(directory)}</span>
      <span className="whitespace-pre text-white/75">$ </span>
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
        <Prompt directory={line.directory} />
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

  if (line.kind === "output") {
    const color = {
      default: "text-white/85",
      error: "text-[#ff7b72]",
      muted: "text-white/45",
      success: "text-[#72d6c9]",
    }[line.tone ?? "default"];

    return (
      <div className={`min-h-[1.35em] whitespace-pre-wrap ${color}`}>
        {line.text}
      </div>
    );
  }

  const itemColor =
    line.kind === "skills" ? "text-[#72d6c9]" : "text-[#ffc26f]";
  const longestFileName =
    line.kind === "files"
      ? Math.max(10, ...line.items.map((item) => item.length))
      : 0;

  return (
    <div
      style={
        line.kind === "files"
          ? {
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${longestFileName + 2}ch), 1fr))`,
            }
          : undefined
      }
      className={`grid gap-y-0 ${
        line.kind === "files"
          ? "gap-x-3"
          : "grid-cols-1"
      } ${itemColor}`}
    >
      {line.items.map((item) => (
        <span
          key={item}
          className={`min-h-[1.35em] whitespace-nowrap ${
            line.kind === "files"
              ? (line.directories ?? [...DIRECTORIES]).includes(item)
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
  const { lines, activeLineId, interactive, currentDirectory } =
    useSyncExternalStore(
    subscribeToTerminal,
    getTerminalSnapshot,
    getServerTerminalSnapshot,
    );
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyIndexRef = useRef(terminalCommandHistory.length);
  const completionCycleRef = useRef<{
    options: CompletionOption[];
    index: number;
    lastValue: string;
  } | null>(null);

  useEffect(() => {
    ensureTerminalSession();
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [activeLineId, interactive, lines]);

  useEffect(() => {
    if (!interactive) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [interactive]);

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const command = input;
    if (command.trim()) terminalCommandHistory.push(command);
    historyIndexRef.current = terminalCommandHistory.length;
    completionCycleRef.current = null;
    executeTerminalCommand(command);
    setInput("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const currentCycle = completionCycleRef.current;
      let options: CompletionOption[];
      let nextIndex = 0;

      if (
        currentCycle &&
        currentCycle.options.length > 1 &&
        currentCycle.lastValue === input
      ) {
        options = currentCycle.options;
        nextIndex = (currentCycle.index + 1) % options.length;
      } else {
        options = getTerminalCompletions(
          input,
          event.currentTarget.selectionStart ?? input.length,
          currentDirectory,
        );
      }

      const completion = options[nextIndex];
      if (!completion) {
        completionCycleRef.current = null;
        return;
      }

      setInput(completion.value);
      completionCycleRef.current = {
        options,
        index: nextIndex,
        lastValue: completion.value,
      };
      window.requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(completion.cursor, completion.cursor);
      });
      return;
    }

    completionCycleRef.current = null;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (terminalCommandHistory.length === 0) return;
      historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
      setInput(terminalCommandHistory[historyIndexRef.current] ?? "");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      historyIndexRef.current = Math.min(
        terminalCommandHistory.length,
        historyIndexRef.current + 1,
      );
      setInput(terminalCommandHistory[historyIndexRef.current] ?? "");
      return;
    }

    if (event.key.toLowerCase() === "l" && event.ctrlKey) {
      event.preventDefault();
      executeTerminalCommand("clear");
      return;
    }

    if (event.key.toLowerCase() === "c" && event.ctrlKey) {
      event.preventDefault();
      updateTerminalSnapshot((current) => ({
        ...current,
        lines: [
          ...current.lines,
          {
            id: nextInteractiveLineId(),
            kind: "command",
            text: `${input}^C`,
            directory: currentDirectory,
          },
        ],
      }));
      setInput("");
    }
  };

  return (
    <div
      id="terminal-container"
      className="terminal-font mx-auto w-full min-w-0 max-w-[43rem] overflow-hidden rounded-xl bg-[#111316] shadow-[0_24px_70px_rgba(0,0,0,0.22)] max-sm:shadow-none"
      role="region"
      aria-label="Interactive portfolio terminal"
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
          onClick={() => {
            setInput("");
            historyIndexRef.current = terminalCommandHistory.length;
            completionCycleRef.current = null;
            runTerminalSession();
          }}
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
        data-page-navigation-scroll=""
        onClick={() => interactive && inputRef.current?.focus()}
        className="h-[clamp(22rem,52vh,29rem)] touch-pan-y overflow-y-auto overscroll-contain px-[1.125rem] py-5 text-[clamp(0.66rem,0.72vw,0.73rem)] leading-[1.35] tracking-normal text-white/90 [scrollbar-color:#3f4650_transparent] [scrollbar-width:thin] max-sm:h-full max-sm:min-h-0 max-sm:px-3 max-sm:py-3 max-sm:text-[0.58rem]"
      >
        {lines.map((line) => (
          <TerminalLineView
            key={line.id}
            line={line}
            active={activeLineId === line.id}
          />
        ))}
        {interactive && (
          <form
            onSubmit={submitCommand}
            className="flex min-h-[1.35em] w-full items-baseline text-white"
          >
            <Prompt directory={currentDirectory} />
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => {
                completionCycleRef.current = null;
                setInput(event.target.value);
              }}
              onKeyDown={handleInputKeyDown}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 [font:inherit] text-inherit caret-white outline-none"
              aria-label="Terminal command"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </form>
        )}
      </div>
    </div>
  );
}
