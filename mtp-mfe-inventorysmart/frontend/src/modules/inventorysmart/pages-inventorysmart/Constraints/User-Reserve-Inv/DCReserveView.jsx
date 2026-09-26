import React, { useState, useEffect } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { fetchFilterConfig } from "../../inventorysmart-utility";
import { connect } from "react-redux";
import {
  setDcUserReserveLoader,
  setDcUserReserveFilterConfig,
  resetConstraintsStoreState,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty } from "lodash";
import {
  getActiveEntityFilter,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import Loader from "core/Utils/Loader/loader";
import DCReserveTable from "./DCReserveTable";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH } from "config/constants";

const DCReserveView = (props) => {
  const [filterDependency, setFilterDependency] = useState([]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setDcUserReserveLoader(false);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setDcUserReserveLoader(true);
        let response = await fetchFilterConfig("DC User Reserve");
        props.setDcUserReserveFilterConfig(response);
        props.setDcUserReserveLoader(false);
      } catch (e) {
        handleErrorMessage(e);
      }
      if (
        props.filterDashboardConfiguration &&
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      ) {
        props.setDcUserReserveFilterConfig(
          props?.filterDashboardConfiguration?.filterConfig?.[0]
            ?.originalFilterDashboardData
        );
        return;
      }
    };
    getInitialFilterConfiguration();
    return () => resetConstraintsStoreState();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.dcUserReserveFilterConfig)
    ) {
      props.setDcUserReserveLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.dcUserReserveFilterConfig),
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
            "dcUserReserveFilterConfig",
            filterConfigData,
            "User Reserve Inv Screen DC Reserve Tab"
          );
          props.setFilterConfiguration(filterConfig);
          props.setDcUserReserveLoader(false);
        } catch (e) {
          handleErrorMessage(e);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.dcUserReserveFilterConfig, props.savedFilterSelection]);

  const displaySnackMessages = (
    message,
    variance,
    disableOnClose = false,
    autoHideDuration
  ) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: disableOnClose,
        ...(autoHideDuration && { autoHideDuration }),
      },
    });
  };

  const onFilterDashboardClick = async (dependencyData, filterData) => {
    setFilterDependency(dependencyData);
  };

  return (
    <>
      <CoreComponentScreen
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"dcUserReserveFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        autoHideFilterButton={true}
      />
      {!isEmpty(filterDependency) && (
        <Loader loader={props.dcUserReserveLoader}>
          <DCReserveTable
            displaySnackMessages={displaySnackMessages}
            handleErrorMessage={handleErrorMessage}
            filterDependency={filterDependency}
            uniqueKey={props.uniqueKey}
            cache={props.cache}
            setKeyValueInCache={props.setKeyValueInCache}
          />
        </Loader>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    dcUserReserveFilterConfig:
      inventorysmartReducer.inventorySmartConstraints.dcUserReserveFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration["dcUserReserveFilterConfig"],
    savedFilterSelection: filterReducer.savedFilterSelection,
    dcUserReserveLoader:
      inventorysmartReducer.inventorySmartConstraints.dcUserReserveLoader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDcUserReserveFilterConfig: (body) =>
      dispatch(setDcUserReserveFilterConfig(body)),
    setDcUserReserveLoader: (body) => dispatch(setDcUserReserveLoader(body)),
    resetConstraintsStoreState: (body) =>
      dispatch(resetConstraintsStoreState(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DCReserveView);
