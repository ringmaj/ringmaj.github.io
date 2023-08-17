import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import HeaderComponent from "./components/HeaderComponent";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <HeaderComponent />
    </div>
  );
}

export default App;
