import React from "react";
import CoreProductsSize from "./core-products-size";

export const generateExteralComponent = (featureValue) => {
  //Used to dynamically import the client-specific component through a mapping logic/ response from DB layer
  switch (featureValue) {
    case "CoreProductsSize":
      return <CoreProductsSize />;
    default:
      return <div />;
  }
};
