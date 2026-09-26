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
  weekEndDateLabel,
  numberFormattingWithCommas,
  checkIfCellIsDisabledForViewEdit,
  columnLabelHandler,
  handlePredictedTimePeriod,
  handleHistoricTimePeriod,
  isAdjustedForecastHidden,
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
  getDBUpdateStatus,
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
import { LoadingButton } from "@mui/lab";
import { Button } from "impact-ui-v3";
import SaveIcon from "@mui/icons-material/Save";
import { forwardRef } from "react";
import {
  forecastMultiplierColumnsTransformer,
  getForecastAttributes as refreshForecastAttributes,
} from "modules/ada/utils-ada/formatData";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import { Prompt, useTranslation } from "impact-ui-v3";

const ComparePlans = (props, ref) => {
  let { saveApiCountRef, isSaveInProgressRef } = ref;

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaModuleConfiguratorReducer = useSelector(
    (store) =>
      store?.adaReducer?.adaModuleConfiguratorReducer?.moduleConfiguratorData
  );
  const comparePlanLoader = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.compareScreenLoader
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );
  const storedPredictedHistoricalActuals =
    adaForecastMultiplierReducer?.predictedHistoricalActuals || null;

  const OriginalPredictedIAData =
    adaForecastMultiplierReducer?.originalPredictedIA || null;

  const storedPredictedActuals =
    adaForecastMultiplierReducer?.predictedActuals || null;

  const comparisonTableRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.comparisonTable;

  const enableCommaFormatting =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.numberFormatting?.enableCommaFormatting === true;
  const customAdjustedIALabelKey =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.custom_adjusted_IA_label;
  const customAdjustedIALabel =
    customAdjustedIALabelKey || "Adjusted User Forecast";
  const customScenario1UserForecast = `Scenario 1 ${
    customAdjustedIALabelKey || "User Forecast"
  }`;
  const customScenario2UserForecast = `Scenario 2 ${
    customAdjustedIALabelKey || "User Forecast"
  }`;
  const showDisableWhileDownTime =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_disable_while_down_time;

  const adjustedForecastHiddden = isAdjustedForecastHidden(
    adaModuleConfiguratorReducer,
    adaReducer
  );

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
  const { t } = useTranslation();

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

  const [rowData, setRowData] = useState([]);

  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [forecastMultiplierLoader, setForecastMultiplierLoader] = useState(0);
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [accordionValue, setAccordionValue] = useState(
    t("ada.dashboard.scenarioComparison")
  );
  const { setLoading, loading } = useLoading();
  const [showEditDisabledPrompt, setShowEditDisabledPrompt] = useState(false);

  // to Do : when user is on view edit hierarchy & changes & historic dropdown value

  // const { historicColumnData } = useHistoricData(
  //   showIAData,
  //   "adjusted",
  //   comparisonInstance,
  //   setForecastMultiplierLoader,
  //   null,
  //   true,
  //   false
  // );

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

  const getIARowData = (tabData, label) => {
    let data = {};
    const keys = Object.keys(tabData || {});
    keys.forEach((key) => {
      data[key] = isNumber(tabData[key]) ? tabData[key] : tabData[key]?.IA;
    });
    data.forecast_multiplier = label;
    return data;
  };

  const getRowData = (tabData, tabId, label) => {
    let data = {};
    const keys = Object.keys(tabData || {});

    let fiscalPeriods = handlePredictedTimePeriod(adaReducer);

    keys.forEach((key) => {
      if (isNumber(key) || fiscalPeriods?.includes(key)) {
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

    let historicFiscalWeeks = handleHistoricTimePeriod(adaReducer);

    let predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);

    let IATabData = adaForecastMultiplierReducer?.IA || {};
    let IARowData = getIARowData(IATabData, "Original IA Forecast");

    Object.keys(IARowData).forEach((key) => {
      if (
        (isNumber(key) || isNumber(key?.slice(0, -1))) &&
        historicFiscalWeeks?.includes(+key) &&
        predictedFiscalWeeks?.includes(+key)
      ) {
        IARowData[`${key}H`] = IARowData[key];
        IARowData[key] = OriginalPredictedIAData;
      }
    });

    allComparisonData.push(IARowData);

    let adjustedTabData = adaForecastMultiplierReducer?.adjusted || {};
    let adjustedIARowData = getRowData(
      adjustedTabData,
      "IA",
      "Adjusted IA Forecast"
    );
    if (!adjustedForecastHiddden) {
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
        if (adjustedForecastHiddden) {
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
        if (adjustedForecastHiddden) {
          allComparisonData.push(scenario2UserRowData);
        } else {
          allComparisonData.push(scenario2IARowData);
          allComparisonData.push(scenario2UserRowData);
        }
      }
    }
    let lastYearData = cloneDeep(
      adaForecastMultiplierReducer?.historicalActual
    );

    lastYearData =
      lastYearData?.map((yearRow) => {
        let updatedRow = { ...yearRow };

        Object.keys(yearRow).forEach((key) => {
          if (
            (isNumber(key) || isNumber(key?.slice(0, -1))) &&
            historicFiscalWeeks?.includes(+key) &&
            predictedFiscalWeeks?.includes(+key)
          ) {
            updatedRow[`${key}H`] = yearRow[key];
            updatedRow[key] = storedPredictedHistoricalActuals;
          }
        });

        return updatedRow;
      }) || [];

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
    actualsDiscount =
      actualsDiscount?.map((actualsRow) => {
        let updatedRow = { ...actualsRow };

        Object.keys(actualsRow).forEach((key) => {
          if (isNumber(key) || isNumber(key?.slice(0, -1))) {
            updatedRow[key] = actualsRow[key];
            // updatedRow[key] = storedPredictedActuals;
          }
        });

        return updatedRow;
      }) || [];

    historicDataIds.current = lastYearData?.map(
      ({ forecast_multiplier }) => forecast_multiplier
    );
    historicDataIds.current.push(actuals?.forecast_multiplier);
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
      if (showDisableWhileDownTime) {
        const { data } = await getDBUpdateStatus();
        if (data?.data?.db_update_status) {
          setShowEditDisabledPrompt(true);
          return;
        }
      }
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
            fiscal_timeperiod_id: `${elem}`,
            promo_percentage: null,
            price_point: null,
          };
        });
        infoHandler(dispatch, t("ada.common.forecastSaveInProgress"), 40000);

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
            fiscal_timeperiod_id: `${elem}`,
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

          successHandler(dispatch, t("ada.common.forecastSavedSuccessfully"));
          dispatch(setOnCompareSave(true));
          await refreshForecastAttributes(dispatch, adaReducer);
          updateAllData();
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
              fiscal_timeperiod_id: `${elem}`,
              promo_percentage:
                iaDriverForecastFiscalWeek === driverForecastFiscalWeek
                  ? null
                  : driverForecastFiscalWeek,
              multiplier: 1,
            });
          }
        });

        if (!formattedMultiplierPayload?.length) {
          return infoHandler(dispatch, t("ada.common.noChangeDetected"));
        }
        dispatch(setFullScreenLoaderCount(1));
        dispatch(setOnCompareSave(true));
        if (checkUserSaveStatus) {
          setLoading(true);
        }
        infoHandler(dispatch, t("ada.common.forecastSaveInProgress"), 4000);
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
          successHandler(dispatch, t("ada.common.forecastSavedSuccessfully"));

          if (selected.current === "Scenario 1 IA Forecast") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (selected.current === "Adjusted IA Forecast") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          if (selected.current === "Scenario 2 IA Forecast") {
            dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            dispatch(setApiTriggerAfterSave({ key: "scenario2", value: 1 }));
          }
          await refreshForecastAttributes(dispatch, adaReducer);
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

    const response = forecastMultiplierColumnsTransformer(
      cloneDeep(adaReducer?.tableColumns?.forecast_multiplier || [])
    );
    if (response?.length) {
      response[0].column_name = "forecast_multiplier";
      response[0].label = "Scenario";
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

    let formatter =
      adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
        comparisonTableRoundOff
      ];

    let updatedFormattedResponse = response.map((el, i) => {
      if (i === 0) return el;
      return {
        ...el,
        is_lockable: false,
        is_editable: false,
        is_sortable: false,
        is_searchable: false,
        formatter,
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
    });
    const formattedResponse = agGridColumnFormatter(updatedFormattedResponse);

    let predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);

    let historicForecastMultiplierColumns = adaReducer?.selectedHistoricValue
      ?.length
      ? adaReducer?.historicTableColumns?.forecast_multiplier || []
      : [];
    let historicResponse =
      forecastMultiplierColumnsTransformer(historicForecastMultiplierColumns) ||
      [];
    const updatedHistoricColumnData = historicResponse
      ?.filter((val) => val.column_name !== "forecast_multiplier")
      .map((column) => ({
        ...column,
        disabled: true,
        is_lockable: false,
        is_sortable: false,
        is_searchable: false,
        // label: `F${adaReducer?.switchTimeLine?.[0]?.value}-${column.label}`,

        // label: showWeekEndDateLabelEnabled
        //   ? weekEndDateLabel(column.label, adaReducer)
        //   : `F${adaReducer?.switchTimeLine?.[0]?.value}-${column.label} ${
        //       predictedFutureFiscalWeeks?.includes(+column.label) ? " (H)" : ""
        //     }`,

        label: columnLabelHandler(
          column.label,
          adaReducer,
          showWeekEndDateLabelEnabled,
          predictedFutureFiscalWeeks,
          false,
          showWeekStartDateLabelEnabled
        ),
        // For Month aggregation level, some weeks of the Last Month will fall under historic forecast
        // and some of the weeks will be under predicted forecast, since keys will be same.
        // Hence, modyfying the key for Historical in response
        column_name: predictedFutureFiscalWeeks?.includes(+column.column_name)
          ? `${column.column_name}H`
          : column.column_name,
      }));

    const formattedHistoricResponse = agGridColumnFormatter(
      updatedHistoricColumnData
    );

    return [
      formattedResponse[0],
      ...formattedHistoricResponse,
      ...formattedResponse.slice(+1),
    ]?.filter((el) => el);
  };

  // let adjustedForecastHiddden =
  //   adaReducer?.clientConfig?.attribute_value?.show_features
  //     ?.show_ia_adjusted_forecast === false;

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
      let infoMessage = t("ada.common.savingDisabledForMoreThan", {
        forecastType: selected.current,
        weeks: customSavedAllowed,
      });
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
          {t("ada.dashboard.saveAndFinalizeForecast")}
        </Button>,
      ];
    }

    return options;
  };
  return (
    <>
      <Prompt
        isOpen={showEditDisabledPrompt}
        title={t("ada.forecast.refreshInProgressTitle")}
        children={<>{t("ada.forecast.refreshInProgressMessage")}</>}
        primaryButtonLabel={t("ada.forecast.ok")}
        onPrimaryButtonClick={() => setShowEditDisabledPrompt(false)}
        variant="info"
      />
      <ScenarioComparisonChart
        loader={comparePlanLoader}
        showScenario={showScenario}
        showScenario2={showScenario2}
        activeKey={activeKey}
        id={id}
      />

      {!comparePlanLoader ? (
        <Accordion
          label={t("ada.dashboard.scenarioComparisonForecast")}
          singleData={{
            header: t("ada.dashboard.scenarioComparisonForecast"),
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
                skipAutoSizeColumn
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
              setAccordionValue(t("ada.dashboard.scenarioComparison"));
            } else {
              setAccordionValue(null);
            }
          }}
        />
      ) : (
        <NoDataWrapper
          label={t("ada.dashboard.scenarioComparison")}
          loader={comparePlanLoader}
        />
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
