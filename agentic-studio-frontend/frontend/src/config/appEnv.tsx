export const appEnv = () => {
  const host = window.location.hostname;
  if (host.includes("agentic-studio.devs.impact-agents.ai")) {
    return "dev";
  } else if (host.includes("agentic-studio.uat.impact-agents.ai")) {
    return "uat";
  } else if (host.includes("app.impact-agents.ai")) {
    return "prod";
  } else {
    //This is for local development : Change this according to the branch being tested
    return "prod";
  }
};

export const getBaseUrl = () => {
  const env = appEnv();
  if (env === "dev") {
    return "https://agentic-studio.devs.impact-agents.ai/";
  } else if (env === "uat") {
    return "https://agentic-studio.uat.impact-agents.ai/";
  } else if (env === "prod") {
    return "https://impact-agents.ai/";
  } else {
    return "http://localhost:8000/";
  }
};
