import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Global styles
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; overflow: hidden; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2d35; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #3b3f4a; }
  select, input { font-family: inherit; }
  button:hover { opacity: 0.85; }
  button:active { transform: scale(0.97); }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
