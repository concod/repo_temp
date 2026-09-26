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
import { connect } from "react-redux";
import { Grid, Paper } from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  setDcServiceLevelsFilterConfig,
  setDcServiceLevelsLoader,
} from "modules/inventorysmart/services-inventorysmart/DC-Service-Levels/dc-service-levels-service";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import DcServiceLevelsTable from "./DcServiceLevelsTable";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";

const DcServiceLevels = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  const onFilterDependency = useRef([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("DC-Service-Levels");
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        props?.setDcServiceLevelsFilterConfig(response);
      } catch (e) {
        handleErrorMessage(e, props);
      }
    };
    getInitialFilterConfiguration();
    return () => {};
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.dcServiceLevelsFilterConfigs)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.dcServiceLevelsFilterConfigs, props.savedFilterSelection]);

  const getFilterValues = async (selected, current) => {
    props.setDcServiceLevelsLoader(true);
    try {
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.dcServiceLevelsFilterConfigs),
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
          saved_filter_screen_name: "DC-Service-Levels",
          update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "dcServiceLevelsFilterConfigs",
        filterConfigData,
        "DC-Service-Levels"
      );
      props.setFilterConfiguration(filterConfig);
      props.setDcServiceLevelsLoader(false);
    } catch (err) {
      props.setDcServiceLevelsLoader(false);
      handleErrorMessage(err);
    }
  };

  const handleErrorMessage = (e, props) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setDcServiceLevelsLoader(true);
    try {
      setFilterValuesOnRender(dependency);
      props.setDcServiceLevelsLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
       <CoreComponentScreen
        IscoreButtonWidth= {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"dcServiceLevelsFilterConfigs"}
        onApplyFilter={(dependencyData, filterData) =>
          onFilterDashboardClick(dependencyData, filterData)
        }
        showChipsOnLoad={true}
        customDependencyValue={{ addFilterExclusions: false }}
      >
        {filterValuesOnRender.length > 0 && (
                <DcServiceLevelsTable
                  selectedFilters={filterValuesOnRender}
                  history={props?.history}
                  module={"inventorysmart_constraints"}
                  displaySnackMessages={displaySnackMessages}
                />
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
        "dcServiceLevelsFilterConfigs"
      ],
    dcServiceLevelsFilterConfigs:
      inventorysmartReducer.inventorySmartDcServiceLevelsService
        .dcServiceLevelsFilterConfigs,
    savedFilterSelection: filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDcServiceLevelsFilterConfig: (body) =>
      dispatch(setDcServiceLevelsFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setDcServiceLevelsLoader: (body) =>
      dispatch(setDcServiceLevelsLoader(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DcServiceLevels);
