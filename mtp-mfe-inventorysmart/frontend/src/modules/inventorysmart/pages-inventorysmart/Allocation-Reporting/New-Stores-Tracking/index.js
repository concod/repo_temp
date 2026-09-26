import React from "react";
import { connect } from "react-redux";
import NewStoresTrackingFilters from "./new-stores-tracking-filters";
import NewStoresTrackingReport from "./new-stores-tracking-report";

const NewStoresTrackingComponent = (props) => {

  return (
    <div>
        <NewStoresTrackingFilters> 
            <NewStoresTrackingReport />
        </NewStoresTrackingFilters>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newStoresTrackingTableLoader:
      inventorysmartReducer.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingTableLoader,
    newStoresTrackingKpiLoader:
      inventorysmartReducer.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingKpiLoader,
    newStoresTrackingGraphLoader:
      inventorysmartReducer.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingGraphLoader,
    newStoresTrackingFilterLoader:
      inventorysmartReducer.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingFilterLoader,
  };
};

export default connect(mapStateToProps, null)(NewStoresTrackingComponent);
