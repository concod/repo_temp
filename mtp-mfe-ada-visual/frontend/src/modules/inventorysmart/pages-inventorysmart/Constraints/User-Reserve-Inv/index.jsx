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

import UserReserveTableComponent from "./UserReserveTable";
import {
  setConstraintsUserReserveFilterConfig,
  resetConstraintsStoreState,
  setConstraintsUserReserveLoader,
} from "../../../services-inventorysmart/Constraints/constraints-services";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const UserReserveInvComponent = (props) => {
  const [userReserveDetails, setUserReserveDetails] = useState(false);
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  const globalClasses = globalStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setConstraintsUserReserveLoader(true);
        let response = await fetchFilterConfig(
          "Inventorysmart Constraints User Reserve"
        );
        props.setConstraintsUserReserveFilterConfig(response);
        props.setConstraintsUserReserveLoader(false);
      } catch (e) {
        props.setConstraintsUserReserveLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => resetConstraintsStoreState();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.constraintsUserReserveFilterConfig)
    ) {
      props.setConstraintsUserReserveLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.constraintsUserReserveFilterConfig),
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
            "constraintsUserReserveFilterConfig",
            filterConfigData,
            "User Reserve Inv Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setConstraintsUserReserveLoader(false);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setConstraintsUserReserveLoader(false);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.constraintsUserReserveFilterConfig, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setConstraintsUserReserveLoader(true);
    try {
      setFilterValuesOnRender(dependency);
      props.setConstraintsUserReserveLoader(false);
      setUserReserveDetails(true);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsUserReserveLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"constraintsUserReserveFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
      />
      {userReserveDetails && (
        <Loader loader={props.constraintsUserReserveLoader}>
          <div className={globalClasses.marginHorizontal}>
            <UserReserveTableComponent
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
    constraintsUserReserveLoader:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveLoader,
    constraintsUserReserveFilterConfig:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "constraintsUserReserveFilterConfig"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setConstraintsUserReserveFilterConfig: (body) =>
      dispatch(setConstraintsUserReserveFilterConfig(body)),
    resetConstraintsStoreState: (body) =>
      dispatch(resetConstraintsStoreState(body)),
    setConstraintsUserReserveLoader: (body) =>
      dispatch(setConstraintsUserReserveLoader(body)),
    setFilterConfiguration: (body) => dispatch(setFilterConfiguration(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UserReserveInvComponent);
