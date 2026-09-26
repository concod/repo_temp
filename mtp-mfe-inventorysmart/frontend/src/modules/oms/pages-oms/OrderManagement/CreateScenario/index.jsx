import React from "react";
import { useSelector } from "react-redux";
import OrderCreateScenario from "modules/oms/pages-oms/Order-Management/Order-Create-Scenario";
import {
  ORDER_MANAGEMENT_V3,
  ORDER_MANAGEMENT_V3_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_V3_CREATE_SCENARIO,
  ORDER_MANAGEMENT_V4,
} from "modules/oms/constants-oms/routeConstants";
import { selectMatrixHandoff } from "../slices/matrixHandoff.slice.js";
import { resolveOmIsV3Schema } from "../utils/resolveOmIsV3Schema.util.js";

const OrderCreateScenarioV3 = (props) => {
  const handoff = useSelector(selectMatrixHandoff);
  const isV3Schema =
    typeof handoff?.isV3Schema === "boolean"
      ? handoff.isV3Schema
      : resolveOmIsV3Schema({
          sourcePath: handoff?.sourcePath,
          pathname: handoff?.sourcePath || ORDER_MANAGEMENT_V4,
        });

  const routeOverrides = {
    orderManagement: isV3Schema ? ORDER_MANAGEMENT_V3 : ORDER_MANAGEMENT_V4,
    matrixSummary: null,
    productDetails: ORDER_MANAGEMENT_V3_PRODUCT_DETAILS,
    createScenario: ORDER_MANAGEMENT_V3_CREATE_SCENARIO,
  };

  return (
    <OrderCreateScenario
      {...props}
      routeOverrides={routeOverrides}
      useV3CreateScenarioSafetyStock
      useV3CreateScenarioStep2Apis
      isV3Schema={isV3Schema}
    />
  );
};

export default OrderCreateScenarioV3;
