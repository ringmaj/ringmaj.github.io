import Image from "next/image";
import React from "react";
import type { IconType } from "react-icons";
import {
  FaAws,
  FaChartLine,
  FaCubes,
  FaDatabase,
  FaKey,
  FaNetworkWired,
  FaRoute,
  FaServer,
  FaSlidersH,
  FaTable,
} from "react-icons/fa";
import { IoLogoAmplify } from "react-icons/io5";
import { SiDocker, SiVercel } from "react-icons/si";
import { TbLambda } from "react-icons/tb";
import { VscAzure } from "react-icons/vsc";

const groups: string[] = [
  "Programming",
  "Technical Skills",
  "AWS & Cloud Development",
  "Workflows",
  "Creativity",
];
type Skill = {
  skill: string;
  logo?: string;
  icon?: IconType;
  color?: string;
};

const skills: Record<string, Skill[]> = {
  ["Programming"]: [
    { skill: "Python", logo: "/Images/Icons/icons8-python.svg" },
    { skill: "C", logo: "/Images/Icons/icons8-c-programming.svg" },
    { skill: "C++", logo: "/Images/Icons/icons8-cpp.svg" },
    { skill: "C#", logo: "/Images/Icons/icons8-c-sharp-logo.svg" },
    { skill: "JavaScript", logo: "/Images/Icons/icons8-javascript.svg" },
    { skill: "React", logo: "/Images/Icons/icons8-react-native.svg" },
    { skill: "React Native", logo: "/Images/Icons/icons8-react-native.svg" },
    { skill: "HTML/CSS", logo: "/Images/Icons/icons8-code-html-48.png" },
    {
      skill: "Ada",
      logo: "/Images/Icons/Ada.png",
    },
    { skill: "MATLAB", logo: "/Images/Icons/icons8-matlab.svg" },
    { skill: "Java", logo: "/Images/Icons/icons8-java.svg" },
    { skill: "SQL", logo: "/Images/Icons/database-svgrepo-com.svg" },
    { skill: "OpenGL", logo: "/Images/Icons/opengl-svgrepo-com.svg" },
    { skill: "VB.NET", logo: "/Images/Icons/vb.svg" },
  ],
  "Technical Skills": [
    { skill: "Linux", logo: "/Images/Icons/tux.png" },
    { skill: "Git", logo: "/Images/Icons/Git-Icon.svg" },
    { skill: "Jenkins", logo: "/Images/Icons/icons8-jenkins.svg" },
    { skill: "Autodesk", logo: "/Images/Icons/Autodesk.png" },
    {
      skill: "Android Studio",
      logo: "/Images/Icons/icons8-android-studio.svg",
    },
    { skill: "LibGDX", logo: "/Images/Icons/LibGDX.png" },
    { skill: "Integrity RTOS", logo: "/Images/Icons/green-hills-logo.png" },
    { skill: "VxWorks RTOS", logo: "/Images/Icons/VxWorks.png" },
  ],
  "AWS & Cloud Development": [
    { skill: "AWS", icon: FaAws, color: "#ff9900" },
    { skill: "EC2", icon: FaServer, color: "#ff9900" },
    { skill: "S3", icon: FaDatabase, color: "#569a31" },
    { skill: "Lambda", icon: TbLambda, color: "#ff9900" },
    { skill: "ECS", icon: FaCubes, color: "#ff9900" },
    { skill: "CloudWatch", icon: FaChartLine, color: "#759c3e" },
    { skill: "Amplify", icon: IoLogoAmplify, color: "#ff9900" },
    { skill: "AppSync", icon: FaNetworkWired, color: "#8c4fff" },
    { skill: "DynamoDB", icon: FaTable, color: "#527fff" },
    { skill: "Route 53", icon: FaRoute, color: "#8c4fff" },
    { skill: "Secrets Manager", icon: FaKey, color: "#dd344c" },
    { skill: "SSM", icon: FaSlidersH, color: "#e7157b" },
    { skill: "Vercel", icon: SiVercel, color: "#000000" },
    { skill: "Docker", icon: SiDocker, color: "#2496ed" },
    { skill: "Azure", icon: VscAzure, color: "#0078d4" },
  ],
  ["Workflows"]: [
    { skill: "Jira", logo: "/Images/Icons/icons8-jira.svg" },
    { skill: "Confluence", logo: "/Images/Icons/icons8-confluence.svg" },
    { skill: "BitBucket", logo: "/Images/Icons/icons8-bitbucket.svg" },
    { skill: "Crucible", logo: "/Images/Icons/crucible-svgrepo-com.svg" },
    { skill: "Agile", logo: "/Images/Icons/icons8-agile-64.png" },
  ],
  ["Creativity"]: [
    { skill: "Photoshop", logo: "/Images/Icons/icons8-adobe-photoshop.svg" },
    {
      skill: "Illustrator",
      logo: "/Images/Icons/icons8-adobe-illustrator.svg",
    },
    {
      skill: "After Effects",
      logo: "/Images/Icons/icons8-adobe-after-effects.svg",
    },
    { skill: "Blender", logo: "/Images/Icons/icons8-blender-3d.svg" },
  ],
};

