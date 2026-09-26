import { getDriverForecastColumns } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  AllDriverForecastPayload,
  weekEndDateLabel,
  columnLabelHandler,
} from "modules/ada/utils-ada/utilityFunctions";
import React, { forwardRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useHistoricAllDriverForecast } from "./useHistoricAllDriverForecast";
import { useActualsDiscount } from "./useActualsDiscount";
import AllDriverForecastTable from "./AllDriverForecastTable";
import { useLastYearDiscount } from "./useLastYearDiscount";
import { useTranslation } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import { driverForecastColumnsTransformer } from "modules/ada/utils-ada/formatData";
import { useLoading } from "../LoaderWrapper";

const AllDriverForecastTableWrapper = (props, ref) => {
  const { t } = useTranslation();
  const {
    showPrevious,
    activeKey,
    setDriverForecastLoader,
    showIAData,
    allowEdit,
    allDriverForecastRowData,
    initialAllDriverForecastRowData,
    onDriverForecastValueChange,
    setInitialAllDriverForecastRowData,
    setAllDriverForecastRowData,
    isApiSuccess,
    setIsApiSuccess,
  } = props;

  let {
    allDriverForecastRef,
    promoTypeTableInstance,
    bottomGrid,
    topGrid,
  } = ref;

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const { loading } = useLoading();

  var discount_value_isNonEditable =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.discountValue_isNonEditable;

  const hideDiscountValue =
    adaReducer?.clientConfig?.attribute_value?.show_features?.hideDiscountValue;

  let driverForecastColumns = adaReducer?.tableColumns?.drivers_of_forecast;
  const { historicAllDriverForecastColumnData } = useHistoricAllDriverForecast(
    showIAData,
    setDriverForecastLoader
  );

  useActualsDiscount(
    allDriverForecastRef,
    setAllDriverForecastRowData,
    setInitialAllDriverForecastRowData,
    isApiSuccess
  );

  useLastYearDiscount(
    allDriverForecastRef,
    setAllDriverForecastRowData,
    setInitialAllDriverForecastRowData,
    isApiSuccess
  );

  const [columnData, setColumnData] = useState([]);

  const setCellsToBeDisabled = (row, params) => {
    if (!allowEdit) {
      return true;
    }
    if (
      row?.row === "value" &&
      (row[params.id] === null || row[params.id] === undefined)
    ) {
      return true;
    }
    return row?.row !== "value";
  };

  useEffect(() => {
    if (!activeKey || !driverForecastColumns?.length) return;
    const payload = chartDataPayload(adaReducer);

    const fetchColumnData = async () => {
      try {
        var isEditable = true;
        setDriverForecastLoader((prevState) => prevState + 1);
        const driverForecastPayload = AllDriverForecastPayload(
          payload,
          showIAData,
          adaReducer
        );
        let response = cloneDeep(
          driverForecastColumnsTransformer(driverForecastColumns, adaReducer)
        );

        if (discount_value_isNonEditable) {
          isEditable = false;
        }

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

        let updatedFormattedResponse = response?.map((el, i) => {
          if (i !== 0) {
            return {
              ...el,
              is_lockable: false,
              is_editable: isEditable,
              disabled: setCellsToBeDisabled,
              is_sortable: false,
              is_searchable: false,
              label:
                i === 1
                  ? el.label
                  : columnLabelHandler(
                      el.label,
                      adaReducer,
                      showWeekEndDateLabelEnabled,
                      [],
                      false,
                      showWeekStartDateLabelEnabled
                    ),
            };
          }
          return { ...el, is_sortable: false, is_searchable: false };
        });

        const formattedResponse = agGridColumnFormatter(
          updatedFormattedResponse
        );
        setColumnData(formattedResponse);
      } catch (error) {
        // errorHandler(dispatch, error);
      } finally {
        setDriverForecastLoader((prevState) => prevState - 1);
      }
    };

    fetchColumnData();
  }, [activeKey, JSON.stringify(driverForecastColumns)]);

  useEffect(() => {
    if (columnData?.length && allDriverForecastRowData?.length) {
      try {
        let cols = cloneDeep(columnData);

        let isUpdated = false;
        allDriverForecastRowData?.map((row) => {
          if (row?.row === "value") {
            for (const key in row) {
              let columnId = key;
              let index = cols.findIndex((col) => col.id === columnId);
              if (
                key !== "row" &&
                key !== "drivers" &&
                key !== "is_cal" &&
                key !== "overall_value" &&
                key !== "promo_type" &&
                (row[key] === null || row[key] === undefined)
              ) {
                if (index >= 0) {
                  isUpdated = true;
                  cols[index].is_editable = false;
                  cols[index].is_disabled = true;
                  cols[index].extra = {
                    ...cols[index].extra,
                    staticToolTip: t(
                      "ada.editHierarchy.disablingDiscountValueMessage"
                    ),
                  };
                }
              } else {
                if (index >= 0) {
                  cols[index].extra = {
                    ...cols[index].extra,
                    staticToolTip: "",
                  };
                }
              }
            }
          }
        });
        if (isUpdated) {
          let updatedColumns = agGridColumnFormatter(cols);
          const updatedData = updatedColumns.map((column, i) => ({
            ...column,
            cellRenderer: columnData[i].cellRenderer,
          }));
          setColumnData(updatedData);
        }
      } catch (error) {
        console.log("Something went wrong!", error);
      }
    }
  }, [allDriverForecastRowData]);

  useEffect(() => {
    if (!columnData?.length) return;
    let cols = cloneDeep(columnData);

    cols.forEach((elem) => {
      elem.cellStyle = {
        ...elem.cellStyle,
        pointerEvents: loading ? "none" : "all",
      };
    });

    let updatedColumns = agGridColumnFormatter(cols);

    setColumnData(updatedColumns);
  }, [loading]);

  return (
    <div>
      <AllDriverForecastTable
        rowdata={
          showPrevious
            ? initialAllDriverForecastRowData
            : allDriverForecastRowData
        }
        showPrevious={showPrevious}
        allDriverForecastRowData={allDriverForecastRowData}
        initialAllDriverForecastRowData={initialAllDriverForecastRowData}
        onDriverForecastValueChange={onDriverForecastValueChange}
        columnData={columnData}
        historicAllDriverForecastColumnData={
          historicAllDriverForecastColumnData
        }
        ref={{
          allDriverForecastRef,
          promoTypeTableInstance,
          // bottomGrid,
          // topGrid,
        }}
      />
    </div>
  );
};

export default forwardRef(AllDriverForecastTableWrapper);
