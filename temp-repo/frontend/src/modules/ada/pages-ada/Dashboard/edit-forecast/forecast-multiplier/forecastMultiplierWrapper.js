import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { makeStyles } from "@mui/styles";
import { useDispatch, useSelector } from "react-redux";

import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import SaveIcon from "@mui/icons-material/Save";

import { cloneDeep } from "lodash";
import { useHistoricData } from "./useHistoricData";
import {
  fetchMultiplierColumnData,
  fetchMultiplierRowData,
  forecastMultiplierAllColumnsPayload,
  handleAppendHistoricPredictedResponse,
  handleWeekAppendResponse,
  onSaveForecast,
  onSaveForecastViaWebsocket,
} from "./helper";
import { useOriginalIAForecast } from "./useOriginalIAForecast";
import { usePastYearsForecast } from "./usePastYearsForecast";
import {
  setDisableSaveBtn,
  setForecastColumns,
  setSaveOperationPerformedCounter,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { Button } from "impact-ui-v3";
import {
  appendPrevYearsData,
  appendActualsDiscount,
  getAllRows,
  numberFormattingWithCommas,
} from "modules/ada/utils-ada/utilityFunctions";
import { useActualsForecast } from "./useActualsForecast";
import ForecastMultiplier from ".";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  DISABLING_MULTIPLIER_MESSAGE,
  SAVE_COMPLETED_STATUS,
  SAVE_IN_PROGRESS_STATUS,
} from "modules/ada/constants-ada/stringContants";
import {
  getStatusCheckForUserLevelUpdate,
  setApiTriggerAfterSave,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  errorHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import { useLoading } from "../../LoaderWrapper";
import { useSaveForecastStatus } from "modules/ada/utils-ada/customHooks/useSaveForecastStatus";
import { forwardRef } from "react";

const ForecastMultiplierWrapper = (props, ref) => {
  const {
    activeKey,
    // driverForecastVal,
    lastEditedDrivers,
    allowEdit,
    showIAData,
    id,
    selectedForecast,
    isCalledFromMFPDashboard,
    isSummaryTable,
    showOriginalIAForecast = true,
    lastSavedDrivers,
    setLastSavedDrivers,
    index,
    activeTab,
    setSavePerformedTab,
    setActiveTransactionData,
    setIsLoading,
    hideSave,
    setIsForecastSumarryEdited,
  } = props;

  let { saveApiCountRef, isSaveInProgressRef } = ref;

  // Use loading from props if available, otherwise use useLoading hook
  const loadingHook = useLoading();
  const loading = props.loading ?? loadingHook.loading;
  const setLoading = props.setLoading ?? loadingHook.setLoading;

  let forecastMultiplierInstance = useRef();

  const classes = useStyles();
  const globalClasses = globalStyles();

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const [columnData, setColumnData] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [isApiSuccssCounter, setIsApiSuccssCounter] = useState(0);
  const [isPredictedDataFetched, setIsPredictedDataFetched] = useState(false);
  const [initialRowData, setInitialRowData] = useState([]);
  const [forecastMultiplierLoader, setForecastMultiplierLoader] = useState(0);
  const [isMultiplierChanged, setIsMultiplierChanged] = useState(0);
  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const dispatch = useDispatch();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const isAdjustedUserForecastEdited =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.adjustedUserForecastEditable;

  const forecastMultiplierTableRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.ForecastMultiplier;

  const enableCommaFormatting =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.numberFormatting?.enableCommaFormatting === true;

  const isHistoricMFPRequired =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_mfp_on_historic_columns;

  const { historicColumnData } = useHistoricData(
    showIAData,
    id,
    forecastMultiplierInstance,
    setForecastMultiplierLoader,
    setIsApiSuccssCounter,
    isPredictedDataFetched,
    isCalledFromMFPDashboard,
    "forecast_multiplier",
    isHistoricMFPRequired
  );

  useOriginalIAForecast(
    showOriginalIAForecast,
    id,
    forecastMultiplierInstance,
    isApiSuccssCounter
  );

  usePastYearsForecast(forecastMultiplierInstance, isApiSuccssCounter);
  useActualsForecast(
    forecastMultiplierInstance,
    isApiSuccssCounter,
    isCalledFromMFPDashboard
  );

  const onSave = async (customLimitSave = false) => {
    const checkUserSaveStatus =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.check_user_save_status;

    if (checkUserSaveStatus) {
      onSaveForecastViaWebsocket(
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
      );
    } else {
      onSaveForecast(
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
      );
    }
  };

  const cb = () => {
    setSavePerformedTab(index);
  };

  if (ref.onSaveRef) {
    ref.onSaveRef.current = onSave;
  }

  const updateResponse = async (getAllWeeksResponse) => {
    const payload = forecastMultiplierAllColumnsPayload(adaReducer, showIAData);
    const fetchColumnData = async () => {
      try {
        setForecastMultiplierLoader((prevState) => prevState + 1);
        let columnResponse = await fetchMultiplierColumnData(
          adaReducer,
          payload,
          allowEdit,
          id,
          isCalledFromMFPDashboard
        );

        setColumnData(columnResponse);
        // for comparison tab
        dispatch(setForecastColumns(columnResponse));
      } catch (error) {
      } finally {
        setForecastMultiplierLoader((prevState) => prevState - 1);
      }
    };

    const fetchRowData = async () => {
      try {
        setForecastMultiplierLoader((prevState) => prevState + 1);

        let response = await fetchMultiplierRowData(
          payload,
          id,
          showIAData,
          lastEditedDrivers,
          adaReducer,
          dispatch,
          getAllWeeksResponse,
          isCalledFromMFPDashboard,
          isPredictedDataFetched
        );
        let lastYearRows = appendPrevYearsData(
          adaReducer,
          adaForecastMultiplierReducer
        );

        let actualsDiscount = appendActualsDiscount(
          adaForecastMultiplierReducer
        );

        actualsDiscount?.forEach((lastYearRow) => {
          response.push(lastYearRow);
        });

        lastYearRows?.forEach((lastYearRow) => {
          response.push(lastYearRow);
        });

        const updatedForecastMultiplier = getAllRows(
          forecastMultiplierInstance
        );

        // on change in DF, response will have FM data for the respective edited DF week and
        // updatedForecastMultiplier will have last state FM data just before editing DF
        const updatedResponse = handleWeekAppendResponse(
          updatedForecastMultiplier,
          cloneDeep(response)
        );

        // Doing same above operation on inital data
        //to keep track of inital data in order to call api for only updated FM on save button click
        const updatedInitialResponse = handleWeekAppendResponse(
          initialRowData,
          cloneDeep(response)
        );
        // if actuals & historical actuals are not appended yet, append them else do nothing
        let updatedRowData = handleAppendHistoricPredictedResponse(
          updatedResponse,
          updatedForecastMultiplier
        );

        //Finds the Zero Adjusted IA Forecast to disable Multiplier
        let fiscalWeeks = [];
        updatedRowData.map((row) => {
          if (row.row === "forecast") {
            for (let week in row) {
              if (week !== "row" && week !== "forecast_multiplier") {
                if (row[week] === null || row[week] === 0) {
                  fiscalWeeks.push(week);
                }
              }
            }
          }
        });
        updatedRowData.map((row) => {
          if (row.row === "adjusted_forecast" && isAdjustedUserForecastEdited) {
            row["isAdjustedUserForecastEdited"] = true;
          }
          if (
            row.row === "multiplier" ||
            (isAdjustedUserForecastEdited && row.row === "adjusted_forecast")
          ) {
            row["disabled_fiscal_weeks"] = fiscalWeeks;
          }
        });

        // Maintaining counter on api success, such that we only append actuals & historical actuals rows
        // in the bottom of multiplier table and not set it on top of FM table by any chance
        if (isCalledFromMFPDashboard) {
          updatedRowData = updatedRowData.filter(function (item) {
            return item.row !== "Actuals";
          });
        }

        setRowData(updatedRowData);
        setInitialRowData(cloneDeep(updatedInitialResponse));

        setTimeout(() => {
          setIsApiSuccssCounter((prev) => prev + 1);
          setIsPredictedDataFetched(true);
        }, 0);

        forecastMultiplierInstance?.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } catch (error) {
        console.log("Something went wrong", error);
      } finally {
        setForecastMultiplierLoader((prevState) => prevState - 1);
      }
    };
    fetchColumnData();
    fetchRowData();
  };

  useEffect(() => {
    if (!activeKey) return;
    updateResponse();
  }, [activeKey, lastEditedDrivers]);

  useEffect(() => {
    if (!activeKey || !adaReducer?.[id]) return;
    updateResponse(true);
  }, [adaReducer?.[id]]);

  useEffect(() => {
    if (!activeKey) return;
    updateResponse(true);
  }, [adaReducer?.isEligible]);

  useEffect(() => {
    if (!selectedForecast?.activeKey) {
      return;
    }

    if (selectedForecast?.selected !== id) {
      return;
    }
    const customLimitSave =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_limit_save;
    const checkUserSaveStatus =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.check_user_save_status;
    if (customLimitSave) {
      let isValidSaveLimit = onSave(customLimitSave);

      if (isValidSaveLimit) {
        checkUserSaveStatus
          ? onSaveForecastViaWebsocket(
              adaReducer,
              dispatch,
              forecastMultiplierInstance,
              initialRowData,
              lastEditedDrivers,
              id,
              columnData,
              setInitialRowData,
              false,
              setDisableSaveButton,
              lastSavedDrivers,
              setLastSavedDrivers,
              isSaveInProgressRef,
              saveApiCountRef,
              cb,
              setActiveTransactionData,
              setLoading
            )
          : onSave();
      }
    } else {
      checkUserSaveStatus
        ? onSaveForecastViaWebsocket(
            adaReducer,
            dispatch,
            forecastMultiplierInstance,
            initialRowData,
            lastEditedDrivers,
            id,
            columnData,
            setInitialRowData,
            false,
            setDisableSaveButton,
            lastSavedDrivers,
            setLastSavedDrivers,
            isSaveInProgressRef,
            saveApiCountRef,
            cb,
            setActiveTransactionData,
            setLoading
          )
        : onSave();
    }
  }, [selectedForecast?.activeKey]);

  useEffect(() => {
    if (!isMultiplierChanged) return;
    const customLimitSave =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_limit_save;
    if (customLimitSave) {
      onSave(true);
    }
    setIsForecastSumarryEdited(true);
  }, [isMultiplierChanged]);

  //Edge Case : Adjusted IA Forecast is 0; Multiplier is set as Non Editable Cell
  useEffect(() => {
    if (columnData?.length && rowData?.length) {
      try {
        let cols = cloneDeep(columnData);
        let isUpdated = false;
        rowData?.map((row) => {
          if (row.row === "forecast") {
            for (const key in row) {
              if (row[key] === null || row[key] === 0) {
                let index = cols.findIndex((col) => col.id === key);
                isUpdated = true;
                cols[index].is_editable = true;
                cols[index].is_disabled = true;
                cols[index].extra = {
                  ...cols[index].extra,
                  staticToolTip: DISABLING_MULTIPLIER_MESSAGE,
                };
              }
            }
          }
        });
        if (isUpdated) {
          let updatedColumns = agGridColumnFormatter(cols);
          setColumnData(updatedColumns);
        }
      } catch (error) {
        console.log("Something went wrong!", error);
      }
    }
  }, [rowData]);

  useEffect(() => {
    let cols = cloneDeep(columnData);

    cols.forEach((elem) => {
      elem.cellStyle = {
        ...elem.cellStyle,
        pointerEvents: loading ? "none" : "all",
      };
    });

    let updatedColumns = agGridColumnFormatter(cols);

    setColumnData(updatedColumns);
  }, [loading, columnData?.length]);

  useEffect(() => {
    if (!props.setIsLoading) return;
    if (
      forecastMultiplierLoader ||
      adaForecastMultiplierReducer?.multiplierLoaderCount
    ) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [
    forecastMultiplierLoader,
    adaForecastMultiplierReducer?.multiplierLoaderCount,
  ]);
  return (
    <>
      <LoadingOverlay
        loader={
          forecastMultiplierLoader ||
          adaForecastMultiplierReducer?.multiplierLoaderCount
        }
        isCustomLoader={true}
      >
        <ForecastMultiplier
          activeKey={activeKey}
          columnData={columnData}
          rowData={rowData}
          showHeader={props.showHeader}
          historicColumnData={
            isCalledFromMFPDashboard ? [] : historicColumnData
          }
          ref={{ forecastMultiplierInstance }}
          id={id}
          isCalledFromMFPDashboard={isCalledFromMFPDashboard}
          setIsMultiplierChanged={setIsMultiplierChanged}
          isAdjustedUserForecastEdited={isAdjustedUserForecastEdited}
          isSummaryTable={isSummaryTable}
        />
        {!hideSave && !isCalledFromMFPDashboard && (
          <div
            className={classNames(
              globalClasses.centerAlign,
              globalClasses.evenPaddingAround,
              classes.saveForecastBtn
            )}
          >
            {allowEdit && adaReducer?.userConfig?.hasOwnProperty("edit") && (
              // <LoadingButton
              //   variant="contained"
              //   onClick={() => onSave()}
              //   disabled={disableSaveButton || loading}
              //   loadingPosition="end"
              //   endIcon={<SaveIcon />}
              //   loading={loading}
              // >
              //   Save & Finalize Forecast
              // </LoadingButton>

              <Button
                variant="primary"
                icon={loading && <></>}
                iconPlacement="right"
                onClick={() => onSave()}
                disabled={disableSaveButton || loading}
                loading={loading}
              >
                Save & Finalize Forecast
              </Button>
            )}
          </div>
        )}
      </LoadingOverlay>
    </>
  );
};

export default forwardRef(ForecastMultiplierWrapper);

const useStyles = makeStyles(() => ({
  referenceRow: {
    pointerEvents: "none",
  },
  saveForecastBtn: {
    marginTop: 30,
  },
  adaContainer: {
    "& #myGrid .ag-body-viewport .ag-center-cols-clipper input": {
      fontWeight: 500,
    },
  },
}));
