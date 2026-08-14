import React from "react";
import Image from "next/image";
import classnames from "classnames";
import CustomButton from "../Button";
import HoverPopover from "../HoverPopover";

const bio = {
  name: "Henry Ring",
  position: "Sr. Software Engineer.",
  header: "Intuitive. Artistic. Practical. Efficient.",
  mainText:
    "A highly skilled Full-Stack software engineer that specializes in designing and developing cutting-edge applications that solve complex problems and enhance user experiences. With years of experience in the industry, I have a proven track record of delivering quality software solutions for clients across various domains.",
};

const jobsList = {
  preCareer: [
    {
      company: "JPL",
      location: "(MESA Labs) Merced, California",
      logo: "/Images/Icons/jpl.svg",
      title: "Software Development Intern",
      description:
        "The Jet Propulsion Laboratory is a federally funded research and development center and NASA field center in La Cañada Flintridge, California. JPL is managed by the California Institute of Technology, and it conducts space exploration missions for NASA, developing and operating robotic spacecraft to explore the solar system and beyond.  UC Merced Mechatronics, Embedded Systems and Automation (MESA) Lab.",
    },
    {
      company: "HackMerced",
      location: "Merced, California",
      logo: "/Images/Icons/UCM.png",
      title: "Software Engineering Intern",
      description:
        "HackMerced is an annual, student-organized hackathon hosted at UC Merced that gathers students and tech enthusiasts to innovate and collaborate on technology projects. The event promotes creativity, learning, and networking by providing a platform for participants to develop new skills, tackle real-world challenges, and engage with industry professionals.",
    },
    {
      company: "Merced Nanomaterials Center for Energy and Sensing",
      location: "Merced, California",
      logo: "/Images/Icons/MACES.png",
      title: "Student Web Developer",
      description:
        "MACES—the Merced Nano-materials Center for Energy and Sensing—is a research hub at UC Merced focused on advancing nanomaterials for energy and sensing applications. The center fosters interdisciplinary collaboration to develop innovative technologies addressing challenges in renewable energy, energy efficiency, and environmental monitoring.",
    },
    {
      company: "TEDxUCMerced",
      location: "Merced, California",
      logo: "/Images/Icons/tedx.svg",
      title: "Volunteer Organizer",
      description:
        "An independently organized TEDx event hosted at the University of California, Merced. It provides a platform for students, faculty, and community members to share innovative ideas, stories, and performances. The event aims to inspire, educate, and foster conversations by featuring talks on a wide range of topics that spark curiosity and dialogue.",
    },
    {
      company: "TEDxYouthSD",
      location: "San Diego, California",
      logo: "/Images/Icons/tedx.svg",
      title: "Volunteer Organizer",
      description:
        "An independently organized TEDx event that provides a platform for young people in the San Diego area to share their ideas, stories, and talents. The event focuses on inspiring and empowering youth by featuring talks and performances on a wide array of topics relevant to the younger generation, fostering creativity, learning, and community engagement.",
    },
  ],
  career: [
    {
      company: "Amazon Leo",
      location: "Northridge, California",
      logo: "/Images/Icons/amazon-leo.svg",
      title: "Software Integration and Test Engineer",
      description:
        "Amazon Leo is a low Earth orbit satellite network designed to provide fast, reliable broadband connectivity to customers and communities beyond the reach of existing networks.",
    },
    {
      company: "Quadrata",
      location: "Los Angeles, California",
      logo: "/Images/Icons/Quadrata.png",
      title: "Full-Stack Software Engineer",
      description:
        "Quadrata Inc. is a blockchain company offering an NFT-based passport system for decentralized finance (DeFi). Their solution allows users to carry verified identity and compliance credentials across various DeFi platforms, facilitating regulatory compliance while preserving user privacy.",
    },
    {
      company: "BigBear.ai",
      location: "Columbia, Maryland",
      logo: "/Images/Icons/BigBearAi.png",
      title: "Senior Full-Stack Software Engineer",
      description:
        "BigBear.ai is a technology company specializing in artificial intelligence and machine learning solutions for decision support in complex environments. They provide data analytics, cybersecurity, and predictive analytics services to defense, intelligence, and commercial clients, enabling organizations to make informed, data-driven decisions.",
    },
    {
      company: "Northrop Grumman",
      location: "Los Angeles, California",
      logo: "/Images/Icons/NGC-square.png",
      title: "Embedded Software Engineer II",
      description:
        "Northrop Grumman is a global aerospace and defense technology company specializing in innovative systems and solutions across air, space, cyber, and land domains. The company develops advanced technologies in areas like autonomous systems, cybersecurity, C4ISR, and space exploration, contributing to national security and scientific advancement worldwide.",
    },

    {
      company: "Raytheon",
      location: "Los Angeles, California",
      logo: "/Images/Icons/Raytheon.png",
      title: "Embedded Software Engineer",
      description:
        "Raytheon is a global aerospace and defense company specializing in advanced technologies and services for government and commercial customers. The company focuses on missile defense systems, cybersecurity solutions, radars, and precision weapons, playing a key role in national security and technological innovation.",
    },
  ],
};

