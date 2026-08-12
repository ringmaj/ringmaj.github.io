import React from "react";
import Terminal from "../Terminal";

const Overview = () => {
  return (
    <>
      <div className="bg-white w-full h-full !min-h-[40em]">
        <div id="hero-container" className="flex w-fit h-[65%] mx-auto">
          <div id="hero-content" className=" my-auto w-fit">
            <p className="text-black text-center text-4xl font-bold p-8 pb-3">
              Everybody loves terminals right?
            </p>
            <p className="text-center text-[1em]">
              A brief intro, sweet and headless.
            </p>
          </div>
          <Terminal />
        </div>
      </div>
    </>
  );
};

export default Overview;
