import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { useTranslation } from "impact-ui-v3";
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
  columnLabelHandler,
  getRowDataPayload,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { cloneDeep, isArray, isNumber } from "lodash";
import { useRef } from "react";
import { useStyles } from "../../ada-styles";
import { forwardRef } from "react";
import { getPredictedFiscalWeeks } from "modules/ada/utils-ada/formatData";

const DemandSelectionWrapper = forwardRef((props, ref) => {
  const {
    activeKey,
    updateAllData,
    lastEditedDrivers,
    counterOnEditHierarchyChange,
  } = props;
  const [loader, setLoader] = useState(false);
  const classes = useStyles();
  const { t } = useTranslation();
  const [selectedGraphFilters, setSelectedGraphFilters] = useState([]);
  const [columnData, setColumnData] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [filterApplied, setFilterApplied] = useState(false);
  const [refreshTable, setRefreshTable] = useState(true);
  const [tableDataPayload, setTableDataPayload] = useState(null);
  const selectedChannelFilter = useRef([]);
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const { makeDemandSelectionCAll } = ref;

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
        const response = adaReducer.tableColumns;

        const isWeekEndDateLabelEnabled =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.is_week_end_date_label_enabled;

        let showWeekEndDateLabelEnabled =
          isWeekEndDateLabelEnabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W";

        const isWeekStartDateLabelEnabled =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.is_week_start_date_label_enabled;

        let showWeekStartDateLabelEnabled =
          isWeekStartDateLabelEnabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W";

        // let updatedFormattedResponse = response?.data?.data.map((el, i) => {
        let updatedFormattedResponse = response?.mfp_choice_table?.map(
          (el, i) => {
            if (!el.dimension) {
              return {
                ...el,
                is_lockable: false,
                is_editable: true,
                disabled: true,
                is_sortable: false,
                is_searchable: false,
                // label: showWeekEndDateLabelEnabled
                //   ? weekEndDateLabel(el.label, adaReducer)
                //   : `F${adaReducer?.switchTimeLine?.[0]?.value}-${el.label}`,
                label: columnLabelHandler(
                  el.label,
                  adaReducer,
                  showWeekEndDateLabelEnabled,
                  [],
                  false,
                  showWeekStartDateLabelEnabled
                ),
              };
            }
            if (["final_forecast", "channel"].indexOf(el.column_name) === -1) {
              return { ...el, is_sortable: false, is_searchable: true };
            }
            return { ...el, is_sortable: false, is_searchable: false };
          }
        );
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
          adaReducer?.isEligible
        );

        let adjustedPayload = [];

        let predictedFiscalWeeks = getPredictedFiscalWeeks(
          payloadData?.filters?.timeline?.start_week_id,
          payloadData?.filters?.timeline?.end_week_id,
          true,
          adaReducer,
          () => null
        );

        predictedFiscalWeeks?.forEach((elem) => {
          adjustedPayload.push({
            fiscal_timeperiod_id: elem,
            promo_percentage: null,
            price_point: null,
            modified: [],
          });
        });

        payloadData.adjusted = adjustedPayload;
        payloadData.filters.mfp = true;
        payloadData.adjusted_price_point = [];

        // if (!payloadData?.filters?.timeline?.end_week_id) return;

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

        // Skip API call if there's no adjusted data to process or if a request is already in progress
        if (!payloadData.adjusted?.length || !makeDemandSelectionCAll.current) {
          return;
        }
        makeDemandSelectionCAll.current = false;
        setTableDataPayload(cloneDeep(payloadData));
        let response = await getDemandSelectionTableData(payloadData);
        if (response.data.status) {
          setLoader(false);
          setRefreshTable(false);
          let id = 0;
          response?.data?.data?.map((val) => {
            val.id = id++;
          });
          setRowData(response?.data?.data);
        }
      } catch (error) {
      } finally {
        makeDemandSelectionCAll.current = true;
      }
    };
    if (refreshTable) {
      fetchColumnData();
      fetchRowData();
    }
  }, [refreshTable, adaReducer?.product, adaReducer.tableColumns]);

  return (
    <div style={{ paddingBottom: "1rem" }}>
      <div
        className={classes.forecastKpiContainer}
        style={{ marginTop: "20px", padding: "1rem" }}
      >
        <h3 style={{ margin: "1rem 0 1rem 0", fontWeight: "500" }}>
          {t("ada.accordionTitles.decisionDashboard")}
        </h3>
        <LoadingOverlay loader={loader} isCustomLoader={true}>
          {/* <DemandSelectionFilters
            activeKey={activeKey}
            setLoader={setLoader}
            fetchChartData={fetchTableData}
            // setSelectedGraphFilters={setSelectedGraphFilters}
            setFilterApplied={setFilterApplied}
          /> */}
          <DemandSelectionTableData
            columnData={columnData}
            rowData={rowData}
            setRefreshTable={setRefreshTable}
            setLoader={setLoader}
            ref={ref}
            tableDataPayload={tableDataPayload}
            parentLoader={loader}
            {...props}
          />
        </LoadingOverlay>
      </div>
    </div>
  );
});

export default DemandSelectionWrapper;
