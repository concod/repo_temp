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

import DailyAllocationTableView from "./daily-allocation-table-view";
import {
  setDailyAllocationFilterConfiguration,
  clearDailyAllocationStates,
} from "../../../services-inventorysmart/Allocation-Reports/daily-allocation-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
  displaySnackMessages,
} from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import GenericCardsPanel from "../../KPI/GenericCardPanel";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { DAS_REPORTS_MODULE } from "../CustomHooks/moduleConstants";
import { DAILY_ALLOCATION_SUMMARY_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { getKPIIconComponent } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { useReportingStyles } from "../reportingStyles";


const DailyAllocationSummary = (props) => {
  const reportingClasses = useReportingStyles();
  const [panelData, setPanelData] = React.useState(null);
  const [dailyAllocationDetails, setDailyAllocationDetails] = useState(false);
  const [dailyAllocationDatePicker, setDailyAllocationDatePicker] = useState({
    datePicker: "",
  });
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  const globalClasses = globalStyles();

  const render3DIcons = props.moduleConfig?.[DAS_REPORTS_MODULE]?.render3DIcons ?? false;

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "Inventorysmart Daily Allocation Reports"
        );
        props.setDailyAllocationFilterConfiguration(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setDailyAllocationFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    getInitialFilterConfiguration();
    return () => {
      return clearDailyAllocationStates();
    };
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.dailyAllocationFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.dailyAllocationFilterConfiguration),
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: DAILY_ALLOCATION_SUMMARY_SCREEN_NAME,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterDataWithCustomFilter = response?.map((data_key) => {
            if (data_key?.column_name === "daily-allocation-date") {
              data_key = { ...data_key, disableFuture: true };
              return data_key;
            }
            return data_key;
          });
          const filterConfigData = [
            {
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: DAILY_ALLOCATION_SUMMARY_SCREEN_NAME,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "dailyAllocationFilterConfiguration",
            filterConfigData,
            "DAILY_ALLOCATION_SUMMARY_SCREEN_NAME"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
         handleErrorMessage(err);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.dailyAllocationFilterConfiguration, props.savedFilterSelection]);

  useEffect(() => {
    let panelData = {
      noSubMetrics: true, // Only carters has no subMetrics right now.
      expandedLayout: "center",
      panelHeader: "KPIs",
      cardData: [],
    };
    if (!isEmpty(props.dailyAllocationTableData?.aggregated_data)) {
      let summaryLabels =
        props?.moduleConfig?.[DAS_REPORTS_MODULE]?.dailyAllocationSummaryLabels || [];
      // Filter out KPIs with visible: false
      let visibleSummaryLabels = summaryLabels.filter(item => item.visible !== false);
      let dailySummaryCardsWithIcons = visibleSummaryLabels.map((item,index) => {
        let countWithComma = parseInt(
          props.dailyAllocationTableData.aggregated_data?.[0]?.[item.key]
        );
      
        const cardData = {
          ...item,
          value:
            !countWithComma && countWithComma != 0
              ? "-"
              : countWithComma?.toLocaleString(),
        };
        
        if (render3DIcons && item.iconType) {
          cardData.renderIcon = () => getKPIIconComponent(item.iconType, index);
        }
        
        return cardData;
      });
      panelData.cardData = dailySummaryCardsWithIcons;
      setPanelData(panelData);
    } else {
      setPanelData(null);
    }
  }, [props.dailyAllocationTableData]);

  const applyFilters = async (_filterElements, dependency) => {
    let filterDatePicker = dependency.filter(
      (item) => item.attribute_name === "daily-allocation-date"
    );
    if (filterDatePicker[0].values === "Invalid date") {
      displaySnackMessages("Select the date", "error", props);
    } else {
      try {
        setDailyAllocationDetails(false);
        let filterDependency = dependency.filter(
          (item) => item.attribute_name !== "daily-allocation-date"
        );
        setDailyAllocationDatePicker({
          datePicker: filterDatePicker[0].values,
        });
        setFilterValuesOnRender(filterDependency);
        setDailyAllocationDetails(true);
      } catch (err) {
        handleErrorMessage(err);
      }
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"dailyAllocationFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        customDependencyValue={getCustomDependencyFilter}
        autoHideFilterButton={true}
        customClassName={reportingClasses.filterSectionSpacing}
      >
      {dailyAllocationDetails && (
          <Loader loader={props.dailyAllocationScreenLoader }>
            <div className={globalClasses.marginBottom24}>
              {panelData && <GenericCardsPanel panelData={panelData} />}
            </div>
            <DailyAllocationTableView
              displaySnackMessages={displaySnackMessages}
              dailyAllocationSelectedFilters={filterValuesOnRender}
              selectedDate={dailyAllocationDatePicker}
              appliedFilterData={
                props.filterDashboardConfiguration?.appliedFilterData
              }
              excelDownloadMetaData={
                props.inventorysmartScreenConfig?.excelDownloadMetaData
              }
            />
          </Loader>
        )}
      </CoreComponentScreen>
    </div>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    dailyAllocationScreenLoader:
      inventorysmartReducer.inventorySmartDailyAllocationService
        .dailyAllocationScreenLoader,
    dailyAllocationFilterConfiguration:
      inventorysmartReducer.inventorySmartDailyAllocationService
        .dailyAllocationFilterConfiguration,
    dailyAllocationTableData:
      inventorysmartReducer.inventorySmartDailyAllocationService
        .dailyAllocationTableData,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "dailyAllocationFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    allocationReportsConfiguration:
      store.inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setDailyAllocationFilterConfiguration: (body) =>
      dispatch(setDailyAllocationFilterConfiguration(body)),
    clearDailyAllocationStates: (body) =>
      dispatch(clearDailyAllocationStates(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DailyAllocationSummary);
