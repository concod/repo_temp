import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import classNames from "classnames";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { isEmpty, cloneDeep } from "lodash";
import { ButtonGroup } from "impact-ui-v3";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import { FormControl, Grid } from "@mui/material";
import { Select, Switch, RadioButtonGroup } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

import {
  ERROR_MESSAGE,
  OMS_HIGH_LEVEL_SUMMARY_TAB_LIST,
} from "modules/oms/constants-oms/stringConstants";
import {
  setOmsHighLevelSummaryTableLoader,
  setOmsHighLevelSummaryConfigLoader,
  setHighLevelSummaryState,
  setRedirectionDetails,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { ORDER_MANAGEMENT_ORDER_DETAILS } from "modules/oms/constants-oms/routeConstants";
import {
  getOmsHighLevelSummaryTableConfigForVendorStore,
  getOmsHighLevelSummaryTableDataForStore,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

const RIGHT_LABEL_SWITCH = "Units";
const LEFT_LABEL_SWITCH = "Cost";

const HighLevelSummaryTableForVendorStore = ({
  selectedMonthTab,
  ...props
}) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const navigate = useNavigate();

  const VIEWBY_DROPDOWN_OPTIONS =
    props?.screenConfig?.oms_dashboard?.high_level_summary
      ?.view_by_dropdown_options || [];

  const DEFAULT_VIEW_BY_OPTION =
    props?.screenConfig?.oms_dashboard?.high_level_summary
      ?.default_selected_view_by_option;

  const SHOW_UNITS_COST_SWITCH =
    props?.vendorToStoreScreenConfig?.high_level_summary
      ?.show_units_cost_switch || false;

  const TAB_LIST_OPTIONS =
    props?.vendorToStoreScreenConfig?.high_level_summary?.tab_list ||
    OMS_HIGH_LEVEL_SUMMARY_TAB_LIST;

  const [tableColumns, setTableColumns] = useState([]);
  const [render, setRender] = useState(false);
  const [metricTypeChecked, setMetricTypeChecked] = useState(true);
  const [currentViewByOptions, setCurrentViewByOptions] = useState(
    VIEWBY_DROPDOWN_OPTIONS
  );
  const [selectedViewByOptions, setSelectedViewByOptions] = useState(
    props?.highLevelSummaryState?.selectedViewByOptions
      ? props?.highLevelSummaryState?.selectedViewByOptions
      : DEFAULT_VIEW_BY_OPTION || VIEWBY_DROPDOWN_OPTIONS[0]
  );
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);

  const tableInstance = useRef({});

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.extra?.is_grouping_key) {
          item.cellRenderer = "agGroupCellRenderer";
          if (item.type === "link") {
            item.rowGroup = true;
            item.cellRendererParams = {
              suppressCount: true,
              innerRenderer: (params, extraProps) => (
                <CellRenderers
                  cellData={params}
                  column={item}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              ),
            };
          }
        }
        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  useEffect(() => {
    localStorage.removeItem("isRedirectedFromDashboardToOms");
    localStorage.removeItem("redirect_filter_level");
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem("omsRedirectionDetails");
  }, []);

  useEffect(() => {
    props?.setHighLevelSummaryState({
      level_of_hierarchy_label: selectedViewByOptions?.label,
      level_of_hierarchy_id: selectedViewByOptions?.value,
      level_of_hierarchy_value: "",
      selectedViewByOptions: selectedViewByOptions,
    });
    setRender(false);
  }, [selectedViewByOptions, selectedMonthTab, metricTypeChecked]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) setRender(false);
  }, [props.selectedFilters]);

  //Navigates to Order Details Page on Click of a Column
  const onClickColumn = async (data) => {
    try {
      const currentMetricType = metricTypeChecked
        ? RIGHT_LABEL_SWITCH.toLowerCase()
        : LEFT_LABEL_SWITCH.toLowerCase();
      const currentDateFilter = selectedMonthTab;
      const currentSelectedHierarchy = selectedViewByOptions?.value;

      const stateToSet = {
        level_of_hierarchy_label: selectedViewByOptions?.label,
        level_of_hierarchy_id: selectedViewByOptions?.value,
        level_of_hierarchy_value: data?.[selectedViewByOptions?.value],
        selectedViewByOptions: selectedViewByOptions,
        selected_hierarchy: currentSelectedHierarchy,
        metric_type: currentMetricType,
        date_filter: currentDateFilter,
      };
      props?.setHighLevelSummaryState(stateToSet);
      const redirectDetails = {
        source: "high_level_summary",
        target: "order_details",
      };
      if (props?.dateFilters?.length) {
        redirectDetails.dateFilters = props?.dateFilters;
      } else {
        redirectDetails.dateFilters =
          props?.redirectionDetails?.dateFilters || [];
      }
      props?.setRedirectionDetails(redirectDetails);

      setTimeout(() => {
        navigate(ORDER_MANAGEMENT_ORDER_DETAILS);
      }, 100);
    } catch (error) {
      console.log("Error in onClickColumn", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        props.setOmsHighLevelSummaryConfigLoader(true);
        const dateFilter = selectedMonthTab;
        const metricType = metricTypeChecked
          ? RIGHT_LABEL_SWITCH.toLowerCase()
          : LEFT_LABEL_SWITCH.toLowerCase();
        const queryParams = `date_filter=${dateFilter}&metric_type=${metricType}&selected_hierarchy=${selectedViewByOptions?.value}`;
        let columns = await props.getOmsHighLevelSummaryTableConfigForVendorStore(
          queryParams
        );
        const viewByColumnNames = VIEWBY_DROPDOWN_OPTIONS?.map(
          (option) => option.value
        );
        let cols = columns?.data?.data.filter((item) => {
          if (viewByColumnNames.includes(item.column_name)) {
            if (item.column_name === selectedViewByOptions?.value)
              item.is_hidden = false;
            else {
              item.is_hidden = true;
              return false;
            }
          }
          item.onClick = (tableInfo) => {
            onClickColumn(tableInfo?.cellData?.data || {});
          };
          return true;
        });

        let formattedColumns = agGridColumnFormatter(
          cols,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );

        let updatedColumns = checkForEditability(formattedColumns);

        setTableColumns(updatedColumns);
        setRender(true);
        props.setOmsHighLevelSummaryConfigLoader(false);
      } catch (error) {
        console.log("Error in Fetching Columns", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    // For vendor store, always render when component is ready
    if (!render) {
      fetchColumnConfig();
    }
  }, [render]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      //OMS Dashboard Filters
      const appliedOmsFilters =
        props?.omsFilterConfiguration?.length === 0 ||
        !props?.omsFilterConfiguration
          ? props?.selectedFilters
          : props?.omsFilterConfiguration;
      // For vendor store, allow fetching data even with empty filters

      const appliedOmsProductFilters = appliedOmsFilters?.filter(
        (filter) =>
          filter.display_type !== "fiscalCalendar" &&
          filter.filter_id !== "fiscal_date_range" &&
          filter.filter_id !== "fiscal_date_range_receipt"
      );
      let appliedOmsDateFilters = [];
      if (props?.ropDate?.start_date && props?.ropDate?.end_date) {
        appliedOmsDateFilters.push(props?.ropDate);
      }
      if (
        props?.recommRecieptDate?.start_date &&
        props?.recommRecieptDate?.end_date
      ) {
        appliedOmsDateFilters.push(props?.recommRecieptDate);
      }

      props?.setOmsHighLevelSummaryTableLoader(true);
      let body = {
        filters: [...appliedOmsProductFilters],
        global_date_filter: [...appliedOmsDateFilters],
        meta: { ...manualbody, limit: { limit: 10, page: pageIndex + 1 } },
        selected_hierarchy: selectedViewByOptions?.value,
        metric_type: metricTypeChecked
          ? RIGHT_LABEL_SWITCH.toLowerCase()
          : LEFT_LABEL_SWITCH.toLowerCase(),
        date_filter: selectedMonthTab,
      };

      let response = await props.getOmsHighLevelSummaryTableDataForStore(body);
      if (response?.data?.status) {
        let formatedData = agGridRowFormatter(response.data.data);
        props.setOmsHighLevelSummaryTableLoader(false);
        return { data: formatedData, totalCount: response?.data?.total };
      } else {
        props.setOmsHighLevelSummaryTableLoader(false);
        return { data: [], totalCount: 0 };
      }
    } catch (error) {
      console.log("Error in fetching Data", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOmsHighLevelSummaryTableLoader(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  //To Handle Switch Button between Units and Cost
  const onKpiSummarySelectChange = (event) => {
    let userSelection = event.target.checked;
    if (userSelection) setMetricTypeChecked(true);
    else setMetricTypeChecked(false);
  };

  const getTopRightOptions = () => {
    let options = [];

    //Units and Cost Switch
    if (SHOW_UNITS_COST_SWITCH) {
      options.push(
        <FormControl style={{ transform: "translateX(15px)" }}>
          <RadioButtonGroup
            aria-label="costUnitsSwitch"
            name="costUnitsSwitch"
            orientation="row"
            id="costUnitsSwitch"
            onChange={(e) => {
              setMetricTypeChecked(
                e.target.value === RIGHT_LABEL_SWITCH.toLowerCase()
              );
            }}
            selectedOption={
              metricTypeChecked
                ? RIGHT_LABEL_SWITCH.toLowerCase()
                : LEFT_LABEL_SWITCH.toLowerCase()
            }
            options={[
              {
                label: LEFT_LABEL_SWITCH,
                value: LEFT_LABEL_SWITCH.toLowerCase(),
              },
              {
                label: RIGHT_LABEL_SWITCH,
                value: RIGHT_LABEL_SWITCH.toLowerCase(),
              },
            ]}
          />
        </FormControl>
      );
    }

    return options;
  };

  const getLeftOptions = () => {
    return (
      <ButtonGroup
        selectedOption={selectedMonthTab}
        exclusive
        onChange={props?.handleMonthTab}
        aria-label="text alignment"
        options={TAB_LIST_OPTIONS}
      />
    );
  };

  const WHITE_CONTAINER_STYLE = {
    backgroundColor: "#FFFFFF",
    borderRadius: "13px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e0e0e0",
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
    padding: "16px",
    paddingBottom: "0px",
  };
  return (
    <>
      <div style={WHITE_CONTAINER_STYLE}>
        <Loader
          loader={props.omsHighLevelSummaryConfigLoader}
          minHeight={"260px"}
        >
          {render && (
            <div>
              <div
                style={{
                  justifyContent: "space-between",
                  paddingBottom: "16px",
                }}
                className={globalClasses.flexRow}
              >
                {getLeftOptions()}
                {/*View By Dropdown */}
                {VIEWBY_DROPDOWN_OPTIONS?.length > 0 && (
                  <FormControl
                    size="small"
                    sx={{ minWidth: 240 }}
                    className={classNames(
                      classes.flexRow,
                      globalClasses.verticalAlignCenter
                    )}
                  >
                    <Select
                      id="viewBySelection"
                      currentOptions={currentViewByOptions}
                      setCurrentOptions={setCurrentViewByOptions}
                      initialOptions={VIEWBY_DROPDOWN_OPTIONS}
                      selectedOptions={selectedViewByOptions}
                      setSelectedOptions={setSelectedViewByOptions}
                      isOpen={isOpenViewBy}
                      setIsOpen={setIsOpenViewBy}
                      label="View by"
                      labelOrientation="left"
                    />
                  </FormControl>
                )}
              </div>
              {tableColumns?.length ? (
                <AgGridComponent
                  columns={tableColumns}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  selectAllHeaderComponent={false}
                  hideSelectAllRecords={false}
                  loadTableInstance={loadTableInstance}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  cacheBlockSize={10}
                  uniqueRowId={selectedViewByOptions?.value}
                  pagination={true}
                  suppressClickEdit={true}
                  hideChildSelection={true}
                  showSetAll={false}
                  purgeClosedRowNodes={true}
                  suppressAggFuncInHeader={true}
                  groupDisplayType={"custom"}
                  treeData={true}
                  childKey={"status_obj"}
                  tableHeader="High Level Summary"
                  topRightOptions={getTopRightOptions()}
                />
              ) : (
                <div className={globalClasses.centerAlign}>
                  <EmptyStateWrapper />
                </div>
              )}
            </div>
          )}
        </Loader>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    omsHighLevelSummaryConfigLoader:
      store.omsReducer.orderManagementService.omsHighLevelSummaryConfigLoader,
    omsHighLevelSummaryTableLoader:
      store.omsReducer.orderManagementService.omsHighLevelSummaryTableLoader,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    omsFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementVendorStoreFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    redirectionDetails: store.omsReducer.orderManagementService.redirectDetails,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOmsHighLevelSummaryConfigLoader: (payload) =>
    dispatch(setOmsHighLevelSummaryConfigLoader(payload)),
  getOmsHighLevelSummaryTableConfigForVendorStore: (payload) =>
    dispatch(getOmsHighLevelSummaryTableConfigForVendorStore(payload)),
  setOmsHighLevelSummaryTableLoader: (payload) =>
    dispatch(setOmsHighLevelSummaryTableLoader(payload)),
  getOmsHighLevelSummaryTableDataForStore: (payload) =>
    dispatch(getOmsHighLevelSummaryTableDataForStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setHighLevelSummaryState: (payload) =>
    dispatch(setHighLevelSummaryState(payload)),
  setRedirectionDetails: (payload) => dispatch(setRedirectionDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HighLevelSummaryTableForVendorStore);
