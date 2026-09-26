import { createContext, useContext } from "react";

export const PivotHostContext = createContext(null);

export function PivotHostProvider({ value, children }) {
  return (
    <PivotHostContext.Provider value={value}>{children}</PivotHostContext.Provider>
  );
}

export function usePivotHost() {
  const ctx = useContext(PivotHostContext);
  if (!ctx) {
    throw new Error("usePivotHost must be used within PivotHostProvider");
  }
  return ctx;
}
