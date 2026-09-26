import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { Paper, Grid } from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";

import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import colours from "core/Styles/colours";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";

import DailyAllocationTableView from "./daily-allocation-table-view";
import CardComponent from "../components/CardComponent";
import {
  setDailyAllocationFilterConfiguration,
  clearDailyAllocationStates,
} from "../../../services-inventorysmart/Allocation-Reports/daily-allocation-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  datePickerConstant,
} from "../../../constants-inventorysmart/stringConstants";

const DailyAllocationSummary = (props) => {
  const [dailySummaryCards, setDailySummaryCards] = useState([]);
  const [dailyAllocationDetails, setDailyAllocationDetails] = useState(false);
  const [dailyAllocationDatePicker, setDailyAllocationDatePicker] = useState({
    datePicker: "",
  });
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setDailyAllocationFilterConfiguration(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => clearDailyAllocationStates();
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
            screenName: props.screenName,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterDataWithCustomFilter = [
            ...response,
            ...datePickerConstant,
          ];

          const filterConfigData = [
            {
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "dailyAllocationFilterConfiguration",
            filterConfigData,
            "Daily Allocation Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.dailyAllocationFilterConfiguration, props.savedFilterSelection]);

  useEffect(() => {
    if (!isEmpty(props.dailyAllocationTableData?.aggregated_data)) {
      //Select KPI Labels on basis of tenant
      let summaryLabels =
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report
          ?.drillDown?.dailyAllocationSummaryLabels || [];
      let dailySummaryCardsWithIcons = summaryLabels.map((item) => {
        let color = colours.royalBlue;
        let icon = "inventory_icon";
        let countWithComma = parseInt(
          props.dailyAllocationTableData.aggregated_data[0][item.key]
        );
        return {
          ...item,
          color,
          icon,
          count:
            !countWithComma && countWithComma != 0
              ? "-"
              : countWithComma?.toLocaleString(),
        };
      });
      setDailySummaryCards(dailySummaryCardsWithIcons);
    }
  }, [props.dailyAllocationTableData]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    let filterDatePicker = dependency.filter(
      (item) => item.attribute_name === "daily-allocation-date"
    );
    if (filterDatePicker[0].values === "Invalid date") {
      displaySnackMessages("Select the date", "error");
    } else {
      try {
        let filterDependency = dependency.filter(
          (item) => item.attribute_name !== "daily-allocation-date"
        );
        setDailyAllocationDatePicker({
          datePicker: filterDatePicker[0].values,
        });
        setFilterValuesOnRender(filterDependency);
        setDailyAllocationDetails(true);
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
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
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"dailyAllocationFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      {dailyAllocationDetails && (
        <Loader loader={props.dailyAllocationScreenLoader}>
          <div className={globalClasses.marginHorizontal}>
            <Grid container className={classes.kpiContainer} spacing={3}>
              {dailySummaryCards.map((item) => {
                return (
                  <Grid item xs={3}>
                    <Paper elevation={3} className={classes.summaryContainer}>
                      <CardComponent kpiItem={item} />
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
            <DailyAllocationTableView
              enableDownload={props.enableDownload}
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
          </div>
        </Loader>
      )}
    </>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
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
