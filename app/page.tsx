import Home from "../Components/Pages/Home";
import NavigationArrows from "../Components/NavigationArrows";
import React from "react";

export default function HomePage() {
  return (
    <>
      <NavigationArrows
        color="white"
        backgroundUrl="./Images/dunes-min.jpg"
        backgroundOptions="bg-cover bg-[var(--main-accent-color)] bg-center bg-blend-multiply"
      >
        <Home />
      </NavigationArrows>
    </>
  );
}
