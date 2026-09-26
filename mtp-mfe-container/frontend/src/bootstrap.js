import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import theme from "./core/Styles/theme";

// Detect Windows OS and apply class for Windows-specific styling
const detectWindowsOS = () => {
  const isWindows = window.navigator.userAgent.includes("Windows");
  if (isWindows) {
    document.documentElement.classList.add("windows-os");
  }
};

// Run OS detection immediately
detectWindowsOS();
ReactDOM.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
