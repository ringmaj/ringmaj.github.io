import Image from "next/image";
import NavigationArrows from "@/Components/NavigationArrows";

const awards = [
  {
    title: "Achievement Award: Accountability",
    quote:
      "Henry helped deliver the first build of the DFO effort on the Qatar program. He came up to speed quickly, worked independently, and delivered on time.",
    sender: "Eric A. Engle · Oct 2021",
  },
  {
    title: "Leadership-Sponsored Achievement Award",
    quote:
      "Henry Ring provided above-and-beyond support of BIT code changes to make progress toward our customer milestones.",
    sender: "Yeni H. Fernandez · May 2020",
  },
  {
    title: "Spot Award: Innovation",
    quote:
      "Thank you for a job well done on the front-end work for the structure comparison tool. It was above and beyond what was asked and was excellent work.",
    sender: "Condor Chou · Jul 2019",
  },
  {
    title: "Spot Award: Collaboration",
    quote:
      "The MNU team overcame many hurdles to deploy capabilities across program areas. Each team member contributed to the success, and those efforts are appreciated.",
    sender: "Rori M. Ramirez · Feb 2020",
  },
  {
    title: "F-15 Qatar Team Recognition",
    quote:
      "Thank you to the F-15 Qatar Software Team for delivering critical Build 109 and Deploy 1.5 OFP milestones to the customer on time.",
    sender: "Omer A. Faghfoor · Mar 2022",
  },
];

export default function RecognitionPage() {
  return (
    <NavigationArrows>
      <section className="h-full min-h-[40em] px-10 py-8">
        <header className="mb-7 text-center">
          <h1 className="text-4xl font-bold">Recognition from the teams.</h1>
          <p className="mt-2 text-sm text-neutral-600">
            A few moments of impact, collaboration, and technical leadership.
          </p>
        </header>
        <ul className="grid grid-cols-3 gap-4">
          {awards.map((award) => (
            <li
              key={award.title}
              className="border-l-2 border-[var(--main-accent-color)] bg-neutral-100 p-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <Image
                  src="/Images/Icons/Raytheon.png"
                  alt="Raytheon"
                  width={28}
                  height={28}
                  className="object-contain"
                />
                <h2 className="text-sm font-bold">{award.title}</h2>
              </div>
              <p className="text-xs leading-5 text-neutral-700">
                “{award.quote}”
              </p>
              <p className="mt-4 text-xs font-semibold">{award.sender}</p>
            </li>
          ))}
        </ul>
      </section>
    </NavigationArrows>
  );
}
