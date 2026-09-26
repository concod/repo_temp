import React, { useEffect } from "react";
import { connect } from "react-redux";
import ExcessInventoryGraphComponent from "./excess-inventory-graph-component";
import globalStyles from "core/Styles/globalStyles";
import ExcessInventoryTableView from "./excess-inventory-table-view";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { clearExcessInventoryStates } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/excess-inventory-report-services";
import { isEmpty } from "lodash";


const ExcessInventoryReportTable = (props) => {
  const globalClasses = globalStyles();


  useEffect(() => {
    return () => {
      props?.clearExcessInventoryStates();
    };
  }, []);

  return (
    <>
      { (
        <div style={{minHeight:'350px'}}>
       {props?.showExcessInventoryDetails &&  <ExcessInventoryGraphComponent
            excessInventoryGraphData={props.excessInventoryFiscalWeekGraph}
            inventorysmartScreenConfig={props.inventorysmartScreenConfig}
          />}
          <div className={globalClasses.marginBottom}>
            {!isEmpty(props.excessInventoryFiscalWeekGraph?.data) && (
              <ExcessInventoryTableView
                displaySnack={displaySnackMessages}
                renderTable={props?.showExcessInventoryDetails}
                weeksAvailable={props.excessInventoryFiscalWeekGraph?.data}
                inventorysmartScreenConfig={props.inventorysmartScreenConfig}
                excessInventoryGraphData={props.excessInventoryFiscalWeekGraph}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const { filterReducer } = store;
  return {
    showExcessInventoryDetails:
      inventorysmartReducer?.inventorySmartExcessInventoryService
        ?.showExcessInventoryDetails,
    excessInventoryFiscalWeekGraph:
      inventorysmartReducer?.inventorySmartExcessInventoryService
        ?.excessInventoryFiscalWeekGraph,
    excessInventoryFilterConfiguration:
      inventorysmartReducer.inventorySmartExcessInventoryService
        .excessInventoryFilterConfiguration,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "excessInvFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: filterReducer.savedFilterSelection,
    excessInventoryScreenLoader:
    inventorysmartReducer.inventorySmartExcessInventoryService
      .excessInventoryScreenLoader,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    clearExcessInventoryStates: (body) =>
      dispatch(clearExcessInventoryStates(body)),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExcessInventoryReportTable);
