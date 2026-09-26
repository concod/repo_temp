import React, { useEffect } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";

import GenericCardsPanel from "../../KPI/GenericCardPanel";

const OrderBatchingMetrics = (props) => {
  const [panelData, setPanelData] = React.useState(null)

  useEffect(() => {
    let panelData = {
      noSubMetrics: true, // Only carters has no subMetrics right now.
      expandedLayout: "center",
      panelHeader: "KPIs",
      cardData: [],
    };
    // View 1
    props.inventorysmartOrderBatchingMetrics.forEach((thisMetric) => {
      panelData.cardData.push(thisMetric)
    })

    // View 2
    // props.inventorysmartOrderBatchingMetrics.forEach((thisMetric)=>{
    //   const {  label, value} = thisMetric;
    //   let subMetrics = [{
    //     value,
    //   }];
    //   panelData.cardData.push({
    //     title: label,
    //     subMetrics,
    //   });
    // })
    setPanelData(panelData)
  }, [props.inventorysmartOrderBatchingMetrics])

  return (
    <>
      <Loader
        loader={props.inventorysmartOrderBatchingMetricsLoader}
        minHeight={"120px"}
      >
        {panelData && (
          <GenericCardsPanel
            panelData={panelData}
            parentBaseModule={
              props.inventorysmartOrderBatchingIconConfig?.render3DIcons
                ? "order-batching"
                : ""
            }
          />
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    inventorysmartOrderBatchingMetricsLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingMetricsLoader,
    inventorysmartOrderBatchingMetrics:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingMetrics,
    inventorysmartOrderBatchingIconConfig:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingIconConfig,
  };
};

export default connect(mapStateToProps, null)(OrderBatchingMetrics);
