"use client";
import classnames from "classnames";
import React, { useEffect, useState } from "react";

export interface JobCardProps {
  jobCompany: string;
  jobTitle: string;
  jobDescription: string;
  jobLocation: string;
}

const JobCard = ({
  jobCompany,
  jobTitle,
  jobDescription,
  jobLocation,
}: JobCardProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    // >
    // <div
    //   id="job-content"
    //   className={classnames({
    //     "transition-all duration-150 ease-in-out transform": true, // Add transition properties
    //     "overflow-hidden": true,
    //     "w-0 h-0 opacity-0": !isVisible, // Initial state
    //     "w-[20em] h-[220px] opacity-100": isVisible && jobCompany.length < 20, // Final state for short company name
    //     "w-[25em] h-auto opacity-100": isVisible && jobCompany.length >= 20, // Final state for long company name
    //   })}
    // >
    <div
      id="job-content"
      className={classnames({
        "w-[20em]": jobCompany.length < 20,
        "w-[25em]": jobCompany.length > 20,
        "h-auto": true,
      })}
    >
      <h1 className="flex whitespace-nowrap !w-fit font-SbEina font-[400] text-[0.9em]">
        {jobCompany}
      </h1>
      <h1 className="text-[0.7em]">
        <i>{jobTitle}</i>
      </h1>
      <div
        id="divider"
        className="h-[2px] w-[100%] bg-[var(--main-accent-color)] my-2"
      ></div>
      <p className="text-[0.75em] mt-2">{jobDescription}</p>
      <p className="text-[0.7em] mt-3 font-[600]">{jobLocation}</p>
    </div>
  );
};

export default JobCard;
