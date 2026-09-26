import { useState } from "react";
import StoreCapacity from "../Finalize-Allocation/components/StoreLevelCapacity";
import { Tabs } from "impact-ui-v3";
import ProductStoreViewInRecomendation from "./ProductStoreViewInRecomendation";

export function AllocationSummaryContainer(props) {
  const [tabValue, setTabValue] = useState("product");
  const [showScenarioAppliedAlert, setShowScenarioAppliedAlert] =
    useState(true);

  const getTabData = () => {
    let tabName = [
      {
        label: "Product View",
        value: "product",
      },
      {
        label: "Store View",
        value: "store",
      },
    ];
    const showStoreCapacityInScenario =
      !props?.isReadOnlyCompare &&
      props?.createAllocationProps
        ?.showStoreCapacityInScenario;
    if (
      showStoreCapacityInScenario &&
      (!props?.finalizeAllocationConfig?.drillDown ||
        props?.finalizeAllocationConfig?.drillDown?.hidden?.indexOf(
          "storeCapacityBreach"
        ) < 0)
    ) {
      tabName = [
        ...tabName,
        {
          label: "Store Capacity",
          value: "store_capacity",
        },
      ];
    }
    return tabName;
  };

  const renderTabContent = (activeTab) => {
    if (activeTab === "store_capacity") {
      return (
        <StoreCapacity
          scenarioId={props.scenarioId}
          allocation_code={props.allocationCode}
        />
      );
    }
    return (
      <ProductStoreViewInRecomendation
        tabName={activeTab}
        showScenarioAppliedAlert={showScenarioAppliedAlert}
        onCloseScenarioAppliedAlert={() => setShowScenarioAppliedAlert(false)}
        {...props}
      />
    );
  };

  const renderTabComponents = () => {
    let TabMapper = {
      product: (
        <div>
          <ProductStoreViewInRecomendation tabName={tabValue} {...props} />
        </div>
      ),
      store: (
        <div>
          <ProductStoreViewInRecomendation tabName={tabValue} {...props} />
        </div>
      ),
      store_capacity: (
        <div>
          <StoreCapacity
            scenarioId={props.scenarioId}
            allocation_code={props.allocationCode}
          />
        </div>
      ),
    };
    let tabsList = getTabData();
    let tablePanel = tabsList.map((thisTab) => {
      let panelTabValue = thisTab?.value;
      return <div key={panelTabValue}>{TabMapper[panelTabValue]}</div>;
    });

    return tablePanel;
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const tabNames = getTabData();

  // New flow: tab bar → middle content (KPIs) → tab table content
  if (props.middleContent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Tabs
          value={tabValue}
          onChange={handleChangeTabValue}
          orientation="horizontal"
          tabNames={tabNames}
          tabPanels={tabNames.map(() => null)}
        />
        {props.middleContent}
        <div key={tabValue}>{renderTabContent(tabValue)}</div>
      </div>
    );
  }

  return (
    <Tabs
      value={tabValue}
      onChange={handleChangeTabValue}
      orientation="horizontal"
      tabNames={tabNames}
      tabPanels={renderTabComponents()}
    ></Tabs>
  );
}
