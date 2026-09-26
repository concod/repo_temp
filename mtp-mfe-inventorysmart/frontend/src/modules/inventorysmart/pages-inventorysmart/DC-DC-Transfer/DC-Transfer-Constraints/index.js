import React, { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty } from "lodash";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import { formatSelectedFiltersData } from "core/commonComponents/coreComponentScreen/utils";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { connect } from "react-redux";
import {
  setDcTransferConstraintsFilterConfig,
  setDcTransferConstraintsDataLoader,
} from "modules/inventorysmart/services-inventorysmart/DC-Transfer-Constraints/dc-transfer-constraints-service";
import { Grid, Paper } from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import DcTransferConstraintsTable from "./DcTransferConstraintsTable";
import { handleErrorMessage } from "../../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";

const DcTransferConstraints = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  const onFilterDependency = useRef([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("DC-Transfer-Constraints");
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        props?.setDcTransferConstraintsFilterConfig(response);
      } catch (e) {
        handleErrorMessage(e, props);
      }
    };
    getInitialFilterConfiguration();
    return () => { };
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.dcTransferConstraintsFilterConfigs)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.dcTransferConstraintsFilterConfigs, props.savedFilterSelection]);

  const getFilterValues = async (selected, current) => {
    props.setDcTransferConstraintsDataLoader(true);
    try {
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.dcTransferConstraintsFilterConfigs),
        appliedFilters: selected,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      const filterConfigData = [
        {
          filterDashboardData: response,
          expectedFilterDimensions: getFilterDimensions(response),
          isCrossDimensionFilter: true,
          screen_name: props.screenName,
          saved_filter_screen_name: "DC-Transfer-Constraints",
          update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "dcTransferConstraintsFilterConfigs",
        filterConfigData,
        "DC-Transfer-Constraints"
      );
      props.setFilterConfiguration(filterConfig);
      props.setDcTransferConstraintsDataLoader(false);
    } catch (err) {
      props.setDcTransferConstraintsDataLoader(false);
      handleErrorMessage(err, props);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setDcTransferConstraintsDataLoader(true);
    try {
      setFilterValuesOnRender(dependency);
      props.setDcTransferConstraintsDataLoader(false);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth= {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"dcTransferConstraintsFilterConfigs"}
        onApplyFilter={(dependencyData, filterData) =>
          onFilterDashboardClick(dependencyData, filterData)
        }
        showChipsOnLoad={true}
        customDependencyValue={{ addFilterExclusions: false }}
      >
        {filterValuesOnRender.length > 0 && (
          <div className={globalClasses.paddingTop_12}>
            <DcTransferConstraintsTable
              selectedFilters={filterValuesOnRender}
              history={props?.history}
              module={"inventorysmart_constraints"}
              displaySnackMessages={displaySnackMessages}
            />
          </div>
        )}
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
      "dcTransferConstraintsFilterConfigs"
      ],
    dcTransferConstraintsFilterConfigs:
      inventorysmartReducer.inventorySmartDcTransferConstraints
        .dcTransferConstraintsFilterConfigs,
    savedFilterSelection: filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    setDcTransferConstraintsFilterConfig: (body) =>
      dispatch(setDcTransferConstraintsFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setDcTransferConstraintsDataLoader: (body) =>
      dispatch(setDcTransferConstraintsDataLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DcTransferConstraints);
