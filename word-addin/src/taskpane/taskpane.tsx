// React entry point. Mounted into #root in taskpane.html.
//
// Office.js loads asynchronously from the Microsoft CDN. We don't gate
// rendering on Office being ready at the top level — App handles the
// loading state internally and the UI is allowed to render in a plain
// browser too (useful for `npm run dev` visual development at
// https://localhost:3001/taskpane.html without sideloading into Word).

import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@addin/styles/tokens.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element in taskpane.html");
}
const root = createRoot(container);
root.render(<App />);
