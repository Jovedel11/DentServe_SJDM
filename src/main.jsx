import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./core/styles/global.scss";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
