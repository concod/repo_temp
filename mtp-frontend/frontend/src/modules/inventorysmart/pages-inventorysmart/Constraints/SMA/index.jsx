import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";

import SMATableComponent from "./SMATable";
import {
  setConstraintsSMAFilterConfig,
  resetConstraintsStoreState,
  setConstraintsSMALoader,
} from "../../../services-inventorysmart/Constraints/constraints-services";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const SMAComponent = (props) => {
  const [SMADetails, setSMADetails] = useState(false);
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  const globalClasses = globalStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setConstraintsSMALoader(true);
        let response = await fetchFilterConfig(
          "Inventorysmart Constraints SMA"
        );
        props.setConstraintsSMAFilterConfig(response);
        props.setConstraintsSMALoader(false);
      } catch (e) {
        props.setConstraintsSMALoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => resetConstraintsStoreState();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.constraintsSMAFilterConfig)
    ) {
      props.setConstraintsSMALoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.constraintsSMAFilterConfig),
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterConfigData = [
            {
              filterDashboardData: [...response],
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "constraintsSMAFilterConfig",
            filterConfigData,
            "SMA Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setConstraintsSMALoader(false);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setConstraintsSMALoader(false);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.constraintsSMAFilterConfig, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setConstraintsSMALoader(true);
    try {
      setFilterValuesOnRender(dependency);
      props.setConstraintsSMALoader(false);
      setSMADetails(true);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsSMALoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"constraintsSMAFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
      />
      {SMADetails && (
        <Loader loader={props.constraintsSMALoader}>
          <div className={globalClasses.marginHorizontal}>
            <SMATableComponent
              displaySnackMessages={displaySnackMessages}
              selectedFilters={filterValuesOnRender}
              enableDownload={props.enableDownload}
            />
          </div>
        </Loader>
      )}
    </>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    constraintsSMALoader:
      inventorysmartReducer.inventorySmartConstraints.constraintsSMALoader,
    constraintsSMAFilterConfig:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsSMAFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration["constraintsSMAFilterConfig"],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setConstraintsSMAFilterConfig: (body) =>
      dispatch(setConstraintsSMAFilterConfig(body)),
    resetConstraintsStoreState: (body) =>
      dispatch(resetConstraintsStoreState(body)),
    setConstraintsSMALoader: (body) => dispatch(setConstraintsSMALoader(body)),
    setFilterConfiguration: (body) => dispatch(setFilterConfiguration(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SMAComponent);
