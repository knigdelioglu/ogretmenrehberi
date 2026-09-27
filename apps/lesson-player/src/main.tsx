import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
const exportRender = new URLSearchParams(window.location.search).get("export-render") === "1";

if (exportRender) {
  void import("./export/ExportRenderPage").then(({ ExportRenderPage }) => {
    root.render(
      <StrictMode>
        <ExportRenderPage />
      </StrictMode>
    );
  });
} else {
  void import("./App").then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