const skillDescriptions: Record<string, string> = {
  Python: "Automation, backend services, data processing, and engineering tools.",
  C: "Low-level software for embedded and resource-constrained systems.",
  "C++": "High-performance applications, simulation, and systems programming.",
  "C#": "Application development across the .NET ecosystem.",
  JavaScript: "Interactive web applications and full-stack product development.",
  React: "Component-driven interfaces for responsive web applications.",
  "React Native": "Cross-platform mobile applications built with React patterns.",
  "HTML/CSS": "Semantic interfaces, responsive layouts, and polished visual systems.",
  Ada: "Reliable, strongly typed software for safety-critical environments.",
  MATLAB: "Numerical analysis, modeling, visualization, and algorithm prototyping.",
  Java: "Portable application development and object-oriented systems.",
  SQL: "Relational data modeling, querying, and database integration.",
  OpenGL: "Real-time graphics, visualization, and interactive 3D tooling.",
  "VB.NET": "Desktop and enterprise applications within the .NET platform.",
  Linux: "Development, deployment, scripting, and systems administration.",
  Git: "Source control, collaborative development, and release management.",
  Jenkins: "Automated CI/CD pipelines, builds, testing, and deployments.",
  Autodesk: "CAD modeling, mechanical design, and engineering visualization.",
  "Android Studio": "Native Android development, debugging, and device tooling.",
  LibGDX: "Cross-platform Java framework for interactive graphics and games.",
  "Integrity RTOS": "Real-time software development on Green Hills INTEGRITY.",
  "VxWorks RTOS": "Deterministic embedded software for real-time systems.",
  AWS: "Cloud architecture and delivery across the Amazon Web Services platform.",
  EC2: "Scalable virtual compute for hosted applications and services.",
  S3: "Durable object storage for assets, data, and static applications.",
  Lambda: "Event-driven serverless functions without managing servers.",
  ECS: "Container orchestration and deployment for production workloads.",
  CloudWatch: "Centralized cloud logs, metrics, alarms, and observability.",
  Amplify: "Managed hosting and backend integration for web applications.",
  AppSync: "Managed GraphQL APIs with real-time data synchronization.",
  DynamoDB: "Serverless NoSQL storage for scalable, low-latency applications.",
  "Route 53": "DNS, domain routing, and cloud traffic management.",
  "Secrets Manager": "Secure storage and rotation of application credentials.",
  SSM: "Configuration, automation, and operational control through Systems Manager.",
  Vercel: "Frontend deployment, previews, and edge-hosted Next.js applications.",
  Docker: "Portable container environments for development and deployment.",
  Azure: "Cloud services and application delivery on Microsoft Azure.",
  Jira: "Issue tracking, sprint planning, and engineering project management.",
  Confluence: "Collaborative technical documentation and team knowledge sharing.",
  BitBucket: "Git repository hosting and integrated development workflows.",
  Crucible: "Structured peer code reviews and engineering collaboration.",
  Agile: "Iterative planning, delivery, feedback, and continuous improvement.",
  Photoshop: "Image editing, compositing, and production-ready visual assets.",
  Illustrator: "Vector illustration, icons, diagrams, and scalable graphics.",
  "After Effects": "Motion graphics, animation, and visual effects workflows.",
  Blender: "3D modeling, materials, animation, rendering, and asset preparation.",
};

const AboutMe = () => {
  return (
    <>
      <div
        id="about-me-page"
        className="h-full w-full bg-white !min-h-[40em] max-sm:!min-h-0 max-sm:overflow-hidden max-sm:px-4 max-sm:pb-16"
      >
        <p className="p-8 pb-3 text-center text-4xl font-bold text-black max-sm:px-2 max-sm:pt-5 max-sm:text-2xl">
          Fullstack / Embedded / DevOps.
        </p>
        <p className="text-center text-[0.8em] max-sm:text-[0.72rem]">
          A wide range of skills to fit any team and develop on many different
          platforms.
        </p>

        <ul className="skills-groups mx-auto mt-8 h-full w-full text-center max-sm:mt-5">
          {groups.map((group) => (
            <li
              key={group}
              data-skill-group={group}
              className="skill-group flex h-[18%] flex-col max-sm:h-auto"
            >
              <h1 className="skill-group-title mb-4 text-[1.25rem] font-[800] text-[#043b94]">
                {group}
              </h1>
              <ul className="skill-grid mx-auto flex flex-wrap justify-center gap-x-6 gap-y-4">
                {skills[group].map((skill) => {
                  const SkillIcon = skill.icon;
                  const tooltipId = `skill-${skill.skill
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")}-description`;

                  return (
                    <li
                      key={skill.skill}
                      aria-describedby={tooltipId}
                      className="skill-tile group relative flex flex-col items-center outline-none"
                      tabIndex={0}
                    >
                      {SkillIcon ? (
                        <SkillIcon
                          aria-label={`${skill.skill} logo`}
                          className="h-8 w-8"
                          color={skill.color}
                        />
                      ) : (
                        <Image
                          src={skill.logo!}
                          alt={skill.skill}
                          width={32}
                          height={32}
                        />
                      )}
                      <p className="text-[0.65em] font-[500] mt-2">
                        {skill.skill}
                      </p>
                      <div
                        id={tooltipId}
                        role="tooltip"
                        className="skill-tooltip invisible pointer-events-none absolute bottom-[calc(100%+0.7rem)] left-1/2 z-30 w-56 -translate-x-1/2 translate-y-1 rounded-md bg-[#151515] px-3 py-2.5 text-left text-white opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus:visible group-focus:translate-y-0 group-focus:opacity-100 max-sm:hidden"
                      >
                        <span className="block text-[0.7rem] font-bold tracking-wide">
                          {skill.skill}
                        </span>
                        <span className="mt-1 block text-[0.64rem] font-normal leading-[0.9rem] text-white/75">
                          {skillDescriptions[skill.skill]}
                        </span>
                        <span
                          aria-hidden="true"
                          className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#151515]"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div
                id="divider"
                className="mx-auto my-8 h-[1px] w-[100%] bg-[#dee2e6] max-sm:my-6"
              ></div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default AboutMe;
