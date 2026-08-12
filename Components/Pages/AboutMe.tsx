import Image from "next/image";
import React from "react";

const groups: string[] = [
  "Programming",
  "Technical Skills",
  "Workflows",
  "Creativity",
];
const skills: { [key: string]: { skill: string; logo: string }[] } = {
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
    { skill: "Docker", logo: "/Images/Icons/icons8-docker.svg" },
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
  ["Workflows"]: [
    { skill: "Jira", logo: "/Images/Icons/icons8-jira.svg" },
    { skill: "Confluence", logo: "/Images/Icons/icons8-confluence.svg" },
    { skill: "BitBucket", logo: "/Images/Icons/icons8-bitbucket.svg" },
    { skill: "Crucible", logo: "/Images/Icons/crucible-svgrepo-com.svg" },
    { skill: "ClearQuest", logo: "/Images/Icons/ClearQuest.png" },
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
      <div className="bg-white w-full h-full !min-h-[40em]">
        <p className="text-black text-center text-4xl font-bold p-8 pb-3">
          Fullstack / Embedded / DevOps.
        </p>
        <p className="text-center text-[0.8em]">
          A wide range of skills to fit any team and develop on many different
          platforms.
        </p>

        <ul className="w-full h-full mx-auto text-center mt-8 ">
          {groups.map((group) => (
            <li key={group} className="flex flex-col h-[18%]">
              <h1 className="text-2xl text-[#043b94] font-[800] text-[1.25rem] mb-4">
                {group}
              </h1>
              <ul className="flex flex-wrap mx-auto space-x-8 justify-center">
                {skills[group].map((skill) => (
                  <li key={skill.skill} className="flex flex-col items-center">
                    <Image
                      src={skill.logo}
                      alt={skill.skill}
                      width={32}
                      height={32}
                    />
                    <p className="text-[0.65em] font-[500] mt-2">
                      {skill.skill}
                    </p>
                  </li>
                ))}
              </ul>
              <div
                id="divider"
                className="w-[100%] h-[1px] bg-[#dee2e6] mx-auto my-8"
              ></div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default AboutMe;
