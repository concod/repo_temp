import React, { createContext, useContext } from "react";

const CellRendererEnvContext = createContext(null);

export const CellRendererEnvProvider = CellRendererEnvContext.Provider;

export const useCellRendererEnv = () => {
  const ctx = useContext(CellRendererEnvContext);
  if (!ctx) {
    throw new Error(
      "useCellRendererEnv must be used within CellRendererEnvProvider"
    );
  }
  return ctx;
};

export default CellRendererEnvContext;
