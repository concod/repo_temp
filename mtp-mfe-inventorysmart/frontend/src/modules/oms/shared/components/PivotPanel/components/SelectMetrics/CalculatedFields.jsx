// PORTED FROM: pages/PlanningScreen/components/PivotPanel/components/SelectMetrics/CalculatedFields.jsx
// Verbatim copy -- no Redux dependencies (children bring Redux)

import { Tabs } from "impact-ui-v3";
import React, { useState } from "react";
import ContributionSection from "./ContributionSection";
import VarianceSection from "./VarianceSection";

const CalculatedFields = (props) => {
  const [value, setValue] = useState("variance");

  const handleTabChange = (newValue) => {
    setValue(newValue);
  };

  return (
    <div className="calculatedFieldsContainer">
      <Tabs
        onChange={(event, newValue) => {
          handleTabChange(newValue);
        }}
        tabNames={[
          {
            label: "Variance",
            value: "variance",
          },
          {
            label: "% contribution",
            value: "contribution",
          }
        ]}
        tabPanels={[
          <VarianceSection key="variance" />,
          <ContributionSection key="contribution" />
        ]}
        value={value}
        remountOnTabChange={true}
      />
    </div>
  );
};

export default CalculatedFields;
