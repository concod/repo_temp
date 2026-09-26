import { useEffect, useRef, useState } from "react";
import PlanDropTabViewComponent from "../../Plan/plan-drop-tab-view-component";
import PlansTable from "./plans-table";

const PreSeasonDashboard = (props) => {
  const tabValues = {
    "Active Plans": "Active Plans",
    "Scenario Plans": "Scenario Plans",
  };
  const [selectedTab, setSelectedTab] = useState(null);

  return (
    <>
      {tabValues && (
        <div>
          <PlanDropTabViewComponent
            groupedDrops={tabValues}
            onChangeTab={setSelectedTab}
          />
        </div>
      )}
      {selectedTab === "Active Plans" && (
        <>
          <PlansTable {...props} />
        </>
      )}
    </>
  );
};

export default PreSeasonDashboard;
