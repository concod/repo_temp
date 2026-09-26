import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  errorHandlerWithWarnings,
  infoHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import { closeSnack } from "core/actions/snackbarActions";
import { cloneDeep } from "lodash";
import {
  getForecastColumns,
  getForecastData,
  saveDriverForecast,
  saveMultiplier,
  setApiTriggerAfterSave,
  setFullScreenLoaderCount,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  setAllForecastMultiplierData,
  setForecastMultiplierData,
  setSaveOperationPerformedCounter,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import {
  chartDataPayload,
  forecastMultiplierTabNamelabelmapping,
  getEditForecastRowData,
  isNumber,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { DISABLE_SAVE_AFTER_8_WEEK_CHANGE } from "../../../../constants-ada/stringContants";

export const forecastMultiplierAllColumnsPayload = (adaReducer, showIAData) => {
  const payload = chartDataPayload(
    adaReducer,
    null,
    null,
    showIAData,
    null,
    adaReducer?.isEligible,
    null,
    null,
    null,
    "forecast_multiplier"
  );
  return payload;
};

const setCellsToBeDisabled = (row, params, isAdjustedUserForecastEdited) => {
  if (
    (row?.row === "multiplier" ||
      (row?.isAdjustedUserForecastEdited &&
        row?.row === "adjusted_forecast")) &&
    row?.disabled_fiscal_weeks
  ) {
    if (row?.disabled_fiscal_weeks?.length > 0) {
      return row?.disabled_fiscal_weeks.includes(params.column_name);
    }
  }
  return row?.isAdjustedUserForecastEdited
    ? row?.row !== "multiplier" && row?.row !== "adjusted_forecast"
    : row?.row !== "multiplier";
};

export const fetchMultiplierColumnData = async (
  adaReducer,
  payload,
  allowEdit,
  id,
  isCalledFromMFPDashboard
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.ForecastMultiplier;

  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];

  let isMultiplierRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.isMultiplierRoundOff;

  let bodyPayload = {
    ...payload.filters.timeline,
    aggregation_level: payload.filters.aggregation_level,
    formatter,
  };
  let extraPayload = {
    fullWidth: true,
    roundOffTo: decimalsToShow,
    ignoreValueGetter: isMultiplierRoundOff && isMultiplierRoundOff,
  };
  const response = await getForecastColumns(bodyPayload, extraPayload);

  const isWeekEndDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled && adaReducer?.switchTimeLine?.[0]?.value === "W";

  let updatedFormattedResponse = response?.data?.data.map((el, i) => {
    if (el.column_name === "forecast_multiplier") {
      let columnObject = {
        ...el,
        lockPosition: "left",
        is_sortable: false,
        is_searchable: false,
        is_frozen: true,
      };
      return columnObject;
    }
    if (el.column_name !== "forecast_multiplier") {
      let columnObject = {
        ...el,
        is_lockable: false,
        is_editable: allowEdit,
        is_sortable: false,
        is_searchable: false,
        label: showWeekEndDateLabelEnabled
          ? weekEndDateLabel(el.label, adaReducer)
          : `F${adaReducer?.switchTimeLine?.[0]?.value}-${el.label}`,
        disabled: setCellsToBeDisabled,
      };

      //Enable Comma Seperated Formats for IA Tab
      const enableCommaFormatting =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.numberFormatting?.enableCommaFormatting === true;

      if ((id === "IA" || isCalledFromMFPDashboard) && enableCommaFormatting) {
        columnObject.is_editable = true;
        columnObject.disabled = true;
      }

      return columnObject;
    }
    return { ...el, is_sortable: false, is_searchable: false };
  });
  const formattedResponse = agGridColumnFormatter(updatedFormattedResponse);
  return formattedResponse;
};

export const fetchMultiplierRowData = async (
  payload,
  id,
  showIAData,
  lastEditedDrivers,
  adaReducer,
  dispatch,
  getAllWeeksResponse,
  isCalledFromMFPDashboard,
  isPredictedDataFetched
) => {
  // setForecastMultiplierLoader((prevState) => prevState + 1);
  let [
    forecastMultiplierPayload,
    updatedAdjustedDiscountPayload,
  ] = getEditForecastRowData(
    payload,
    adaReducer,
    getAllWeeksResponse,
    lastEditedDrivers,
    isPredictedDataFetched
  );
  forecastMultiplierPayload.filters.tab_name =
    forecastMultiplierTabNamelabelmapping[id];
  if (adaReducer?.clientConfig?.attribute_value?.mfp) {
    forecastMultiplierPayload.filters.mfp =
      adaReducer?.clientConfig?.attribute_value?.mfp;
  }

  let response = await getForecastData(forecastMultiplierPayload);

  let forecastMultiplierData = response?.data?.data;

  let formattedData = {};
  let fiscalWeeksFetched = updatedAdjustedDiscountPayload?.map(
    (elem) => elem?.fiscal_timeperiod_id
  );

  let formattedResponse = response?.data?.data;

  for (let key in forecastMultiplierData?.[0] || {}) {
    if (isNumber(key)) {
      formattedData[key] = {
        IA: forecastMultiplierData?.[0]?.[key],
        ratio: forecastMultiplierData?.[1]?.[key],
        adjusted: forecastMultiplierData?.[2]?.[key],
      };
    } else {
      formattedData[key] = forecastMultiplierData?.[0]?.[key];
    }
  }

  fiscalWeeksFetched.forEach((week) => {
    if (!formattedData?.hasOwnProperty([week])) {
      formattedData[week] = {
        IA: null,
        ratio: null,
        adjusted: null,
      };

      formattedResponse[0][week] = null;
      formattedResponse[1][week] = null;
      formattedResponse[2][week] = null;
    }
  });

  dispatch(
    setAllForecastMultiplierData({
      key: id,
      value: formattedData,
    })
  );

  // For IA tab, we will only show original IA Forecast
  if (showIAData && response?.data?.data?.length) {
    // TO DO - the label manipulation will be done by backend
    formattedResponse?.splice(1, 2);
  }

  if (
    !adaReducer?.clientConfig?.attribute_value?.mfp ||
    isCalledFromMFPDashboard
  ) {
    return formattedResponse;
  } else {
    //Removing Final Forecast from ADA Visual Forecast Table when MFP is enabled
    let combinedData = [];
    formattedResponse.map((data) => {
      if (data.row !== "final_forecast") combinedData.push(data);
    });
    return combinedData;
  }
};

export const columnDataHandler = (
  columnData,
  historicColumnData,
  columnState
) => {
  let index = columnData.findIndex(
    (col) => col.column_name === "forecast_multiplier"
  );
  let updatedColumns = [
    columnData[index],
    ...historicColumnData,
    ...columnData.slice(index + 1),
  ]?.filter((el) => el);

  if (!columnState?.length) return updatedColumns;

  let stateSyncedColumns = cloneDeep(updatedColumns);
  columnState.forEach((state) => {
    let column = stateSyncedColumns.find(
      (col) => col.column_name === state.colId
    );
    if (column) {
      column.is_hidden = state.hide;
      column.pinned = state.pinned;
    }
  });
  return stateSyncedColumns;
};

export const handleAppendHistoricPredictedResponse = (
  newRowData,
  oldRowData
) => {
  let clonedOldRowData = cloneDeep(oldRowData);
  let clonedNewRowData = cloneDeep(newRowData);
  if (oldRowData?.length) {
    const updatedData = [];

    // merging historical data into new row data
    clonedNewRowData.forEach((el) => {
      let clonedRow = cloneDeep(el);
      let oldFiscalRowData =
        clonedOldRowData?.find(
          (row) => row?.forecast_multiplier === el?.forecast_multiplier
        ) || {};

      if (oldFiscalRowData) {
        Object.assign(oldFiscalRowData, clonedRow);
        updatedData.push(oldFiscalRowData);
      } else {
        updatedData.push(clonedRow);
      }
    });

    return updatedData;
  } else {
    return newRowData;
  }
};

export const handleWeekAppendResponse = (rowData, appendResponse) => {
  if (!rowData?.length) {
    return appendResponse;
  }
  rowData.forEach((el) => {
    let updatedFiscalData = appendResponse?.find((row) => row.row === el.row);
    if (updatedFiscalData) {
      Object.assign(el, updatedFiscalData);
    }
  });

  return rowData;
};

export const onSaveForecast = async (
  adaReducer,
  dispatch,
  forecastMultiplierInstance,
  initialRowData,
  lastEditedDrivers,
  id,
  columnData,
  setInitialRowData,
  customLimitSave,
  setDisableSaveButton,
  lastSavedDrivers,
  setLastSavedDrivers,
  isSaveInProgressRef,
  saveApiCountRef,
  cb
) => {
  try {
    const payload = chartDataPayload(adaReducer);

    let multiplierTableAllRows = [];
    let multiplierColumns = {};

    forecastMultiplierInstance?.current?.api?.forEachNode((node) => {
      multiplierTableAllRows.push(node.data);
      if (node.id === "multiplier") {
        multiplierColumns = cloneDeep(node.data);
      }
    });

    if (!multiplierColumns) {
      return;
    }

    // Adjusted IA, multiplier and Adjuster User
    let multiplierTableMainRows = multiplierTableAllRows.filter(
      (row) =>
        row.row === "multiplier" ||
        row.row === "adjusted_forecast" ||
        row.row === "forecast"
    );

    const columnWeeks = columnData?.map(({ column_name }) => +column_name);

    let adjustedForecastMultiplier = [];
    for (let week in multiplierColumns) {
      const selectedPromoType =
        lastEditedDrivers?.find(
          ({ fiscal_timeperiod_id }) => +fiscal_timeperiod_id === week
        )?.selected_promo_type || null;

      const currentWeekDriver =
        lastEditedDrivers?.find(
          ({ fiscal_timeperiod_id }) => +fiscal_timeperiod_id === week
        )?.[selectedPromoType] || null;

      if (isNumber(week)) {
        if (
          multiplierColumns[week] === initialRowData?.[1]?.[week] ||
          !columnWeeks.includes(+week)
        )
          continue;
        adjustedForecastMultiplier.push({
          fiscal_timeperiod_id: week,
          promo_percentage:
            selectedPromoType === "promo_percentage" ? currentWeekDriver : null,
          price_point:
            selectedPromoType === "price_point" ? currentWeekDriver : null,
          multiplier: multiplierColumns[week],
        });
      }
    }

    let currentSavedDrivers = cloneDeep(lastEditedDrivers) || [];

    const compareDriversModified = (obj1, obj2) => {
      return (
        obj1.selected_promo_type === obj2.selected_promo_type &&
        obj1.promo_percentage === obj2.promo_percentage &&
        obj1.fiscal_timeperiod_id === obj2.fiscal_timeperiod_id
      );
    };

    let updatedDrivers = currentSavedDrivers.filter((b) => {
      let indexFound = lastSavedDrivers.findIndex((a) =>
        compareDriversModified(a, b)
      );
      return indexFound == -1;
    });

    // Warn user to not do more than 8 weeks change, if he does disable save button
    const customSavedAllowed =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_saved_allowed;
    if (customLimitSave) {
      if (adjustedForecastMultiplier?.length === customSavedAllowed) {
        let infoMessage =
          DISABLE_SAVE_AFTER_8_WEEK_CHANGE + customSavedAllowed + "weeks";
        infoHandler(dispatch, infoMessage, 15000);
      }
      if (adjustedForecastMultiplier?.length > customSavedAllowed) {
        setDisableSaveButton(true);
      }
      return true;
    }

    if (!adjustedForecastMultiplier.length && !updatedDrivers?.length) {
      return infoHandler(dispatch, "No  change detected");
    }

    cb();
    dispatch(setFullScreenLoaderCount(1));

    infoHandler(
      dispatch,
      "Forecast Save in progress, this might take some time",
      4000
    );

    let adjustedPromoPercentage = updatedDrivers?.filter(
      ({ selected_promo_type }) => selected_promo_type === "promo_percentage"
    );
    let adjustedPricePoint = updatedDrivers?.filter(
      ({ selected_promo_type }) => selected_promo_type === "price_point"
    );

    const checkUserSaveStatus =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.check_user_save_status;
    let countofSaveApiCalled = 0;
    if (updatedDrivers?.length && adjustedForecastMultiplier?.length) {
      countofSaveApiCalled = 2;
    }
    if (checkUserSaveStatus) {
      isSaveInProgressRef.current = countofSaveApiCalled;
    }

    if (updatedDrivers?.length) {
      let lastSavedDrivers = cloneDeep(lastEditedDrivers);

      await saveDriverForecast({
        ...payload,
        adjusted: adjustedPromoPercentage,
        adjusted_price_point: adjustedPricePoint,
      });
      if (checkUserSaveStatus) {
        saveApiCountRef.current = 1;
        if (!countofSaveApiCalled) {
          isSaveInProgressRef.current = 1;
        }

        // call save DF Save API then call the checkUserSaveStatus api if that is returning false
        // then only proceed for Multiplier save
      } else {
        if (!adjustedForecastMultiplier.length) {
          if (id === "adjusted") {
            dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (id === "scenario1") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (id === "scenario2") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
          }
          successHandler(dispatch, "Forecast Saved successfully");
          dispatch(setSaveOperationPerformedCounter());
        }
      }

      let updatedLastSavedDrivers = lastSavedDrivers.map((elem) => elem);
      setLastSavedDrivers(updatedLastSavedDrivers);
    }

    if (adjustedForecastMultiplier.length) {
      if (saveApiCountRef.current) {
        let interval = setInterval(async () => {
          if (!saveApiCountRef.current) {
            clearInterval(interval);

            await saveMultiplier({
              ...payload,
              adjusted: adjustedForecastMultiplier,
            });
            saveApiCountRef.current = 1;
            setInitialRowData(cloneDeep(multiplierTableMainRows));
            setDisableSaveButton(false);
          }
        }, 200);
      } else {
        await saveMultiplier({
          ...payload,
          adjusted: adjustedForecastMultiplier,
        });

        if (checkUserSaveStatus) {
          saveApiCountRef.current = 1;
          if (!countofSaveApiCalled) {
            isSaveInProgressRef.current = 1;
          }
        } else {
          if (id === "adjusted") {
            dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (id === "scenario1") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (id === "scenario2") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
          }
          dispatch(setSaveOperationPerformedCounter());
        }

        setInitialRowData(cloneDeep(multiplierTableMainRows));
        setDisableSaveButton(false);

        if (!checkUserSaveStatus)
          successHandler(dispatch, "Forecast Saved successfully");
      }
    }
    setTimeout(() => {
      dispatch(closeSnack());
    }, 3000);
  } catch (error) {
    dispatch(closeSnack());
    errorHandlerWithWarnings(dispatch, error);
  } finally {
    dispatch(setFullScreenLoaderCount(-1));
  }
};

const getMultiplierColumnsnmultiplierTableRows = (
  forecastMultiplierInstance
) => {
  let multiplierColumns = {};
  let multiplierTableAllRows = [];

  forecastMultiplierInstance?.current?.api?.forEachNode((node) => {
    multiplierTableAllRows.push(node.data);
    if (node.id === "multiplier") {
      multiplierColumns = cloneDeep(node.data);
    }
  });

  // Adjusted IA, multiplier and Adjuster User
  let multiplierTableMainRows = multiplierTableAllRows.filter(
    (row) =>
      row?.row === "multiplier" ||
      row?.row === "adjusted_forecast" ||
      row?.row === "forecast"
  );

  return [multiplierColumns, multiplierTableMainRows];
};

const getAdjustedForecastMultiplier = (
  multiplierColumns,
  lastEditedDrivers,
  columnData,
  initialRowData
) => {
  let adjustedForecastMultiplier = [];

  const columnWeeks = columnData?.map(({ column_name }) => +column_name);

  for (let week in multiplierColumns) {
    const selectedPromoType =
      lastEditedDrivers?.find(
        ({ fiscal_timeperiod_id }) => +fiscal_timeperiod_id === week
      )?.selected_promo_type || null;

    const currentWeekDriver =
      lastEditedDrivers?.find(
        ({ fiscal_timeperiod_id }) => +fiscal_timeperiod_id === week
      )?.[selectedPromoType] || null;

    if (isNumber(week)) {
      if (
        multiplierColumns[week] === initialRowData?.[1]?.[week] ||
        !columnWeeks.includes(+week)
      )
        continue;
      adjustedForecastMultiplier.push({
        fiscal_timeperiod_id: week,
        promo_percentage:
          selectedPromoType === "promo_percentage" ? currentWeekDriver : null,
        price_point:
          selectedPromoType === "price_point" ? currentWeekDriver : null,
        multiplier: multiplierColumns[week],
      });
    }
  }

  return adjustedForecastMultiplier;
};

const compareDriversModified = (obj1, obj2) => {
  return (
    obj1.selected_promo_type === obj2.selected_promo_type &&
    obj1.promo_percentage === obj2.promo_percentage &&
    obj1.fiscal_timeperiod_id === obj2.fiscal_timeperiod_id
  );
};

export const onSaveForecastViaWebsocket = async (
  adaReducer,
  dispatch,
  forecastMultiplierInstance,
  initialRowData,
  lastEditedDrivers,
  id,
  columnData,
  setInitialRowData,
  customLimitSave,
  setDisableSaveButton,
  lastSavedDrivers,
  setLastSavedDrivers,
  isSaveInProgressRef,
  saveApiCountRef,
  cb,
  setActiveTransactionData,
  setLoading
) => {
  try {
    const payload = chartDataPayload(adaReducer);
    delete payload.filters.store_hierarchy.store_group;
    let [
      multiplierColumns,
      multiplierTableMainRows,
    ] = getMultiplierColumnsnmultiplierTableRows(forecastMultiplierInstance);

    if (!multiplierColumns) {
      return;
    }

    let adjustedForecastMultiplier = getAdjustedForecastMultiplier(
      multiplierColumns,
      lastEditedDrivers,
      columnData,
      initialRowData
    );

    let currentSavedDrivers = cloneDeep(lastEditedDrivers) || [];

    let updatedDrivers = currentSavedDrivers.filter((b) => {
      let indexFound = lastSavedDrivers.findIndex((a) =>
        compareDriversModified(a, b)
      );
      return indexFound == -1;
    });

    // Warn user to not do more than 8 weeks change, if he does disable save button
    const customSavedAllowed =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_saved_allowed;
    if (customLimitSave) {
      if (adjustedForecastMultiplier?.length === customSavedAllowed) {
        let infoMessage =
          DISABLE_SAVE_AFTER_8_WEEK_CHANGE + customSavedAllowed + "weeks";
        infoHandler(dispatch, infoMessage, 15000);
      }
      if (adjustedForecastMultiplier?.length > customSavedAllowed) {
        setDisableSaveButton(true);
      }
      return true;
    }

    if (!adjustedForecastMultiplier.length && !updatedDrivers?.length) {
      return infoHandler(dispatch, "No  change detected");
    }

    // below fn is used to update active tab in Deep dive section i.e. multiplier or view edit hierarchy
    cb();
    dispatch(setFullScreenLoaderCount(1));
    setLoading(true);
    infoHandler(
      dispatch,
      "Forecast Save in progress, this might take some time",
      4000
    );

    let adjustedPromoPercentage = updatedDrivers?.filter(
      ({ selected_promo_type }) => selected_promo_type === "promo_percentage"
    );
    let adjustedPricePoint = updatedDrivers?.filter(
      ({ selected_promo_type }) => selected_promo_type === "price_point"
    );
    delete payload.filters.store_hierarchy.store_group;
    let countofSaveApiCalled = 0;
    if (updatedDrivers?.length && adjustedForecastMultiplier?.length) {
      countofSaveApiCalled = 2;
    }

    if (updatedDrivers?.length && countofSaveApiCalled !== 2) {
      await updateDrivers(
        payload,
        lastEditedDrivers,
        setLastSavedDrivers,
        adjustedPromoPercentage,
        adjustedPricePoint,
        setDisableSaveButton,
        setActiveTransactionData
      );
    }

    if (adjustedForecastMultiplier?.length && countofSaveApiCalled !== 2) {
      await updateMultiplier(
        payload,
        adjustedForecastMultiplier,
        multiplierTableMainRows,
        setActiveTransactionData,
        setDisableSaveButton,
        setInitialRowData
      );
    }

    if (countofSaveApiCalled == 2) {
      await updateDrivers(
        payload,
        lastEditedDrivers,
        setLastSavedDrivers,
        adjustedPromoPercentage,
        adjustedPricePoint,
        setDisableSaveButton,
        setActiveTransactionData,
        true
      );
      isSaveInProgressRef.current = true;

      let interval = setInterval(async () => {
        if (!isSaveInProgressRef.current) {
          clearInterval(interval);

          await updateMultiplier(
            payload,
            adjustedForecastMultiplier,
            multiplierTableMainRows,
            setActiveTransactionData,
            setDisableSaveButton,
            setInitialRowData
          );
          isSaveInProgressRef.current = false;
        }
      }, 200);
    }
  } catch (error) {
    console.log("🚀 ~ error:", error);
    dispatch(closeSnack());
    errorHandlerWithWarnings(dispatch, error);
  } finally {
    dispatch(setFullScreenLoaderCount(-1));
  }
};

export const updateDrivers = async (
  payload,
  lastEditedDrivers,
  setLastSavedDrivers,
  adjustedPromoPercentage,
  adjustedPricePoint,
  setDisableSaveButton,
  setActiveTransactionData,
  isMultiplierUpdated = false
) => {
  let lastSavedDrivers = cloneDeep(lastEditedDrivers);

  const saveResponse = await saveDriverForecast({
    ...payload,
    adjusted: adjustedPromoPercentage,
    adjusted_price_point: adjustedPricePoint,
  });
  setActiveTransactionData({
    transactionId: saveResponse?.data?.data?.transactionId,
    status: "pending",
    isMultiplierUpdated,
  });

  let updatedLastSavedDrivers = lastSavedDrivers.map((elem) => elem);
  setLastSavedDrivers(updatedLastSavedDrivers);
  setDisableSaveButton(false);
};

export const updateMultiplier = async (
  payload,
  adjustedForecastMultiplier,
  multiplierTableMainRows,
  setActiveTransactionData,
  setDisableSaveButton,
  setInitialRowData
) => {
  const saveResponse = await saveMultiplier({
    ...payload,
    adjusted: adjustedForecastMultiplier,
  });

  setActiveTransactionData({
    transactionId: saveResponse?.data?.data?.transactionId,
    status: "pending",
  });

  setInitialRowData(cloneDeep(multiplierTableMainRows));
  setDisableSaveButton(false);
};

export const onMultiplierChange = (
  row,
  column,
  forecastMultiplierInstance,
  id,
  dispatch,
  isMultiplierReset
) => {
  let colId = column.colId;
  let colData = row[colId];

  let cellValue = null;
  forecastMultiplierInstance.current.api.forEachNode((rowNode) => {
    //Setting Multiplier as 1 when negative values are entered.
    if (isMultiplierReset && rowNode.id === "multiplier") {
      rowNode.setDataValue(colId, 1);
    }

    if (rowNode.id === "forecast") {
      cellValue = rowNode.data[colId];
    }
    if (rowNode.id === "adjusted_forecast") {
      let newCellValue = (colData * cellValue).toFixed(3);
      rowNode.setDataValue(colId, newCellValue);

      // Ratio of Adjusted/IA for Chart
      let formattedData = {
        [colId]: {
          ratio: colData,
          IA: cellValue,
          adjusted: newCellValue,
        },
      };
      dispatch(
        setForecastMultiplierData({
          key: id,
          value: formattedData,
        })
      );
    }
  });
};

export const onAdjustedUserForecastChange = (
  row,
  column,
  forecastMultiplierInstance,
  id,
  dispatch,
  isMultiplierReset
) => {
  let colId = column.colId;
  let colData = row[colId];

  let cellValue = null;
  let newCellValue;
  forecastMultiplierInstance.current.api.forEachNode((rowNode) => {
    if (rowNode.rowIndex === 0) {
      cellValue = rowNode.data[colId];
    }
    if (isMultiplierReset && rowNode.rowIndex === 1) {
      rowNode.setDataValue(colId, 1);
    }
    if (rowNode.rowIndex === 1) {
      newCellValue = colData / cellValue;
      // if(newCellValue)
      rowNode.setDataValue(colId, newCellValue);
    }
    if (rowNode.rowIndex === 2) {
      // Ratio of Adjusted/IA for Chart
      let formattedData = {
        [colId]: {
          ratio: Number(newCellValue),
          IA: cellValue,
          adjusted: colData.toString(),
        },
      };
      dispatch(
        setForecastMultiplierData({
          key: id,
          value: formattedData,
        })
      );
    }
  });
};