const Home = () => {
  return (
    <>
      <div className="h-full w-full pt-12 !min-h-[50em] max-sm:!min-h-0 max-sm:px-4 max-sm:pt-3">
        <div
          id="about-me-header"
          className="flex h-fit items-center justify-center max-sm:flex-col-reverse max-sm:gap-2"
        >
          <div
            id="about-me-text"
            className="w-[45em] rounded-lg bg-white p-5 max-sm:w-full max-sm:px-4 max-sm:py-3.5"
          >
            <h1 className="display-5 lh-1 !mb-3 flex text-[2rem] font-bold text-body-emphasis max-sm:!mb-2 max-sm:flex-wrap max-sm:text-[1.35rem]">
              <span
                id="HenryRingName"
                className="text-[var(--main-accent-color)]"
              >
                {bio.name} |
              </span>
              <span className="ml-1">{bio.position}</span>
            </h1>
            <p className="!text-[0.9em] !font-[300] max-sm:line-clamp-6 max-sm:!text-[0.72rem] max-sm:leading-5">
              <span>{bio.header}</span>
              <br className="max-sm:hidden" />
              <br className="max-sm:hidden" />
              <span className="max-sm:mt-2.5 max-sm:block">{bio.mainText}</span>
              <br className="max-sm:hidden" />
              <br className="max-sm:hidden" />
            </p>
            <div className="d-grid gap-2 d-md-flex justify-content-md-start max-sm:mt-2.5">
              <CustomButton>Start our journey!</CustomButton>
            </div>
          </div>
          <Image
            src="/Images/Henry-profile-photo.png"
            alt="Henry Ring Profile Photo"
            width={150} // Adjust the width as necessary
            height={150} // Adjust the height as necessary
            className="ml-[2em] h-auto w-auto rounded-full border-[0.4em] border-white max-sm:ml-0 max-sm:h-20 max-sm:w-20"
          />
        </div>
        <div
          id="about-me-footer"
          data-page-navigation-ignore
          className="mt-5 flex justify-center max-sm:hidden"
        >
          <div id="career-list">
            <ul className="flex items-center gap-3 p-6 max-sm:p-2">
              {jobsList.career.map((job) => (
                <li
                  key={job.company}
                  className="flex h-36 w-24 shrink-0 items-center justify-center text-white"
                >
                  <HoverPopover
                    jobCardProps={{
                      jobCompany: job.company,
                      jobTitle: job.title,
                      jobDescription: job.description,
                      jobLocation: job.location,
                    }}
                  >
                    <div className="invert-100 flex h-16 w-full items-center justify-center">
                      <Image
                        src={job.logo}
                        alt={`${job.company} Logo`}
                        width={job.company === "Amazon Leo" ? 150 : 64}
                        height={job.company === "Amazon Leo" ? 34 : 64}
                        className={classnames(
                          "h-16 rounded-lg object-contain p-1 brightness-0",
                          job.company === "Amazon Leo" ? "w-full" : "w-16",
                        )}
                      />
                    </div>
                    <p className="min-h-16 text-center text-[0.8rem] leading-5">
                      {job.company}
                    </p>
                  </HoverPopover>
                </li>
              ))}
            </ul>
          </div>

          <div
            id="divider"
            className="my-auto h-[100px] w-0.5 shrink-0 bg-white max-sm:mx-2"
          ></div>
          <div id="pre-career-list">
            <ul className="flex items-center gap-3 p-6 max-sm:p-2">
              {jobsList.preCareer.map((job) => (
                <li
                  key={job.company}
                  className="flex h-36 w-24 shrink-0 items-center justify-center text-white"
                >
                  <HoverPopover
                    jobCardProps={{
                      jobCompany: job.company,
                      jobTitle: job.title,
                      jobDescription: job.description,
                      jobLocation: job.location,
                    }}
                  >
                    <div className="invert-100 flex h-16 w-full items-center justify-center">
                      <Image
                        src={job.logo}
                        alt={`${job.company} Logo`}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-lg object-contain p-1 brightness-0"
                        unoptimized
                      />
                    </div>
                    <p className="min-h-16 text-center text-[0.8rem] leading-5">
                      {job.company}
                    </p>
                  </HoverPopover>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          id="about-me-footer-mobile"
          data-page-navigation-ignore
          className="mt-[12rem] hidden w-full pb-12 max-sm:flex max-sm:justify-center"
        >
          <div className="w-full max-w-[40rem]">
            <ul className="grid grid-cols-5 items-start gap-1 p-1.5">
              {jobsList.career.map((job) => (
                <li
                  key={job.company}
                  className="flex h-[4.8rem] min-w-0 items-center justify-center text-white"
                >
                  <HoverPopover
                    jobCardProps={{
                      jobCompany: job.company,
                      jobTitle: job.title,
                      jobDescription: job.description,
                      jobLocation: job.location,
                    }}
                  >
                    <div className="invert-100 flex h-8 w-full items-center justify-center">
                      <Image
                        src={job.logo}
                        alt={`${job.company} Logo`}
                        width={job.company === "Amazon Leo" ? 150 : 64}
                        height={job.company === "Amazon Leo" ? 34 : 64}
                        className={classnames(
                          "h-8 rounded-lg object-contain p-1 brightness-0",
                          job.company === "Amazon Leo" ? "w-full" : "w-16",
                        )}
                      />
                    </div>
                    <p className="text-center text-[0.46rem] leading-[0.62rem]">
                      {job.company}
                    </p>
                  </HoverPopover>
                </li>
              ))}
            </ul>
            <div className="my-0.5 h-0.5 w-full bg-white/35" />
            <ul className="grid grid-cols-5 items-start gap-1 p-1.5">
              {jobsList.preCareer.map((job) => (
                <li
                  key={job.company}
                  className="flex h-[4.8rem] min-w-0 items-center justify-center text-white"
                >
                  <HoverPopover
                    jobCardProps={{
                      jobCompany: job.company,
                      jobTitle: job.title,
                      jobDescription: job.description,
                      jobLocation: job.location,
                    }}
                  >
                    <div className="invert-100 flex h-8 w-full items-center justify-center">
                      <Image
                        src={job.logo}
                        alt={`${job.company} Logo`}
                        width={64}
                        height={64}
                        className="h-8 w-8 rounded-lg object-contain p-1 brightness-0"
                        unoptimized
                      />
                    </div>
                    <p className="text-center text-[0.46rem] leading-[0.62rem]">
                      {job.company}
                    </p>
                  </HoverPopover>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
