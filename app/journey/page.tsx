import NavigationArrows from "@/Components/NavigationArrows";
import Image from "next/image";

const milestones = [
  {
    period: "Latest role",
    organization: "Amazon Leo",
    logo: "/Images/Icons/amazon-leo-krypton-thruster.webp",
    role: "Software Integration and Test Engineer · Northridge, California",
    detail:
      "Software engineering for a low Earth orbit satellite network designed to provide fast, reliable broadband beyond the reach of existing infrastructure.",
  },
  {
    period: "Professional",
    organization: "Quadrata",
    logo: "/Images/Icons/Quadrata.png",
    role: "Full-Stack Software Engineer · Los Angeles, California",
    detail:
      "Full-stack engineering for a privacy-preserving identity and compliance passport designed for decentralized finance platforms.",
  },
  {
    period: "Professional",
    organization: "BigBear.ai",
    logo: "/Images/Icons/BigBearAi.png",
    role: "Senior Full-Stack Software Engineer · Columbia, Maryland",
    detail:
      "Senior full-stack engineering supporting AI, data analytics, cybersecurity, and predictive decision products in complex environments.",
  },
  {
    period: "2022 — 2023",
    organization: "Northrop Grumman Space Systems",
    logo: "/Images/Icons/NGC-square.png",
    role: "Software Engineer",
    detail:
      "Built satellite-system tooling, spacecraft simulator integrations, and processing automation that reduced a 2.5-hour workflow to under four minutes.",
  },
  {
    period: "2019 — 2022",
    organization: "Raytheon Space and Airborne Systems",
    logo: "/Images/Icons/Raytheon.png",
    role: "Software Engineer",
    detail:
      "Developed embedded radar software, mission-file automation, BIT tooling, lab integrations, and customer OFP deliveries for APG-79 and APG-82 programs.",
  },
  {
    period: "2018",
    organization: "JPL / UC Merced MESA Lab",
    logo: "/Images/Icons/jpl.svg",
    role: "Software Development Technical Intern",
    detail:
      "Developed a control and analysis interface for methane-sensing drones, flight mapping, and recorded mission data.",
  },
  {
    period: "2017 — 2018",
    organization: "HackMerced",
    logo: "/Images/Icons/UCM.png",
    monochromeLogo: true,
    role: "Software Engineering Intern",
    detail:
      "Supported a 36-hour annual programming competition serving hundreds of students and builders.",
  },
  {
    period: "Pre-career",
    organization: "Merced Nanomaterials Center for Energy and Sensing",
    logo: "/Images/Icons/MACES.png",
    monochromeLogo: true,
    role: "Student Web Developer · Merced, California",
    detail:
      "Student web development for UC Merced's interdisciplinary nanomaterials research center focused on energy and sensing applications.",
  },
  {
    period: "Community",
    organization: "TEDxUCMerced",
    logo: "/Images/Icons/tedx.svg",
    role: "Volunteer Organizer · Merced, California",
    detail:
      "Volunteer organizing for UC Merced's platform for student, faculty, and community ideas, stories, and performances.",
  },
  {
    period: "2014 — 2018",
    organization: "University of California, Merced",
    logo: "/Images/Icons/UCM.png",
    monochromeLogo: true,
    role: "B.S. Computer Science and Engineering",
    detail:
      "Studied software engineering, embedded systems, graphics, algorithms, and applied computing.",
  },
  {
    period: "2013 — 2014",
    organization: "TEDxYouth@SanDiego",
    logo: "/Images/Icons/tedx.svg",
    role: "Sponsors and Partnerships",
    detail:
      "Worked with students and mentors to build partnerships and raise funding for a regional youth ideas program.",
  },
];

export default function JourneyPage() {
  return (
    <NavigationArrows>
      <section className="relative h-full min-h-[40em] overflow-hidden px-6 py-3 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-orange-50/70 to-transparent"
        />

        <div className="relative flex h-full min-h-0 flex-col">
          <header className="mb-2 flex shrink-0 items-center justify-between border-b border-neutral-200 pb-2">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--main-accent-color-dark)]">
                Career timeline
              </p>
              <div className="mt-0.5 flex items-end gap-4">
                <h1 className="text-3xl font-bold tracking-[-0.035em]">
                  My journey so far.
                </h1>
                <p className="pb-0.5 text-xs text-neutral-600">
                  Where I have been, what I built, and what I learned.
                </p>
              </div>
            </div>
            <p className="hidden border border-orange-200 bg-orange-50 px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[var(--main-accent-color-dark)] lg:block">
              {milestones.length} milestones
            </p>
          </header>

          <div className="relative min-h-0 flex-1">
            <span
              aria-hidden="true"
              className="absolute inset-y-2 left-0 w-px bg-gradient-to-b from-transparent via-[var(--main-accent-color)] to-transparent lg:left-1/2 lg:-translate-x-1/2"
            />

            <ol className="relative grid grid-cols-1 gap-y-3 pl-8 lg:h-full lg:grid-cols-2 lg:grid-rows-6 lg:gap-x-16 lg:pl-0">
              {milestones.map((milestone, index) => {
                const isLeft = index % 2 === 0;

                return (
                  <li
                    key={`${milestone.period}-${milestone.organization}`}
                    className="group relative min-h-[4.75rem] border border-neutral-200 bg-white p-2.5 pl-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:justify-center"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-1 bg-[var(--main-accent-color)]"
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute -left-8 h-px w-8 bg-orange-300 ${isLeft ? "top-5 lg:left-auto lg:-right-8" : "top-8"}`}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[38px] size-3 rounded-full border-[3px] border-white bg-[var(--main-accent-color)] shadow-[0_0_0_1px_rgba(255,115,0,0.3)] ${isLeft ? "top-[14px] lg:left-auto lg:-right-[38px]" : "top-[26px]"}`}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute right-2 top-0 text-2xl font-black text-neutral-100 transition-colors duration-300 group-hover:text-orange-50"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="relative flex min-w-0 items-center gap-3 pr-8">
                      <div className="flex h-10 w-11 shrink-0 items-center justify-center rounded-sm border border-neutral-100 bg-neutral-50/80 p-1.5 transition-colors duration-300 group-hover:bg-orange-50/60">
                        <Image
                          src={milestone.logo}
                          alt=""
                          width={36}
                          height={32}
                          className={`max-h-7 w-auto max-w-full object-contain ${milestone.monochromeLogo ? "brightness-0" : ""}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <p className="shrink-0 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-[var(--main-accent-color-dark)]">
                            {milestone.period}
                          </p>
                          <span
                            aria-hidden="true"
                            className="text-[0.6rem] text-orange-200"
                          >
                            /
                          </span>
                          <h2
                            className={`truncate font-bold leading-4 text-neutral-900 ${milestone.organization.length > 40 ? "text-[0.68rem]" : "text-[0.82rem]"}`}
                          >
                            {milestone.organization}
                          </h2>
                        </div>
                        <p className="truncate text-[0.62rem] font-semibold leading-4 text-neutral-700">
                          {milestone.role}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[0.64rem] leading-[0.9rem] text-neutral-600">
                          {milestone.detail}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>
    </NavigationArrows>
  );
}
