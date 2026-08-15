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

        <ul className="mx-auto mt-8 h-full w-full text-center max-sm:mt-5">
          {groups.map((group) => (
            <li
              key={group}
              data-skill-group={group}
              className="flex h-[18%] flex-col max-sm:h-auto"
            >
              <h1 className="text-2xl text-[#043b94] font-[800] text-[1.25rem] mb-4">
                {group}
              </h1>
              <ul className="mx-auto flex flex-wrap justify-center gap-x-6 gap-y-4 sm:space-x-8">
                {skills[group].map((skill) => {
                  const SkillIcon = skill.icon;

                  return (
                    <li
                      key={skill.skill}
                      className="flex flex-col items-center"
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
