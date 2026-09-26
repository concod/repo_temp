import React from "react";
import ConditionalFormatting from "./ConditionalFormatting";
import EditableMetricTenantTable from "./EditableMetricTenantTable";

function PlansmartTenantConfig() {
  return (
    <>
      <ConditionalFormatting />
      <EditableMetricTenantTable />
    </>
  );
}

export default PlansmartTenantConfig;
