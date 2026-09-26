import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import {
  setStoreUserReserveFilterConfig,
  resetConstraintsStoreState,
  setStoreUserReserveLoader,
  getStoreReserveInvHold,
} from "../../../services-inventorysmart/Constraints/constraints-services";
import DownloadButton from "../../StoreInventoryAlerts/components/Download";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH } from "config/constants";

const StoreReserveViewComponent = (props) => {
  const [unmount, setUnmount] = useState(false);
  const [storeReserveCol, setStoreReserveCol] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [isDisabled, setIsDisabled] = useState(true);
  const [payload, setPayload] = useState([]);

  const storeUserReserveTableInstance = useRef(null);
  const storeUserReserveFilters = useRef([]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setStoreUserReserveLoader(false);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setStoreUserReserveLoader(true);
        let response = await fetchFilterConfig("Store User Reserve");
        props.setStoreUserReserveFilterConfig(response);
        props.setStoreUserReserveLoader(false);
      } catch (e) {
        handleErrorMessage(e);
      }
      if (
        props.filterDashboardConfiguration &&
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      ) {
        props.setStoreUserReserveFilterConfig(
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
      !isEmpty(props.storeUserReserveFilterConfig)
    ) {
      props.setStoreUserReserveLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.storeUserReserveFilterConfig),
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
            "storeUserReserveFilterConfig",
            filterConfigData,
            "User Reserve Inv Screen Store Reserve Tab"
          );
          props.setFilterConfiguration(filterConfig);
          props.setStoreUserReserveLoader(false);
        } catch (e) {
          handleErrorMessage(e);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.storeUserReserveFilterConfig, props.savedFilterSelection]);

  useEffect(() => {
    if (!isEmpty(filterDependency)) {
      storeUserReserveFilters.current = filterDependency;
      setUnmount(true);
    }
  }, [filterDependency]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onFilterDashboardClick = async (dependencyData, filterData) => {
    setUnmount(false);
    let col = [];
    col = await getColumnsAg("table_name=store_reserve_list")();
    setStoreReserveCol(col);
    setFilterDependency(dependencyData);
  };

  const setNewTableInstance = (params) => {
    storeUserReserveTableInstance.current = params;
  };

  const manualCallBackStoreUserReserver = async (
    manualbody,
    pageIndex,
    params
  ) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: storeUserReserveFilters.current,
    };
    try {
      setPayload(body);
      let response = await props.getStoreReserveInvHold(body);
      setIsDisabled(pageIndex == 0 && !response.data.data.length);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        return {
          data: response.data?.data,
          totalCount: response.data?.total,
        };
      }
    } catch (e) {
      handleErrorMessage(e);
      return {
        data: [],
        totalCount: 0,
      };
    } finally {
      props.setConstraintsUserReserveLoader(false);
    }
  };

  const renderDownloadButton = () => {
    return (
      <DownloadButton
        url={"/inventory-smart/inventory-hold/store-reserve/download"}
        disable={isDisabled}
        requestBody={payload}
        columns={storeReserveCol}
        excludeURLObject={null}
        includeExclusionFilter={true}
      />
    );
  };

  return (
    <>
      <CoreComponentScreen
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"storeUserReserveFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        autoHideFilterButton={true}
      />
      {unmount && (
        <Loader loader={props.storeUserReserveLoader}>
            <AgGridComponent
              rowModelType="serverSide"
              serverSideStoreType="partial"
              columns={storeReserveCol}
              manualCallBack={(body, pageIndex, param) =>
                manualCallBackStoreUserReserver(body, pageIndex, param)
              }
              cacheBlockSize={props.pageSize || 10}
              paginationPageSize={props.pageSize}
              disablePaginationForSinglePage={true}
              uniqueRowId={"product_code"}
              loadTableInstance={setNewTableInstance}
              topRightOptions={renderDownloadButton()}
            />
        </Loader>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    storeUserReserveFilterConfig:
      inventorysmartReducer.inventorySmartConstraints
        .storeUserReserveFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "storeUserReserveFilterConfig"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    storeUserReserveLoader:
      inventorysmartReducer.inventorySmartConstraints.storeUserReserveLoader,
    pageSize: inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setStoreUserReserveLoader: (body) =>
      dispatch(setStoreUserReserveLoader(body)),
    setStoreUserReserveFilterConfig: (body) =>
      dispatch(setStoreUserReserveFilterConfig(body)),
    resetConstraintsStoreState: (body) =>
      dispatch(resetConstraintsStoreState(body)),
    setFilterConfiguration: (body) => dispatch(setFilterConfiguration(body)),
    getStoreReserveInvHold: (body) => dispatch(getStoreReserveInvHold(body)),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreReserveViewComponent);
