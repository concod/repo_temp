import React, { useState, useEffect } from "react";
import "./TenantConfiguration.css";
import { Tabs } from "impact-ui";
import PlanningMetricsTable from "./components/PlanningMetricsTable";
import {
  PRE_SEASON_CODE,
  IN_SEASON_CODE,
  TARGET_PLAN_CODE
} from "./tenantConfiguration.constant";

const TenantConfiguration = () => {
  const [seasonCode, setSeasonCode] = useState(PRE_SEASON_CODE);

  const handleTabChange = (code) => {
    setSeasonCode(code);
  };

  const tabs = [
    {
      label: "Pre Season",
      value: PRE_SEASON_CODE,
      element: <PlanningMetricsTable seasonCode={seasonCode} />
    },
    {
      label: "In Season",
      value: IN_SEASON_CODE,
      element: <PlanningMetricsTable seasonCode={seasonCode} />
    },
    {
      label: "Target Plan",
      value: TARGET_PLAN_CODE,
      element: <PlanningMetricsTable seasonCode={seasonCode} />
    }
  ];

  return (
    <div>
      <div className="heading">Tenant Configuration</div>
      <div className="container">
        <Tabs tabs={tabs} value={seasonCode} onChange={handleTabChange} />
      </div>
    </div>
  );
};

export default TenantConfiguration;
