import React from "react";
import FinalizeButton from "../pages-inventorysmart/Finalize-Allocation/components/FinalizeButton";
import SaveButton from "../pages-inventorysmart/Finalize-Allocation/components/SaveButton";
import TriageButton from "../pages-inventorysmart/Finalize-Allocation/components/TriageButton";

export const generateExteralComponent = (
  p_featureValue,
  p_propsToComponent
) => {
  //Used to dynamically import the client-specific component through a mapping logic/ response from DB layer
  switch (p_featureValue) {
    case "triageButton":
      return <TriageButton {...p_propsToComponent} />;
    case "finalizeButton":
      return <FinalizeButton {...p_propsToComponent} />;
    case "saveButton":
      return <SaveButton {...p_propsToComponent} />;
    default:
      return <div />;
  }
};
