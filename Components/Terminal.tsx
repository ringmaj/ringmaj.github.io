"use client";

import React from "react";
import { TypeAnimation } from "react-type-animation";

const Terminal = () => {
  return (
    <div id="terminal-container" className="p-5 mx-auto w-[40em]">
      <div
        id="status-bar"
        className="w-full rounded-tl-lg rounded-tr-lg  h-6 bg-[#dadada] items-center flex px-4"
      >
        <div id="button-group" className="w-fit h-[80%]">
          <ul className="flex items-center w-full h-full space-x-2.5">
            <li className="inline-block w-3 h-3 bg-red-500 rounded-full"></li>
            <li className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></li>
            <li className="inline-block w-3 h-3 bg-green-500 rounded-full"></li>
          </ul>
        </div>
      </div>
      <div
        id="terminal-body"
        className="rounded-bl-lg rounded-br-lg bg-black w-full h-full text-white p-4 text-[0.8em]"
      >
        <TypeAnimation
          sequence={["ring@ring:~$ ", 1000]}
          wrapper="span"
          speed={50}
          style={{
            fontSize: "1em",
            display: "inline-block",
            whiteSpace: "pre-wrap",
          }}
        />
        <TypeAnimation
          sequence={["ls\n", 2000]}
          wrapper="span"
          speed={50}
          style={{
            fontSize: "1em",
            display: "inline-block",
            whiteSpace: "pre-wrap",
          }}
        />
        <TypeAnimation
          sequence={["resume.pdf\n", 3000]}
          wrapper="span"
          speed={50}
          style={{
            fontSize: "1em",
            display: "inline-block",
            whiteSpace: "pre-wrap",
          }}
        />
        <TypeAnimation
          sequence={["We produce food for Chinchillas\n", 4000]}
          wrapper="span"
          speed={50}
          style={{
            fontSize: "1em",
            display: "inline-block",
            whiteSpace: "pre-wrap",
          }}
        />
      </div>
    </div>
  );
};

export default Terminal;
