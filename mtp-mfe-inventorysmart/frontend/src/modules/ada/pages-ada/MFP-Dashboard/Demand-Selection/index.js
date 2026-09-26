import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { ACCORDION_TITLES } from "modules/ada/constants-ada/stringContants";
import React, { useState } from "react";
import DemandSelectionFilters from "./DemandSelectionFilters";
import DemandSelectionTableData from "./DemandSelectionTableData";
import { useEffect } from "react";
import { forecastMultiplierAllColumnsPayload } from "../../Dashboard/edit-forecast/forecast-multiplier/helper";
import {
  getDemandSelectionColumns,
  getDemandSelectionTableData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useSelector } from "react-redux";
import {
  chartDataPayload,
  getRowDataPayload,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { cloneDeep, isArray, isNumber } from "lodash";
import { useRef } from "react";
import { useStyles } from "../../ada-styles";
import { forwardRef } from "react";

const DemandSelectionWrapper = forwardRef((props, ref) => {
  const {
    activeKey,
    updateAllData,
    lastEditedDrivers,
    counterOnEditHierarchyChange,
  } = props;
  const [loader, setLoader] = useState(false);
  const classes = useStyles();
  const [selectedGraphFilters, setSelectedGraphFilters] = useState([]);
  const [columnData, setColumnData] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [filterApplied, setFilterApplied] = useState(false);
  const [refreshTable, setRefreshTable] = useState(true);
  const selectedChannelFilter = useRef([]);
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const fetchTableData = async (data) => {
    setSelectedGraphFilters(data);
    setRefreshTable(true);
  };

  const demand_selection_static_column =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.demand_selection_static_column;

  const choice_level_desc =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.mfp?.level_desc;

  useEffect(() => {
    const payload = forecastMultiplierAllColumnsPayload(adaReducer);
    const fetchColumnData = async () => {
      try {
        setLoader(true);
        let decimalsToShow =
          adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
            ?.decimalConfig?.ForecastMultiplier;
        let formatter =
          adaReducer?.clientConfig?.attribute_value
            ?.decimal_rounding_off_mapping?.[decimalsToShow];
        let bodyPayload = {
          ...payload.filters.timeline,
          aggregation_level: payload.filters.aggregation_level,
          formatter,
        };
        let extraPayload = {
          fullWidth: true,
          roundOffTo: decimalsToShow,
        };
        const response = await getDemandSelectionColumns(
          bodyPayload,
          extraPayload
        );

        const isWeekEndDateLabelEnabled =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.is_week_end_date_label_enabled;

        let showWeekEndDateLabelEnabled =
          isWeekEndDateLabelEnabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W";

        let updatedFormattedResponse = response?.data?.data.map((el, i) => {
          if (i > demand_selection_static_column || i > 3) {
            return {
              ...el,
              is_lockable: false,
              is_editable: true,
              disabled: true,
              is_sortable: false,
              is_searchable: false,
              label: showWeekEndDateLabelEnabled
                ? weekEndDateLabel(el.label, adaReducer)
                : `F${adaReducer?.switchTimeLine?.[0]?.value}-${el.label}`,
            };
          }
          //temp fix for Demand Selection table mapping
          if (el.column_name === "article") {
            return { ...el, column_name: "choice" };
          }
          if (el.column_name === choice_level_desc) {
            return { ...el, column_name: "choice_desc" };
          }
          if (["final_forecast", "channel"].indexOf(el.column_name) === -1) {
            return { ...el, is_sortable: false, is_searchable: true };
          }
          return { ...el, is_sortable: false, is_searchable: false };
        });
        const formattedResponse = agGridColumnFormatter(
          updatedFormattedResponse
        );
        setColumnData(formattedResponse);
        // for comparison tab
        //dispatch(setForecastColumns(columnResponse));
      } catch (error) {}
    };
    const fetchRowData = async (
      week,
      selected_promo_type = {
        label: "% Off",
        value: "promo_percentage",
      },
      promo_percentage = null,
      price_point = null,
      updatedLastEditedDrivers = []
    ) => {
      try {
        setLoader(true);
        setRowData([]);
        const payloadData = chartDataPayload(
          adaReducer,
          null,
          null,
          null,
          null,
          true,
          null,
          null,
          null,
          "MFP"
        );
        selectedGraphFilters.length !== 0 &&
          selectedGraphFilters?.map((val) => {
            if (val?.filter_id === "channel") {
              let filtersData = [];
              payloadData.filters.store_hierarchy = val?.values?.reduce(
                (acc, curr) => {
                  filtersData.push(
                    isArray(curr.values)
                      ? curr.values.map(({ value }) => value)
                      : curr.value
                  );
                  acc[val?.filter_id] = filtersData;
                  return acc;
                },
                {}
              );
            } else {
              payloadData.filters.store_hierarchy = {};
            }
          });
        // if(selectedGraphFilters.length===0 && filterApplied)
        // {
        //   payloadData.filters.store_hierarchy = {}
        // }
        let rowDataPayload = getRowDataPayload(
          payloadData,
          updatedLastEditedDrivers,
          adaReducer,
          week,
          selected_promo_type,
          promo_percentage,
          price_point
        );
        let response = await getDemandSelectionTableData(rowDataPayload);
        if (response.data.status) {
          setLoader(false);
          setRefreshTable(false);
          let id = 0;
          response?.data?.data?.map((val) => {
            val.id = id++;
          });
          setRowData(response?.data?.data);
        }
      } catch (error) {}
    };
    if (refreshTable) {
      fetchColumnData();
      fetchRowData();
    }
  }, [refreshTable, adaReducer?.product, activeKey]);

  return (
    <div className={classes.forecastKpiContainer}>
      <LoadingOverlay loader={loader} isCustomLoader={true}>
        <DemandSelectionTableData
          columnData={columnData}
          rowData={rowData}
          setRefreshTable={setRefreshTable}
          setLoader={setLoader}
          ref={ref}
          {...props}
        />
      </LoadingOverlay>
    </div>
  );
});

export default DemandSelectionWrapper;
