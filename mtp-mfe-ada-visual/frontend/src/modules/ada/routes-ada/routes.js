import React from "react";
import RoutesInventorySmart from "./routes-inventory";
import RoutesADA from "./routes-ada";
const Routes = () => {
  return (
    <>
      {sessionStorage.getItem("isRedirectedFromInventorySmart") === "true" ? (
        <RoutesInventorySmart />
      ) : (
        <RoutesADA />
      )}
    </>
  );
};

export default Routes;
