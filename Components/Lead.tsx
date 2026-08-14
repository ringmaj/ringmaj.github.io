import classNames from "classnames";
import React from "react";

export enum Position {
  Left = "left",
  Right = "right",
  Center = "center",
}

interface LeadProps {
  header: string;
  description: string | Array<string>;
  position?: Position;
  onDark?: boolean;
  badge?: string;
}

const Lead = ({
  header,
  description,
  position = Position.Left,
  onDark = false,
  badge,
}: LeadProps) => {
  return (
    <>
      <div
        id="lead-container"
        className="h-full w-full pt-10 max-sm:px-4 max-sm:pt-3"
      >
        <div
          id="lead-column"
          className="h-fit w-[40%] max-sm:!float-none max-sm:w-[calc(100%-2.75rem)] max-sm:max-w-[18rem]"
          style={{
            float: position as unknown as
              | "left"
              | "right"
              | "none"
              | "inline-start"
              | "inline-end",
          }}
        >
          <div
            id="lead-card"
            data-page-navigation-ignore
            className={classNames(
              "h-fit w-full p-8 max-sm:p-3.5 max-sm:shadow-sm",
              {
              "rounded-lg bg-[#f5f5f5]": !onDark,
              "bg-transparent max-sm:rounded-lg max-sm:bg-black/70 max-sm:backdrop-blur-sm":
                onDark,
              },
            )}
          >
            <p
              className={classNames({
                "mb-4 text-4xl font-bold max-sm:mb-2 max-sm:text-[1.4rem] max-sm:leading-[1.05]": true,
                "text-black": !onDark,
                "text-white": onDark,
                "justify-left": true,
              })}
            >
              {header}
            </p>
            <p
              className={classNames({
                "text-[0.8em] max-sm:text-[0.62rem] max-sm:leading-[0.92rem]": true,
                "text-black": !onDark,
                "text-white": onDark,
                "justify-left": true,
              })}
            >
              {Array.isArray(description)
                ? description.map((desc, index) => (
                    <React.Fragment key={index}>
                      {desc}
                      <br />
                      <br />
                    </React.Fragment>
                  ))
                : description}
            </p>
          </div>
          {badge && (
            <span
              className={classNames(
                "mt-3 inline-flex rounded-md border px-3 py-1.5 text-[0.58rem] font-bold uppercase leading-none tracking-[0.14em]",
                {
                  "border-orange-500/30 bg-orange-500/10 text-orange-600":
                    !onDark,
                  "border-orange-300/45 bg-orange-400/15 text-orange-200":
                    onDark,
                },
              )}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </>
  );

  <div>Lead</div>;
};

export default Lead;
