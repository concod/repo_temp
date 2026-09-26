import { makeStyles } from "@mui/styles";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useDispatch, useSelector } from "react-redux";
import { Accordion } from "impact-ui-v3";
import {
  appendPrevYearsData,
  appendPrevYearsDiscountData,
  appendActualsDiscount,
  chartDataPayload,
  isNumber,
  numberFormattingWithCommas,
  checkIfCellIsDisabledForViewEdit,
} from "modules/ada/utils-ada/utilityFunctions";
import { cloneDeep, isEmpty, uniqBy } from "lodash";
import NoDataWrapper from "../Dashboard/no-data-wrapper";
// import { Button } from "@mui/material";
import {
  errorHandler,
  infoHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import ScenarioComparisonChart, {
  FISCAL_KEY_MAPPING,
} from "./ScenarioComparisonChart";
import {
  saveDriverForecast,
  saveMultiplier,
  setFullScreenLoaderCount,
  setApiTriggerAfterSave,
  getStatusCheckForUserLevelUpdate,
  setOnCompareSave,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { closeSnack } from "core/actions/snackbarActions";
import {
  setDisableSaveBtn,
  setSaveOperationPerformedCounter,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { forecastMultiplierAllColumnsPayload } from "../Dashboard/edit-forecast/forecast-multiplier/helper";
import { useLoading } from "../Dashboard/LoaderWrapper";
import { useHistoricData } from "../Dashboard/edit-forecast/forecast-multiplier/useHistoricData";
import {
  SAVE_COMPLETED_STATUS,
  SAVE_IN_PROGRESS_STATUS,
} from "modules/ada/constants-ada/stringContants";
import { useSaveForecastStatus } from "modules/ada/utils-ada/customHooks/useSaveForecastStatus";
import { LoadingButton } from "@mui/lab";
import { Button } from "impact-ui-v3";
import SaveIcon from "@mui/icons-material/Save";
import { forwardRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";

const ComparePlans = (props, ref) => {
  let { saveApiCountRef, isSaveInProgressRef } = ref;

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const comparePlanLoader = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.compareScreenLoader
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const comparisonTableRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.comparisonTable;

  const enableCommaFormatting =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.numberFormatting?.enableCommaFormatting === true;

  const customAdjustedIALabel =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.custom_adjusted_IA_label || "Adjusted User Forecast";

  const customScenario1UserForecast = `Scenario 1 ${
    customAdjustedIALabel || "User Forecast"
  }`;
  const customScenario2UserForecast = `Scenario 2 ${
    customAdjustedIALabel || "User Forecast"
  }`;

  const {
    setSelectedForecast,
    updateAllData,
    showScenario,
    showScenario2,
    setIsComparisonTabMounted,
    index,
    activeTab,
    showIAData,
    activeKey,
    setSavePerformedTab,
    setComparisonSaveRow,
    setResetDriversCounter,
    id,
    setActiveTransactionData,
  } = props;

  const dispatch = useDispatch();

  let comparisonInstance = useRef();
  let historicDataIds = useRef();

  const loadTableInstance = (params) => {
    comparisonInstance.current = params;
  };

  const classes = useStyles();
  const globalClasses = globalStyles();

  let selected = useRef();

  const callBack = () => {
    updateAllData();
    dispatch(closeSnack());
    dispatch(setOnCompareSave(true));
  };

  // useSaveForecastStatus(
  //   saveApiCountRef,
  //   selected,
  //   isSaveInProgressRef,
  //   index === activeTab,
  //   callBack
  // );

  const [rowData, setRowData] = useState([]);

  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [forecastMultiplierLoader, setForecastMultiplierLoader] = useState(0);
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [accordionValue, setAccordionValue] = useState("Scenario Comparison");
  const { setLoading, loading } = useLoading();

  const { historicColumnData } = useHistoricData(
    showIAData,
    "adjusted",
    comparisonInstance,
    setForecastMultiplierLoader,
    null,
    true,
    false
  );

  // useEffect(() => {
  //   if (!activeKey) return;
  //   dispatch(setDisableSaveBtn(disableSaveButton));
  // }, [disableSaveButton]);

  const checkIfWeekEndDateLabelEnabled = (tabData, tabId) => {
    if (tabData?.[tabId] || tabData?.[tabId] === null) {
      return tabData?.[tabId];
    }
    return tabData;
  };

  const getRowData = (tabData, tabId, label) => {
    let data = {};
    const keys = Object.keys(tabData || {});
    keys.forEach((key) => {
      if (isNumber(key)) {
        data[key] = tabData[key]?.[tabId];
      } else {
        data[key] = checkIfWeekEndDateLabelEnabled(tabData[key], tabId);
      }
    });
    data.forecast_multiplier = label;
    return data;
  };

  useEffect(() => {
    if (index === activeTab) {
      setIsComparisonTabMounted(true);
    }
  }, [index, activeTab]);

  useEffect(() => {
    if (
      isEmpty(adaForecastMultiplierReducer?.IA) ||
      isEmpty(adaForecastMultiplierReducer?.adjusted)
    ) {
      return;
    }

    let allComparisonData = [];

    let IATabData = adaForecastMultiplierReducer?.IA || {};
    let IARowData = getRowData(IATabData, "IA", "Original IA Forecast");
    allComparisonData.push(IARowData);

    let adjustedTabData = adaForecastMultiplierReducer?.adjusted || {};
    let adjustedIARowData = getRowData(
      adjustedTabData,
      "IA",
      "Adjusted IA Forecast"
    );
    if (
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.show_ia_adjusted_forecast !== false
    ) {
      allComparisonData.push(adjustedIARowData);
    }

    let adjustedUserRowData = getRowData(
      adjustedTabData,
      "adjusted",
      customAdjustedIALabel
    );
    allComparisonData.push(adjustedUserRowData);

    if (showScenario) {
      let scenario1TabData = adaForecastMultiplierReducer?.scenario1 || {};

      let scenario1IARowData = getRowData(
        scenario1TabData,
        "IA",
        "Scenario 1 IA Forecast"
      );
      let scenario1UserRowData = getRowData(
        scenario1TabData,
        "adjusted",
        customScenario1UserForecast
      );

      if (!isEmpty(scenario1TabData)) {
        if (
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.show_ia_adjusted_forecast === false
        ) {
          allComparisonData.push(scenario1UserRowData);
        } else {
          allComparisonData.push(scenario1IARowData);
          allComparisonData.push(scenario1UserRowData);
        }
      }
    }
    if (showScenario2) {
      let scenario2TabData = adaForecastMultiplierReducer?.scenario2 || {};

      let scenario2IARowData = getRowData(
        scenario2TabData,
        "IA",
        "Scenario 2 IA Forecast"
      );
      let scenario2UserRowData = getRowData(
        scenario2TabData,
        "adjusted",
        customScenario2UserForecast
      );

      if (!isEmpty(scenario2TabData)) {
        if (
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.show_ia_adjusted_forecast === false
        ) {
          allComparisonData.push(scenario2UserRowData);
        } else {
          allComparisonData.push(scenario2IARowData);
          allComparisonData.push(scenario2UserRowData);
        }
      }
    }
    let lastYearData = appendPrevYearsData(
      adaReducer,
      adaForecastMultiplierReducer
    );
    // let lastYearsRowsDiscount = appendPrevYearsDiscountData(
    //   adaReducer,
    //   adaForecastMultiplierReducer
    // );
    let actualsDiscount = appendActualsDiscount(
      adaForecastMultiplierReducer,
      adaReducer
    );
    let actuals = actualsDiscount?.find(
      ({ forecast_multiplier }) => forecast_multiplier
    );
    let lastYearsRowsDiscount = appendPrevYearsDiscountData(
      adaForecastMultiplierReducer
    );
    historicDataIds.current = lastYearData?.map(
      ({ forecast_multiplier }) => forecast_multiplier
    );
    historicDataIds.current.push(actuals.forecast_multiplier);
    setTimeout(() => {
      actualsDiscount?.forEach((lastYearRow) => {
        allComparisonData.push(lastYearRow);
      });
      lastYearsRowsDiscount?.forEach((lastYearRow) => {
        allComparisonData.push(lastYearRow);
      });
      lastYearData?.forEach((lastYearRow) => {
        allComparisonData.push(lastYearRow);
      });

      let formattedData = uniqBy(allComparisonData, "forecast_multiplier");
      setRowData(formattedData);
    }, 0);
  }, [adaForecastMultiplierReducer]);

  const rowClassRules = useMemo(() => {
    return {
      [classes.referenceRow]: (params) => {
        return historicDataIds?.current?.includes(params?.data?.row);
      },
    };
  }, [classes.referenceRow]);

  const onSaveClick = async () => {
    try {
      if (!selected.current) {
        return infoHandler(dispatch, "Select one Forecast");
      }
      const payload = chartDataPayload(adaReducer);

      let fiscalWeekData = [];

      adaForecastMultiplierReducer?.forecastColumns.forEach(
        ({ column_name }) => {
          if (isNumber(column_name)) {
            fiscalWeekData.push(column_name);
          }
        }
      );

      let isSaveOutOfBound = checkMoreThanLimitSave(fiscalWeekData);
      if (isSaveOutOfBound) return;

      const checkUserSaveStatus =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.check_user_save_status;

      if (selected.current === "Original IA Forecast") {
        setComparisonSaveRow(selected.current);
        dispatch(setFullScreenLoaderCount(1));

        let originalFiscalWeekData = fiscalWeekData?.map((elem) => {
          return {
            fiscal_timeperiod_id: elem,
            promo_percentage: null,
            price_point: null,
          };
        });
        infoHandler(
          dispatch,
          "Forecast Save in progress, this might take some time",
          40000
        );

        let originalIApayload = cloneDeep(payload);
        delete originalIApayload.filters.store_hierarchy.store_group;
        originalIApayload.filters.ia_default_flag = true;

        if (checkUserSaveStatus) {
          setLoading(true);
        }

        const saveResponse = await saveDriverForecast({
          ...originalIApayload,
          adjusted: originalFiscalWeekData,
          adjusted_price_point: [],
        });
        setActiveTransactionData({
          transactionId: saveResponse?.data?.data?.transactionId,
          status: "pending",
          isMultiplierUpdated: true,
        });
        isSaveInProgressRef.current = true;
        if (checkUserSaveStatus) {
          // saveApiCountRef.current = 1;
        }
        let forecastMultiplierPayload = fiscalWeekData?.map((elem) => {
          return {
            fiscal_timeperiod_id: elem,
            promo_percentage: null,
            multiplier: 1,
          };
        });
        originalIApayload.filters.compare_screen = true;
        if (checkUserSaveStatus) {
          let interval = setInterval(async () => {
            if (!isSaveInProgressRef.current) {
              clearInterval(interval);
              if (checkUserSaveStatus) {
                setIsSaveInProgress(true);
              }
              const saveResponse = await saveMultiplier({
                ...originalIApayload,
                adjusted: forecastMultiplierPayload,
              });
              setActiveTransactionData({
                transactionId: saveResponse?.data?.data?.transactionId,
                status: "pending",
              });
              setSavePerformedTab(3);

              isSaveInProgressRef.current = false;
            }
          }, 200);
        } else {
          await saveMultiplier({
            ...originalIApayload,
            adjusted: forecastMultiplierPayload,
          });

          setSavePerformedTab(3);

          if (checkUserSaveStatus) {
            setIsSaveInProgress(true);
            // saveApiCountRef.current = 1;
            // isSaveInProgressRef.current = 1;
          }
          dispatch(closeSnack());

          successHandler(dispatch, "Forecast Saved successfully");
          dispatch(setOnCompareSave(true));
          setResetDriversCounter((prev) => prev + 1);
        }
        setSavePerformedTab(3);
        dispatch(setFullScreenLoaderCount(-1));

        return;
      }

      if (
        selected.current === "Adjusted IA Forecast" ||
        selected.current === "Scenario 1 IA Forecast" ||
        selected.current === "Scenario 2 IA Forecast"
      ) {
        let formattedMultiplierPayload = [];
        fiscalWeekData?.forEach((elem) => {
          let driverForecastFiscalWeek =
            adaReducer?.initialDriverForecastData[elem];

          let iaDriverForecastFiscalWeek =
            adaReducer?.initialIADriverForecastData[elem];

          if (+adaForecastMultiplierReducer?.adjusted?.[elem]?.ratio !== 1) {
            formattedMultiplierPayload.push({
              fiscal_timeperiod_id: elem,
              promo_percentage:
                iaDriverForecastFiscalWeek === driverForecastFiscalWeek
                  ? null
                  : driverForecastFiscalWeek,
              multiplier: 1,
            });
          }
        });

        if (!formattedMultiplierPayload?.length) {
          return infoHandler(dispatch, "No change detected");
        }
        dispatch(setFullScreenLoaderCount(1));
        dispatch(setOnCompareSave(true));
        if (checkUserSaveStatus) {
          setLoading(true);
        }
        infoHandler(
          dispatch,
          "Forecast Save in progress, this might take some time",
          4000
        );
        payload.filters.compare_screen = true;
        delete payload.filters.store_hierarchy.store_group;
        const saveResponse = await saveMultiplier({
          ...payload,
          adjusted: formattedMultiplierPayload,
        });

        setActiveTransactionData({
          transactionId: saveResponse?.data?.data?.transactionId,
          status: "pending",
        });
        setSavePerformedTab(3);

        if (checkUserSaveStatus) {
          // saveApiCountRef.current = 1;
          // isSaveInProgressRef.current = 1;
        } else {
          successHandler(dispatch, "Forecast Saved successfully");

          if (selected.current === "Scenario 1 IA Forecast") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (selected.current === "Adjusted IA Forecast") {
            dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (selected.current === "Scenario 2 IA Forecast") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          updateAllData();
          dispatch(closeSnack());
        }
        dispatch(setFullScreenLoaderCount(-1));

        return;
      }

      setSelectedForecast((prevState) => {
        const forecastNamesMapping = {
          [customAdjustedIALabel]: "adjusted",
          [customScenario1UserForecast]: "scenario1",
          [customScenario2UserForecast]: "scenario2",
        };
        return {
          selected: forecastNamesMapping[selected.current],
          activeKey: prevState.activeKey + 1,
        };
      });
    } catch (error) {
      dispatch(setFullScreenLoaderCount(-1));
      dispatch(closeSnack());
      errorHandler(dispatch, error);
    }
  };

  const columnDataHandler = () => {
    let column0 = cloneDeep(adaForecastMultiplierReducer?.forecastColumns?.[0]);
    if (!isEmpty(column0)) {
      column0.label = "Scenario";
      column0.headerName = "Scenario";
      column0.headerTooltip = "Scenario";
    }

    let historicColumns = [];

    if (
      !isEmpty(adaReducer?.selectedHistoricValue) &&
      !isEmpty(adaReducer?.historicalDataFiscalWeek)
    ) {
      if (adaReducer?.selectedHistoricValue?.length && adaReducer?.start_fw) {
        let historicalColumns = [
          ...adaForecastMultiplierReducer?.historicalColumns,
        ];
        let lastHistoricWeek = adaReducer?.historicalDataFiscalWeek?.start_fw;
        let index = historicalColumns.findIndex(
          (week) => week.column_name === lastHistoricWeek.toString()
        );
        let slicedCols = historicalColumns.slice(
          index - historicalColumns?.length
        );
        historicColumns = slicedCols || [];
      } else {
        historicColumns = adaForecastMultiplierReducer?.historicalColumns || [];
      }
    }

    return [
      column0,
      ...historicColumns,
      ...adaForecastMultiplierReducer?.forecastColumns?.slice?.(1),
    ]?.filter((el) => el);
  };

  let adjustedForecastHiddden =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_ia_adjusted_forecast === false;

  function doesExternalFilterPass(node) {
    return node.data.forecast_multiplier === "Adjusted IA Forecast" &&
      adjustedForecastHiddden
      ? false
      : true;
  }

  function isExternalFilterPresent() {
    return true;
  }

  const checkMoreThanLimitSave = (fiscalWeekData) => {
    let staticSaveId = [
      "Original IA Forecast",
      "Adjusted IA Forecast",
      "Scenario 1 IA Forecast",
      "Scenario 2 IA Forecast",
    ];

    const customLimitSave =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_limit_save;

    const customSavedAllowed =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_saved_allowed;

    if (
      customLimitSave &&
      staticSaveId.includes(selected.current) &&
      fiscalWeekData?.length > customSavedAllowed
    ) {
      let infoMessage = `Saving ${selected.current} is disabled for more than ${customSavedAllowed} weeks`;
      infoHandler(dispatch, infoMessage, 15000);
      return true;
    }
  };

  const renderAction = () => {
    let options = [];
    if (adaReducer?.userConfig?.hasOwnProperty("edit")) {
      options = [
        <Button
          variant="primary"
          icon={loading && <></>}
          iconPlacement="right"
          onClick={() => onSaveClick()}
          disabled={
            adaForecastMultiplierReducer?.disableSaveButton || loading
            //  ||
            // disableSaveButton
          }
          loading={loading}
        >
          Save & Finalize Forecast
        </Button>,
      ];
    }

    return options;
  };
  return (
    <>
      <ScenarioComparisonChart
        loader={comparePlanLoader}
        showScenario={showScenario}
        showScenario2={showScenario2}
      />

      {!comparePlanLoader ? (
        <Accordion
          label="Scenario Comparison"
          singleData={{
            header: "Scenario Comparison",
            content: (
              <AgGridComponent
                hideTableFormat={true}
                rowClassRules={rowClassRules}
                onRowSelected={(row) => {
                  if (
                    selected?.current === row.data.forecast_multiplier &&
                    !row.node.selected
                  ) {
                    selected.current = null;
                  }
                  if (row.node.selected) {
                    selected.current = row.data.forecast_multiplier;
                  }
                }}
                minWidth={200}
                loadTableInstance={loadTableInstance}
                selectAllHeaderComponent
                rowSelection="single"
                hideHeaderCheckboxComponent
                rowdata={rowData}
                columns={columnDataHandler()}
                pagination={false}
                uniqueRowId={"forecast_multiplier"}
                sizeColumnsToFitFlag
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
                topRightOptions={renderAction()}
                customCellRenderer={(cellProps) => {
                  const isEmpty =
                    cellProps?.value === null ||
                    cellProps?.value === undefined ||
                    cellProps?.value === "-";

                  if (isEmpty) {
                    return <div>-</div>;
                  }
                  //For disabled columns - The value is applied with comma separation
                  if (
                    checkIfCellIsDisabledForViewEdit(
                      cellProps,
                      adaReducer,
                      id
                    ) &&
                    enableCommaFormatting
                  ) {
                    return (
                      <div
                        style={{
                          pointerEvents: "none",
                        }}
                      >
                        {numberFormattingWithCommas(
                          cellProps?.value,
                          comparisonTableRoundOff
                        )}
                      </div>
                    );
                  }
                }}
              />
            ),
            value: "Scenario Comparison",
          }}
          expanded={accordionValue}
          isSingleItem={true}
          onChange={(value) => {
            if (!accordionValue) {
              setAccordionValue("Scenario Comparison");
            } else {
              setAccordionValue(null);
            }
          }}
        />
      ) : (
        <NoDataWrapper label="Scenario Comparison" loader={comparePlanLoader} />
      )}
    </>
  );
};

export default forwardRef(ComparePlans);

const useStyles = makeStyles((theme) => ({
  accordionWrapper: {
    marginTop: 30,
  },
  saveBtn: {
    marginTop: 10,
  },
  referenceRow: {
    pointerEvents: "none",
    opacity: 0.7,
  },
}));
