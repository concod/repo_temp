import LoadingOverlay from "core/Utils/Loader/loader";
import React, { useState, createContext, useContext } from "react";

const LoadingContext = createContext({
  loading: false,
  setLoading: null,
});

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const value = { loading, setLoading };
  return (
    <LoadingContext.Provider value={value}>
      <LoadingOverlay
        wrapperPosition="static"
        // loader={loading}
        text=""
        spinner={false}
        isCustomLoader
        customLoaderopacity={0.1}
      >
        {children}
      </LoadingOverlay>
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}
