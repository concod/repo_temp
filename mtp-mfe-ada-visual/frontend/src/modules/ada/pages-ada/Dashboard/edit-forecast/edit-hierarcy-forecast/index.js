import React, { forwardRef, useEffect, useState, useCallback } from "react";
import { Button, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import {
  saveDetailForecast,
  saveDriverForecast,
  setFullScreenLoaderCount,
  setApiTriggerAfterSave,
  getStatusCheckForUserLevelUpdate,
  setEditHierarchyForecastSave,
  getDBUpdateStatus,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  adjustedPayload,
  chartDataPayload,
  FORECAST_SAVE_STATUS,
  handlePredictedTimePeriod,
  isNumber,
  isNumberOrString,
} from "modules/ada/utils-ada/utilityFunctions";
import { useDispatch, useSelector } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import {
  errorHandler,
  infoHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import EditHierarcyWrapper from "./edit-hierarchy/editHierarchyWrapper";
import EditChildHierarcyWrapper from "./edit-child-hierarchy/editChildHierarchyWrapper";
import {
  SAVE_COMPLETED_STATUS,
  SAVE_IN_PROGRESS_STATUS,
} from "../../../../constants-ada/stringContants";
import { cloneDeep } from "lodash";
import {
  setCounterToTriggerForecastCustomHook,
  setDisableSaveBtn,
  setSaveOperationPerformedCounter,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { useLoading } from "../../LoaderWrapper";
import { useRef } from "react";
// import { adjustedPayload } from "./helper";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { updateDrivers } from "../forecast-multiplier/helper";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import { Prompt } from "impact-ui-v3";
import { getForecastAttributes } from "modules/ada/utils-ada/formatData";

const EditHierarchyForecast = (props, ref) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  var Mfp_Key =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp?.mfp_level;
  var editDisableInEditHeirarchy =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.editDisableInEditHeirarchy;
  const showDisableWhileDownTime =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_disable_while_down_time;
  const customMfpLabel =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.mfp?.label || "MFP";

  let {
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    forecastMultiplierInstance,
    editHierarchyChildInstance,
    editHierarchyGrandChildInstance,
    editHierarchyChildTotalRowInstance,
    initialEditChildRowData,
    allEditedGrandChildRowData,
    initialEditRowData,
    initialTotalRowData,
    editChildRowData,
    currentHierarchyKey,
    currentChildHierarchyKey,
    allEditedChildRowData,
    allEditedGrandChildRowMapping,
    lastEditedDriversRef,
    SkuName,
    isCompareChanges,
    saveApiCountRef,
    isSaveInProgressRef,
    disableAllowEditOnSaveRef,
    timeoutRef,
  } = ref;

  const {
    activeKey,
    driverForecastVal,
    driverForecastAllVal,
    lastEditedDrivers,
    allowEdit = true,
    allowL0Edit = true,
    showIAData,
    id,
    selectedForecast,
    activeChildHierarchyKey,
    setActiveChildHierarchyKey,
    counterOnEditHierarchyChange,
    setCounterOnEditHierarchyChange,
    selectedRows,
    isCalledFromMFPDashboard,
    lastSavedDrivers,
    setLastSavedDrivers,
    index,
    activeTab,
    disableAllowEditOnSave,
    setSavePerformedTab,
    setRefreshAllEditHierarchy,
    setSelectedForecast,
    setActiveTransactionData,
    setIsEditHierarchyForecastEdited = () => null,
    setIsSavePerformed,
    setIsForecastSumarryEdited,
    resetDrivers,
    setLastEditedDrivers,
    isL0TableHidden,
  } = props;

  const { setLoading, loading } = useLoading();

  const [activeL1, setActiveL1] = useState(null);
  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [lastSavedEditHierarchy, setLastSavedEditHierarchy] = useState([]);
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [selectedCompareWith, setSelectedCompareWith] = useState({
    label: "LY Sales",
    value: "LY_sales",
    id: "Year",
  });
  const [showEditDisabledPrompt, setShowEditDisabledPrompt] = useState(false);

  const onSave = async (customLimitSave) => {
    if (showDisableWhileDownTime) {
      const { data } = await getDBUpdateStatus();
      if (data?.data?.db_update_status) {
        setShowEditDisabledPrompt(true);
        return;
      }
    }
    dispatch(setEditHierarchyForecastSave(FORECAST_SAVE_STATUS.SAVING));
    // In order to not consider user profile for Month & Quarter, considerUserProfile flag is needed
    let considerUserProfile = adaReducer?.switchTimeLine?.[0]?.value === "W";

    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;

    let adjusted = adjustedPayload(
      editHierarchyTotalRowInstance,
      lastEditedDrivers,
      editHierarchyInstance,
      allEditedChildRowData,
      editHierarchyChildInstance,
      activeChildHierarchyKey,
      allEditedGrandChildRowData,
      allEditedGrandChildRowMapping,
      editHierarchyGrandChildInstance,
      isCalledFromMFPDashboard,
      false,
      considerUserProfile,
      useAdjustedUserForecastBase,
      handlePredictedTimePeriod(adaReducer)
    );
    let currentSavedAggregation = cloneDeep(adjusted) || [];
    let currentSavedDrivers = cloneDeep(lastEditedDrivers) || [];
    let updatedCurrentSavedAggregation = currentSavedAggregation.map((elem) => {
      return { ...elem, stringifyModified: JSON.stringify(elem.modified) };
    });

    const compareDriversModified = (obj1, obj2) => {
      return (
        obj1.selected_promo_type === obj2.selected_promo_type &&
        obj1.promo_percentage === obj2.promo_percentage &&
        `${obj1.fiscal_timeperiod_id}` === `${obj2.fiscal_timeperiod_id}`
      );
    };

    let updatedDrivers = currentSavedDrivers.filter((b) => {
      let indexFound = lastSavedDrivers.findIndex((a) =>
        compareDriversModified(a, b)
      );
      return indexFound == -1;
    });

    const compareStringifyModified = (obj1, obj2) => {
      return (
        obj1.stringifyModified === obj2.stringifyModified &&
        obj1.ratio === obj2.ratio &&
        obj1.value === obj2.value &&
        obj1.locked === obj2.locked &&
        obj1.promo_percentage === obj2.promo_percentage &&
        `${obj1.fiscal_timeperiod_id}` === `${obj2.fiscal_timeperiod_id}`
      );
    };

    let updatedAdjusted = updatedCurrentSavedAggregation.filter((b) => {
      let indexFound = lastSavedEditHierarchy.findIndex((a) =>
        compareStringifyModified(a, b)
      );
      return indexFound == -1;
    });
    updatedAdjusted.forEach((elem) => {
      delete elem.stringifyModified;
    });

    const customSavedAllowed =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_saved_allowed;

    // Warn user to not do more than 8 weeks change, if he does disable save button
    if (customLimitSave) {
      if (updatedAdjusted?.length === customSavedAllowed) {
        let infoMessage =
          t("ada.forecastMultiplier.disableSaveAfter8WeekChange") +
          " " +
          customSavedAllowed +
          " weeks";
        infoHandler(dispatch, infoMessage, 15000);
      }
      if (updatedAdjusted?.length > customSavedAllowed) {
        setDisableSaveButton(true);
      }
      return true;
    }
    try {
      const payload = chartDataPayload(adaReducer);

      if (!updatedAdjusted?.length && !updatedDrivers?.length) {
        return infoHandler(dispatch, t("ada.common.noChangeDetected"));
      }
      infoHandler(dispatch, t("ada.common.forecastSaveInProgress"));
      let adjustedPromoPercentage = updatedDrivers?.filter(
        ({ selected_promo_type }) => selected_promo_type === "promo_percentage"
      );
      let adjustedPricePoint = updatedDrivers?.filter(
        ({ selected_promo_type }) => selected_promo_type === "price_point"
      );
      if (isCalledFromMFPDashboard) {
        payload.filters.store_hierarchy.channel = [selectedRows[0]?.channel];
        payload.filters.product_hierarchy[Mfp_Key] = [
          selectedRows[0]?.[Mfp_Key],
        ];
        payload.filters.mfp = true;
        payload.filters.mfp_flag = selectedRows[0]?.flag;
      }
      delete payload.filters.store_hierarchy.store_group;
      const checkUserSaveStatus =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.check_user_save_status;
      let countofSaveApiCalled = 0;
      if (updatedDrivers?.length && updatedAdjusted?.length) {
        countofSaveApiCalled = 2;
      }
      isSaveInProgressRef.current = countofSaveApiCalled;

      dispatch(setFullScreenLoaderCount(1));
      if (updatedDrivers?.length) {
        let lastSavedDrivers = cloneDeep(lastEditedDrivers);

        await saveDriverForecast({
          ...payload,
          adjusted: updatedDrivers,
          adjusted_price_point: [],
        });
        setIsSavePerformed(true);
        dispatch(setCounterToTriggerForecastCustomHook());
        setIsForecastSumarryEdited([]);

        if (checkUserSaveStatus) {
          setSavePerformedTab(index);
          setIsSaveInProgress(true);
          // call save DF Save API then call the checkUserSaveStatus api if that is returning false
          // then only proceed for Multiplier save
          saveApiCountRef.current = 1;
          setIsSaveInProgress(true);
          saveApiCountRef.current = 1;
          if (!countofSaveApiCalled) {
            isSaveInProgressRef.current = 1;
          }
          if (updatedAdjusted?.length) {
          }
        } else {
          if (!updatedAdjusted?.length) {
            successHandler(
              dispatch,
              t("ada.common.forecastSavedSuccessfully"),
              4000
            );
          }
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

          await getForecastAttributes(dispatch, adaReducer);
          dispatch(setSaveOperationPerformedCounter());
        }

        let updatedLastSavedDrivers = lastSavedDrivers.map((elem) => elem);
        setLastSavedDrivers(updatedLastSavedDrivers);
      }

      let saveDetailPayload = cloneDeep(payload);

      let useAdjustedUserForecastBase =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.use_adjusted_user_forecast_base;

      if (useAdjustedUserForecastBase)
        saveDetailPayload.filters.use_adjusted_user_forecast_qty = true;

      if (updatedAdjusted?.length) {
        if (saveApiCountRef.current) {
          let interval = setInterval(async () => {
            if (!saveApiCountRef.current) {
              clearInterval(interval);

              await saveDetailForecast({
                ...saveDetailPayload,
                adjusted: updatedAdjusted,
              });
              setIsSavePerformed(true);
              dispatch(setCounterToTriggerForecastCustomHook());
              setIsForecastSumarryEdited([]);
              setSelectedForecast({
                selected: "",
                activeKey: 0,
              });
              if (checkUserSaveStatus) {
                setIsSaveInProgress(true);
                setSavePerformedTab(index);
              }
              saveApiCountRef.current = 1;

              let lastSavedAggregation = cloneDeep(adjusted);
              let updatedLastSavedAggregation = lastSavedAggregation.map(
                (elem) => {
                  return {
                    ...elem,
                    stringifyModified: JSON.stringify(elem.modified),
                  };
                }
              );

              setLastSavedEditHierarchy(updatedLastSavedAggregation);

              if (id === "adjusted") {
                dispatch(
                  setApiTriggerAfterSave({ key: "scenario1", value: 1 })
                );
                dispatch(
                  setApiTriggerAfterSave({ key: "scenario2", value: 1 })
                );
              }
              if (id === "scenario1") {
                dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
                dispatch(
                  setApiTriggerAfterSave({ key: "scenario2", value: 1 })
                );
              }
              if (id === "scenario2") {
                dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
                dispatch(
                  setApiTriggerAfterSave({ key: "scenario1", value: 1 })
                );
              }
              await getForecastAttributes(dispatch, adaReducer);
              dispatch(setSaveOperationPerformedCounter());
            }
          }, 200);
        } else {
          await saveDetailForecast({
            ...saveDetailPayload,
            adjusted: updatedAdjusted,
          });
          setIsSavePerformed(true);
          dispatch(setCounterToTriggerForecastCustomHook());
          setIsForecastSumarryEdited([]);

          setSelectedForecast({
            selected: "",
            activeKey: 0,
          });
          if (checkUserSaveStatus) {
            setSavePerformedTab(index);

            setIsSaveInProgress(true);
            saveApiCountRef.current = 1;
            if (!countofSaveApiCalled) {
              isSaveInProgressRef.current = 1;
            }
          }

          let lastSavedAggregation = cloneDeep(adjusted);
          let updatedLastSavedAggregation = lastSavedAggregation.map((elem) => {
            return {
              ...elem,
              stringifyModified: JSON.stringify(elem.modified),
            };
          });

          setLastSavedEditHierarchy(updatedLastSavedAggregation);

          if (!checkUserSaveStatus) {
            successHandler(
              dispatch,
              t("ada.common.forecastSavedSuccessfully"),
              4000
            );
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
            await getForecastAttributes(dispatch, adaReducer);
            dispatch(setSaveOperationPerformedCounter());
          }
        }
      }
      setIsEditHierarchyForecastEdited(false);
      dispatch(setEditHierarchyForecastSave(FORECAST_SAVE_STATUS.SAVED));
      if (isCalledFromMFPDashboard) {
        props?.onCancel();
        props.setRefreshTable(true);
      }
    } catch (error) {
      console.log("error", error);
      dispatch(closeSnack());
      errorHandler(dispatch, error);
      dispatch(setEditHierarchyForecastSave(FORECAST_SAVE_STATUS.ERROR));
    } finally {
      dispatch(setFullScreenLoaderCount(-1));
    }
  };

  const startTimeout = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // infoHandler(
      //   dispatch,
      //   "Something went wrong while saving the last update. Please, try again",
      //   4000
      // );
      setLoading(false);
    }, 360000); // 6 minutes
  }, [loading]);

  const onSaveForecastViaWebsocket = async (customLimitSave) => {
    if (showDisableWhileDownTime) {
      const { data } = await getDBUpdateStatus();
      if (data?.data?.db_update_status) {
        setShowEditDisabledPrompt(true);
        return;
      }
    }
    dispatch(setEditHierarchyForecastSave(FORECAST_SAVE_STATUS.SAVING));
    // In order to not consider user profile for Month & Quarter, considerUserProfile flag is needed
    let considerUserProfile = adaReducer?.switchTimeLine?.[0]?.value === "W";
    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;
    const predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);
    let adjusted = adjustedPayload(
      editHierarchyTotalRowInstance,
      lastEditedDrivers,
      editHierarchyInstance,
      allEditedChildRowData,
      editHierarchyChildInstance,
      activeChildHierarchyKey,
      allEditedGrandChildRowData,
      allEditedGrandChildRowMapping,
      editHierarchyGrandChildInstance,
      isCalledFromMFPDashboard,
      false,
      considerUserProfile,
      useAdjustedUserForecastBase,
      predictedFiscalWeeks
    );
    let currentSavedAggregation = cloneDeep(adjusted) || [];
    let currentSavedDrivers = cloneDeep(lastEditedDrivers) || [];
    let updatedCurrentSavedAggregation = currentSavedAggregation.map((elem) => {
      return { ...elem, stringifyModified: JSON.stringify(elem.modified) };
    });

    const compareDriversModified = (obj1, obj2) => {
      return (
        obj1.selected_promo_type === obj2.selected_promo_type &&
        obj1.promo_percentage === obj2.promo_percentage &&
        `${obj1.fiscal_timeperiod_id}` === `${obj2.fiscal_timeperiod_id}`
      );
    };

    let updatedDrivers = currentSavedDrivers.filter((b) => {
      let indexFound = lastSavedDrivers.findIndex((a) =>
        compareDriversModified(a, b)
      );
      return indexFound == -1;
    });

    const compareStringifyModified = (obj1, obj2) => {
      return (
        obj1.stringifyModified === obj2.stringifyModified &&
        obj1.ratio === obj2.ratio &&
        obj1.value === obj2.value &&
        obj1.locked === obj2.locked &&
        obj1.promo_percentage === obj2.promo_percentage &&
        `${obj1.fiscal_timeperiod_id}` === `${obj2.fiscal_timeperiod_id}`
      );
    };

    let updatedAdjusted = updatedCurrentSavedAggregation.filter((b) => {
      let indexFound = lastSavedEditHierarchy.findIndex((a) =>
        compareStringifyModified(a, b)
      );
      return indexFound == -1;
    });
    updatedAdjusted.forEach((elem) => {
      delete elem.stringifyModified;
    });

    const customSavedAllowed =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_saved_allowed;

    // Warn user to not do more than 8 weeks change, if he does disable save button
    if (customLimitSave) {
      if (updatedAdjusted?.length === customSavedAllowed) {
        let infoMessage =
          t("ada.forecastMultiplier.disableSaveAfter8WeekChange") +
          " " +
          customSavedAllowed +
          " weeks";
        infoHandler(dispatch, infoMessage, 15000);
      }
      if (updatedAdjusted?.length > customSavedAllowed) {
        setDisableSaveButton(true);
      }
      return true;
    }
    try {
      const payload = chartDataPayload(adaReducer);

      if (!updatedAdjusted?.length && !updatedDrivers?.length) {
        return infoHandler(dispatch, t("ada.common.noChangeDetected"));
      }
      setLoading(true);
      infoHandler(dispatch, t("ada.common.forecastSaveInProgress"), 4000);
      let adjustedPromoPercentage = updatedDrivers?.filter(
        ({ selected_promo_type }) => selected_promo_type === "promo_percentage"
      );
      let adjustedPricePoint = updatedDrivers?.filter(
        ({ selected_promo_type }) => selected_promo_type === "price_point"
      );
      if (isCalledFromMFPDashboard) {
        payload.filters.store_hierarchy.channel = [selectedRows[0]?.channel];
        payload.filters.product_hierarchy[Mfp_Key] = [
          selectedRows[0]?.[Mfp_Key],
        ];
        payload.filters.mfp = true;
        payload.filters.mfp_flag = selectedRows[0]?.flag;
      }
      delete payload.filters.store_hierarchy.store_group;
      let countofSaveApiCalled = 0;
      if (updatedDrivers?.length && updatedAdjusted?.length) {
        countofSaveApiCalled = 2;
      }

      dispatch(setFullScreenLoaderCount(1));

      if (updatedDrivers?.length && countofSaveApiCalled !== 2) {
        await updateDrivers(
          payload,
          lastEditedDrivers,
          setLastSavedDrivers,
          updatedDrivers,
          [],
          setDisableSaveButton,
          setActiveTransactionData,
          false,
          setLastEditedDrivers
        );
        startTimeout();
      }

      let saveDetailPayload = cloneDeep(payload);

      let useAdjustedUserForecastBase =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.use_adjusted_user_forecast_base;

      if (useAdjustedUserForecastBase)
        saveDetailPayload.filters.use_adjusted_user_forecast_qty = true;

      if (updatedAdjusted?.length && countofSaveApiCalled !== 2) {
        await updateAdjusted(
          saveDetailPayload,
          adjusted,
          updatedAdjusted,
          setActiveTransactionData
        );
        startTimeout();
      }

      if (countofSaveApiCalled == 2) {
        await updateDrivers(
          payload,
          lastEditedDrivers,
          setLastSavedDrivers,
          updatedDrivers,
          [],
          setDisableSaveButton,
          setActiveTransactionData,
          true,
          setLastEditedDrivers
        );
        startTimeout();

        isSaveInProgressRef.current = true;

        let interval = setInterval(async () => {
          if (!isSaveInProgressRef.current) {
            clearInterval(interval);

            await updateAdjusted(
              saveDetailPayload,
              adjusted,
              updatedAdjusted,
              setActiveTransactionData
            );
            startTimeout();

            isSaveInProgressRef.current = false;
          }
        }, 200);
      }
      setIsEditHierarchyForecastEdited(false);

      if (isCalledFromMFPDashboard) {
        props?.onCancel();
        props.setRefreshTable(true);
      }
    } catch (error) {
      console.log("error", error);
      dispatch(setEditHierarchyForecastSave(FORECAST_SAVE_STATUS.ERROR));
      setLoading(false);
      dispatch(closeSnack());
      errorHandler(dispatch, error);
    } finally {
      dispatch(setFullScreenLoaderCount(-1));
    }
  };

  const updateAdjusted = async (
    payload,
    adjusted,
    updatedAdjusted,
    setActiveTransactionData
  ) => {
    const saveResponse = await saveDetailForecast({
      ...payload,
      adjusted: updatedAdjusted,
    });

    let lastSavedAggregation = cloneDeep(adjusted);
    let updatedLastSavedAggregation = lastSavedAggregation.map((elem) => {
      return {
        ...elem,
        stringifyModified: JSON.stringify(elem.modified),
      };
    });
    setActiveTransactionData({
      transactionId: saveResponse?.data?.data?.transactionId,
      status: "pending",
    });

    setLastSavedEditHierarchy(updatedLastSavedAggregation);
    setDisableSaveButton(false);
  };

  // useEffect(() => {
  //   if (!activeKey) return;
  //   dispatch(setDisableSaveBtn(disableSaveButton));
  // }, [disableSaveButton]);

  // This useeffect is triggered when save is performed in comparison tab
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
        checkUserSaveStatus ? onSaveForecastViaWebsocket() : onSave();
      }
    } else {
      checkUserSaveStatus ? onSaveForecastViaWebsocket() : onSave();
    }
  }, [selectedForecast?.activeKey]);

  // This useEffect is triggered on change in any input cell
  useEffect(() => {
    // TO DO : will be updating client config tomorrow for all clients, will map this tomorrow
    const customLimitSave =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_limit_save;
    if (customLimitSave) {
      onSave(true);
    }
  }, [counterOnEditHierarchyChange]);

  const actionsJsx = (
    <div
      className={classNames(
        globalClasses.centerAlign,
        globalClasses.evenPaddingAround,
        classes.saveForecastBtn
      )}
    >
      <Button
        variant="primary"
        icon={loading && <></>}
        iconPlacement="right"
        onClick={() => {
          const checkUserSaveStatus =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.check_user_save_status;

          if (checkUserSaveStatus) {
            onSaveForecastViaWebsocket();
          } else {
            onSave();
          }
        }}
        disabled={disableSaveButton || loading}
        loading={loading}
      >
        {t("ada.dashboard.saveAndFinalizeForecast")}
      </Button>

      {/* <LoadingButton
        variant="contained"
        onClick={() => {
          const checkUserSaveStatus =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.check_user_save_status;

          if (checkUserSaveStatus) {
            onSaveForecastViaWebsocket();
          } else {
            onSave();
          }
        }}
        disabled={disableSaveButton || loading}
        loadingPosition="end"
        endIcon={<SaveIcon />}
        loading={disableSaveButton || loading}
      >
        Save & Finalize Forecast
      </LoadingButton> */}
    </div>
  );

  const actionsJsxForMFP = (
    <div
      className={classNames(
        globalClasses.centerAlign,
        globalClasses.evenPaddingAround,
        classes.saveForecastBtn
      )}
    >
      {!editDisableInEditHeirarchy && (
        <Button
          variant="primary"
          onClick={() => onSave()}
          disabled={disableSaveButton}
        >
          {t("ada.dashboard.saveAndFinalizeForecast")}
        </Button>
      )}
    </div>
  );

  const getTopRightOptions = () => {
    let options = [];
    if (
      allowEdit &&
      adaReducer?.userConfig?.hasOwnProperty("edit") &&
      isCalledFromMFPDashboard &&
      !editDisableInEditHeirarchy
    ) {
      options.push(
        <Button
          variant="primary"
          onClick={() => onSave()}
          disabled={disableSaveButton}
        >
          Save
        </Button>
      );
    }

    if (
      allowEdit &&
      adaReducer?.userConfig?.hasOwnProperty("edit") &&
      !isCalledFromMFPDashboard
    ) {
      options.push(
        <Button
          variant="primary"
          onClick={() => {
            const checkUserSaveStatus =
              adaReducer?.clientConfig?.attribute_value?.show_features
                ?.check_user_save_status;

            if (checkUserSaveStatus) {
              onSaveForecastViaWebsocket();
            } else {
              onSave();
            }
          }}
          disabled={disableSaveButton || loading}
          loading={loading}
        >
          Save
        </Button>
      );
    }

    let allCompareWithOptions = [
      { label: customMfpLabel, value: customMfpLabel, id: customMfpLabel },
      { label: "LY Sales", value: "LY_sales", id: "Year" },
      {
        label: "IA Original Forecast",
        value: "IA",
        id: "Original_IA",
      },
    ];

    let compareWith = adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_compare_with_in_edit_hierarchy_enabled && (
      <>
        <span className={classes.compareWithLabel}>Compare with</span>
        <SelectContainer
          label=""
          initialData={allCompareWithOptions}
          updateDependency={(_, value) => {
            resetDrivers(true, true);
            setSelectedCompareWith(value?.[0]);
          }}
          selectedOptions={[selectedCompareWith]}
        />
      </>
    );

    options.push(compareWith);

    return options;
  };
  return (
    <div style={{ position: "relative" }}>
      <Prompt
        isOpen={showEditDisabledPrompt}
        title={t("ada.forecast.refreshInProgressTitle")}
        children={<>{t("ada.forecast.refreshInProgressMessage")}</>}
        primaryButtonLabel={t("ada.forecast.ok")}
        onPrimaryButtonClick={() => setShowEditDisabledPrompt(false)}
        variant="info"
      />
      <EditHierarcyWrapper
        selectedCompareWith={selectedCompareWith}
        lastEditedDrivers={lastEditedDrivers}
        id={id}
        key={activeKey}
        activeKey={activeKey}
        setActiveChildHierarchyKey={setActiveChildHierarchyKey}
        allowEdit={allowEdit}
        allowL0Edit={allowL0Edit}
        showIAData={showIAData}
        getTopRightOptions={getTopRightOptions}
        isL0TableHidden={isL0TableHidden}
        ref={{
          lastEditedDriversRef,
          editHierarchyInstance,
          editHierarchyTotalRowInstance,
          forecastMultiplierInstance,
          editHierarchyChildInstance,
          editHierarchyGrandChildInstance,
          editHierarchyChildTotalRowInstance,
          initialEditChildRowData,
          allEditedGrandChildRowData,
          initialEditRowData,
          initialTotalRowData,
          editChildRowData,
          currentHierarchyKey,
          allEditedChildRowData,
          allEditedGrandChildRowMapping,
        }}
        driverForecastVal={driverForecastVal}
        driverForecastAllVal={driverForecastAllVal}
        activeChildHierarchyKey={activeChildHierarchyKey}
        setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
        isCalledFromMFPDashboard={isCalledFromMFPDashboard}
        selectedRowsFromMFP={selectedRows}
        disableAllowEditOnSave={disableAllowEditOnSave}
      />
      {activeChildHierarchyKey ? (
        <EditChildHierarcyWrapper
          selectedCompareWith={selectedCompareWith}
          lastEditedDrivers={lastEditedDrivers}
          id={id}
          activeKey={activeKey}
          allowEdit={allowEdit}
          showIAData={showIAData}
          isL0TableHidden={isL0TableHidden}
          ref={{
            lastEditedDriversRef,
            editHierarchyInstance,
            editHierarchyTotalRowInstance,
            forecastMultiplierInstance,
            editHierarchyChildInstance,
            editHierarchyGrandChildInstance,
            editHierarchyChildTotalRowInstance,
            initialEditChildRowData,
            allEditedGrandChildRowData,
            initialEditRowData,
            initialTotalRowData,
            editChildRowData,
            currentHierarchyKey,
            currentChildHierarchyKey,
            allEditedChildRowData,
            allEditedGrandChildRowMapping,
            SkuName,
            isCompareChanges,
            disableAllowEditOnSaveRef,
            isSaveInProgressRef,
          }}
          key={activeChildHierarchyKey}
          activeChildHierarchyKey={activeChildHierarchyKey}
          setActiveChildHierarchyKey={setActiveChildHierarchyKey}
          driverForecastVal={driverForecastVal}
          driverForecastAllVal={driverForecastAllVal}
          setActiveL1={setActiveL1}
          setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
          activeL1={activeL1}
          isCalledFromMFPDashboard={isCalledFromMFPDashboard}
          selectedRowsFromMFP={selectedRows}
          disableAllowEditOnSave={disableAllowEditOnSave}
          setRefreshAllEditHierarchy={setRefreshAllEditHierarchy}
          setSelectedForecast={setSelectedForecast}
        />
      ) : null}

      {!props.hideSave &&
        allowEdit &&
        adaReducer?.userConfig?.hasOwnProperty("edit") &&
        isCalledFromMFPDashboard &&
        actionsJsxForMFP}
      {!props.hideSave &&
        allowEdit &&
        adaReducer?.userConfig?.hasOwnProperty("edit") &&
        !isCalledFromMFPDashboard &&
        actionsJsx}
    </div>
  );
};

export default forwardRef(EditHierarchyForecast);

const useStyles = makeStyles(() => ({
  saveForecastBtn: {
    marginTop: 30,
  },
  compareWithLabel: {
    color: "#60697d",
    fontSize: "12px",
    marginRight: "-15px",
  },
}));

// check isValid for L2's

export const manualCheckValid = (
  instance,
  row,
  column,
  isChanged,
  dispatch,
  isUserProfileEnabled,
  activeChildHierarchyKey,
  activeChildHierarchyParentKeyLocked,
  totalRowNode,
  isL0Level,
  useAdjustedUserForecastBase
) => {
  let colId = column.colId?.split(".")?.[0];
  let childAlreadyEdit = false;
  let parentCanEdit = false;

  instance.forEachNode((node) => {
    if (node?.data?.[colId]?.isLocked || node?.data?.[colId]?.isEdited) {
      childAlreadyEdit = true;
    }
  });

  if (
    childAlreadyEdit &&
    row?.row !== activeChildHierarchyKey &&
    !activeChildHierarchyParentKeyLocked &&
    totalRowNode?.data[colId]?.isLocked
  ) {
    let msg = t("ada.editHierarchy.valueResetLockedHierarchyValue", {
      column: colId,
      level: isL0Level ? "L0" : "L1",
      lockedLevel: isL0Level ? "L1" : "L2",
    });
    infoHandler(dispatch, msg);

    return true;
  }

  const isNoValueUpdated = onTotalChange(
    instance,
    row,
    column,
    isChanged,
    dispatch,
    true,
    isUserProfileEnabled,
    null,
    null,
    null,
    null,
    useAdjustedUserForecastBase
  );

  return isNoValueUpdated;
};

// To get intemediate L1 after applying L0 changes
export const getL1AfterL0update = (
  instance,
  row,
  column,
  isChanged,
  dispatch,
  isL0AfterL0TotalUpdate,
  useAdjustedUserForecastBase
) => {
  const updatedValue = onTotalChange(
    instance,
    row,
    column,
    isChanged,
    dispatch,
    true,
    null,
    null,
    null,
    true,
    isL0AfterL0TotalUpdate,
    useAdjustedUserForecastBase
  );

  return updatedValue;
};

// To get intemediate L1 after locking L0 & L2 of sibling L1
// eg. if two sku are there i.e. s1 & s2 & s1 has store st11, after locking st11 & sku total,
// if I change s2 SKU, then this fn gives us intemediate s1 SKU value

export const getL1AfterL0L2lock = (
  row,
  column,
  instance,
  totalInstance,
  totalKey,
  expandedL2Row,
  useAdjustedUserForecastBase
) => {
  let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

  // const updatedValue = "";
  let colId = column.colId?.split(".")?.[0];

  let lockedParentNode = totalInstance?.getRowNode(totalKey);
  let lockedParentdata = lockedParentNode?.data;
  let lockedParentValue = lockedParentdata?.[colId];

  let iaLockedParentValue = lockedParentValue?.[splitKey];
  let adjustedLockedParentValue = lockedParentValue?.adjusted;
  let modifiedAdjusted = 0;
  let modifiedAdjustedRespectiveIA = 0;

  const newValue = Number(row[colId].adjusted);

  // Below loop is to get sum of all locked cells & current edited cell (both [splitKey] & Edited)
  let nonModifiedCount = 0;
  instance.forEachNode((node) => {
    if (row.row === node.data.row || node?.data?.[colId]?.isLocked) {
      modifiedAdjusted += node.data[colId].adjusted;
      modifiedAdjustedRespectiveIA += node.data[colId]?.[splitKey];
    } else {
      nonModifiedCount += 1;
    }
  });

  let valueToDistribute = adjustedLockedParentValue - modifiedAdjusted;

  let updatedRatio =
    valueToDistribute / (iaLockedParentValue - modifiedAdjustedRespectiveIA);

  let formattedValue = null;
  instance.forEachNode((node) => {
    if (!node?.data?.[colId]?.isLocked && row.row !== node.data.row) {
      let value = Number(node.data[colId]?.[splitKey]);
      let updatedValue = updatedRatio * value;

      if (+iaLockedParentValue === 0) {
        updatedValue = valueToDistribute / nonModifiedCount;
      }

      if (node.data.row === expandedL2Row) {
        formattedValue = updatedValue;
      }
    }
  });

  return formattedValue;
};

// common fn to update all childs from active parent
export const manualTotalvalueChanged = (
  instance,
  row,
  column,
  isChanged,
  totalRowInstance,
  newValue,
  key = "total",
  dispatch,
  initialTotalRowData = {},
  childLockSum,
  isUserProfileEnabled,
  useAdjustedUserForecastBase
) => {
  try {
    let totalRowNode = totalRowInstance.getRowNode(key);

    // Distribute current updated cell data amongst it's immediate childs or if invalid return true
    const isNoValueUpdated = onTotalChange(
      instance,
      row,
      column,
      isChanged,
      dispatch,
      false,
      isUserProfileEnabled,
      null,
      null,
      null,
      null,
      useAdjustedUserForecastBase
    );
    if (isNoValueUpdated) {
      const oldValue =
        Number(
          totalRowNode?.data?.["last_updated_data"]?.[
            column.colId?.split(".")?.[0]
          ]
        ) || initialTotalRowData?.[0]?.[column.colId?.split(".")?.[0]].adjusted;
      totalRowNode?.setDataValue(column.colId, oldValue);
    } else {
      // Ratio for save payload, will be based upon this
      totalRowNode.data[
        column.colId?.split(".")?.[0]
      ].adjusted_manual = newValue;

      // Updating last updated
      //TO DO update last updated on change in individual cells
      let newData = totalRowNode.data;
      let prevLastUpdatedData = totalRowNode.data?.last_updated_data || {};
      newData.last_updated_data = {
        ...prevLastUpdatedData,
        [column.colId?.split(".")?.[0]]: newValue,
      };
      totalRowNode.setData(newData);
    }
  } catch (err) {}
};

// To get Previous Value in an cell, proceed in the following order, if at any stage value exists return it
// 1. if getting prev value from parent
// 2. If cell was edited before manually
// 3. initial data we got from the api
export const getOldValue = (prevOldValue, colId, row, initialEditRowData) => {
  let oldValue = prevOldValue;
  if (!isNumberOrString(oldValue)) {
    if (row["last_updated_data"]?.[colId]) {
      oldValue = Number(row["last_updated_data"]?.[colId]);
    } else {
      oldValue = initialEditRowData.find((el) => el.row === row.row)[colId]
        .adjusted;
    }
  }

  return oldValue;
};

export const getOldValueForSku = (
  prevOldValue,
  colId,
  row,
  initialEditRowData
) => {
  let oldValue = prevOldValue;

  if (row["last_updated_data"]?.[colId]) {
    oldValue = Number(row["last_updated_data"]?.[colId]);
  } else {
    oldValue = initialEditRowData.find((el) => el.row === row.row)[colId]
      .adjusted;
  }

  return oldValue;
};

export const onCellValueChange = (
  row,
  column,
  isChanged,
  instance,
  totalInstance,
  initialEditRowData,
  totalKey = "total",
  suppressEditFlag = false,
  dispatch = () => null,
  prevOldValue,
  activeL0Node,
  isUserProfileEnabled,
  editHierarchyInstance,
  useAdjustedUserForecastBase
) => {
  let colId = column.colId?.split(".")?.[0];

  if (!isChanged) return;

  let totalRowNode = totalInstance.getRowNode(totalKey);

  if (!totalRowNode?.data?.[colId]?.isLocked) {
    let editedNode = null;
    let totalSum = 0;
    instance.forEachNode((node) => {
      totalSum += Number(node.data[colId]?.adjusted) || 0;
      if (row.row === node.data.row) {
        editedNode = node;
        if (!suppressEditFlag) {
          // Marking node data as edited
          node.data.isEdited = true;
          node.data[colId].isEdited = true;
        }
      }
    });
    // if (fakeLocked) {
    //   return;
    // }
    // Setting value on total row & updating last updated value for the same
    totalRowNode.setDataValue(column.colId, totalSum);
    let newData = totalRowNode.data;
    let prevLastUpdatedData = totalRowNode.data?.last_updated_data || {};
    newData.last_updated_data = {
      ...prevLastUpdatedData,
      [colId]: totalSum,
    };
    totalRowNode.setData(newData);

    // Setting last updated value on edited row
    let newEditedRowData = editedNode.data;
    let prevEditedRowLastUpdatedData = editedNode.data?.last_updated_data || {};
    newEditedRowData.last_updated_data = {
      ...prevEditedRowLastUpdatedData,
      [colId]: Number(editedNode.data[colId].adjusted),
    };

    //Setting User Profile Ratio and Flag for Payload
    if (isUserProfileEnabled) {
      let prevEditedRowUserProfileData =
        editedNode.data?.user_profile_data || {};
      let ratio = editedNode.data[colId].adjusted_manual;
      if (editedNode.data[colId].user_profile) {
        ratio = ratio / editedNode.data[colId].user_profile;
      }
      newEditedRowData.user_profile_data = {
        ...prevEditedRowUserProfileData,
        [colId]: {
          user_profile: true,
          ratio: Number(editedNode.data[colId].adjusted_manual),
        },
      };
    }

    editedNode.setData(newEditedRowData);
  } else {
    reAdjustHierarchyInstance(
      row,
      column,
      initialEditRowData,
      instance,
      totalInstance,
      totalKey,
      dispatch,
      prevOldValue,
      totalRowNode, // locked parent value,
      activeL0Node,
      null,
      isUserProfileEnabled,
      null,
      null,
      null,
      editHierarchyInstance,
      null,
      null,
      null,
      null,
      useAdjustedUserForecastBase
    );
  }
};

// common fn to update all childs from parent
export const onTotalChange = (
  instance,
  row,
  column,
  isChanged,
  dispatch,
  noUpdate,
  isUserProfileEnabled,
  initialTotalVal,
  totalInstance,
  L1AfterL0update,
  L0AfterL0TotalUpdate,
  useAdjustedUserForecastBase
) => {
  try {
    let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";
    if (!isChanged) return;
    let colId = column.colId?.split(".")?.[0];

    const newValue = Number(row[colId].adjusted);
    const oldValue = Number(row[colId][splitKey]);
    let nonLockedSum = 0;
    let isAllLocked = true;
    //This variable is needed in case of 0 prediction
    let isAnyCellLocked = false;
    let lockedSum = 0;
    let lockedIASum = 0;

    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        lockedSum += Number(node.data[colId]?.adjusted || 0);
        lockedIASum += Number(node.data[colId]?.[splitKey] || 0);
        isAnyCellLocked = true;
      } else {
        nonLockedSum += Number(node.data[colId]?.[splitKey] || 0);
        isAllLocked = false;
      }
    });
    if (isAllLocked || (!nonLockedSum && lockedIASum)) {
      infoHandler(
        dispatch,
        t("ada.editHierarchy.valueResetSomeCellsZero", { column: colId })
      );

      return true;
    }

    // check if sum of all locked cells in child hierarchy is not more than value in their respective parent
    if ((lockedSum > newValue || lockedSum === newValue) && isAnyCellLocked) {
      infoHandler(
        dispatch,
        t("ada.editHierarchy.valueResetLessThanLockedSum", { column: colId })
      );

      return true;
    }

    //Restricts the readjustments on SKUs when Total is changed
    if (noUpdate && !L1AfterL0update) {
      return false;
    }

    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    if (isUserProfileEnabled) {
      let sum = 0;
      let l2StoreLocked = false;
      let updatedTotalValue = newValue;
      let totalCellRatio = row[colId].user_profile;

      instance.forEachNode((node) => {
        if (node?.data?.[colId]?.isLocked) {
          l2StoreLocked = true;
          updatedTotalValue -= node.data[colId]?.adjusted;
          totalCellRatio -= node.data[colId]?.user_profile;
        }
      });

      let calculatedTotalValue = newValue;

      if (row[colId].user_profile === 0) {
        calculatedTotalValue = newValue;

        let totalPaginatedRows = 0;
        instance.forEachNode((node) => {
          if (!node?.data?.[colId]?.isLocked) {
            totalPaginatedRows += 1;
          }
        });
        let eachCellValue = (newValue - lockedSum) / totalPaginatedRows;

        instance.forEachNode((node) => {
          if (!node?.data?.[colId]?.isLocked) {
            node.data.isEdited = false;
            node.data[colId].isEdited = false;
            delete node.data[colId]?.adjusted_manual;
            node.setDataValue(column.colId, eachCellValue);
          }
        });
      } else {
        calculatedTotalValue = updatedTotalValue / totalCellRatio;

        let totalUserProfile = 0;
        instance.forEachNode((node) => {
          if (!node?.data?.[colId]?.isLocked) {
            let updatedValue =
              node.data[colId]?.user_profile * calculatedTotalValue;
            node.data.isEdited = false;
            node.data[colId].isEdited = false;
            delete node.data[colId]?.adjusted_manual;
            node.setDataValue(column.colId, updatedValue);
            sum += updatedValue;
            totalUserProfile += node.data[colId]?.user_profile;
          }
        });
      }

      totalInstance.forEachNode((node) => {
        if (row.product_code === node.data?.product_code) {
          let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
          node.data.user_profile_data = {
            ...prevEditedRowUserProfileData,
            [colId]: {
              user_profile: true,
              ratio: Number(updatedTotalValue),
            },
          };
        }
      });

      return;
    }

    // When IA is 0
    if (!Number(oldValue)) {
      let totalPaginatedRows = 0;

      instance.forEachNode((node) => {
        if (!node?.data?.[colId]?.isLocked) {
          totalPaginatedRows += 1;
        }
      });

      const eachCellValue = (newValue - lockedSum) / totalPaginatedRows;

      if (L1AfterL0update) {
        return eachCellValue;
      }

      instance.forEachNode((node) => {
        if (!node?.data?.[colId]?.isLocked) {
          let updatedValue = eachCellValue;
          node.data.isEdited = false;
          node.data.last_updated_data = { [colId]: eachCellValue };
          node.data[colId].isEdited = false;
          delete node.data[colId]?.adjusted_manual;
          node.setDataValue(column.colId, updatedValue);
        }
      });
      return;
    }

    const newRatio = (newValue - lockedSum) / nonLockedSum;

    // this section specifically targets Signet at the moment, it return L1 value for which L2 is expaned when L0 is changed
    if (L1AfterL0update) {
      let expandedNode = null;
      instance?.forEachNode((node) => {
        if (node.expanded) {
          expandedNode = node;
        }
      });
      let updatedValue = 0;
      if (expandedNode?.data) {
        updatedValue =
          Number(expandedNode?.data[colId]?.[splitKey] || 0) * newRatio;
      }

      if (L0AfterL0TotalUpdate) {
        return newRatio;
      }
      return updatedValue;
    }

    instance.forEachNode((node) => {
      if (!node?.data?.[colId]?.isLocked) {
        let updatedValue = Number(node.data[colId]?.[splitKey] || 0) * newRatio;
        if (node.data[colId]?.[splitKey] === null) updatedValue = null;
        // if (node.data.last_updated_data) {
        let newData = node.data;
        let prevLastUpdatedData = node.data?.last_updated_data || {};
        newData.last_updated_data = {
          ...prevLastUpdatedData,
          [colId]: updatedValue,
        };
        node.data[colId].isEdited = false;
        delete node.data[colId]?.adjusted_manual;

        node.setData(newData);
        // }

        node.setDataValue(column.colId, updatedValue);
        node.data.isEdited = false;
      }
    });
  } catch (err) {
    console.log("Failed in onTotalChange Method.", err);
  }
};

export const NonActiveChangeFromParentToChild = (
  data,
  row,
  column,
  isUserProfileEnabled,
  noUpdate,
  dispatch,
  useAdjustedUserForecastBase
) => {
  let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

  // if (!isChanged) return;
  let colId = column.colId?.split(".")?.[0];

  const newValue = Number(row[colId].adjusted);
  const oldValue = Number(row[colId][splitKey]);
  let nonLockedSum = 0;
  let lockedSum = 0;

  data.forEach((node) => {
    if (node?.[colId]?.isLocked) {
      lockedSum += Number(node[colId].adjusted);
    } else {
      nonLockedSum += Number(node[colId][splitKey]);
    }
  });

  if (lockedSum > newValue) {
    infoHandler(
      dispatch,
      t("ada.editHierarchy.valueResetLessThanLockedSum", { column: colId })
    );
    return true;
  }

  if (noUpdate) return;

  if (isUserProfileEnabled) {
    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    let sum = 0;
    let l2StoreLocked = false;
    let updatedTotalValue = newValue;
    let totalCellRatio = row[colId].user_profile;
    let calculatedTotalValue = newValue;

    data.forEach((node) => {
      if (node?.[colId]?.isLocked) {
        l2StoreLocked = true;
        updatedTotalValue -= node[colId]?.adjusted;
        totalCellRatio -= node[colId]?.user_profile;
      }
    });

    if (row[colId].user_profile === 0) {
      calculatedTotalValue = newValue;

      let totalPaginatedRows = 0;
      data.forEach((node) => {
        if (!node?.[colId]?.isLocked) {
          totalPaginatedRows += 1;
        } else {
          lockedSum += Number(node[colId].adjusted);
        }
      });
      let eachCellValue = (newValue - lockedSum) / totalPaginatedRows;

      data.forEach((node) => {
        if (!node?.[colId]?.isLocked) {
          let updatedValue = eachCellValue;
          node[colId].adjusted = updatedValue;
        }
      });
    } else {
      calculatedTotalValue = updatedTotalValue / totalCellRatio;
      l2StoreLocked = true;

      let eachCellRatio = newValue;
      if (oldValue !== 0) eachCellRatio = newValue / oldValue;

      let totalUserProfile = 0;
      data.forEach((node) => {
        if (!node?.[colId]?.isLocked) {
          let updatedValue = node[colId]?.user_profile * calculatedTotalValue;
          node[colId].adjusted = updatedValue;
          sum += updatedValue;
          totalUserProfile += node[colId]?.user_profile;
        }
      });
    }

    return;
  }

  // When IA is 0
  if (!Number(oldValue)) {
    let totalPaginatedRows = 0;

    data.forEach((node) => {
      if (!node?.[colId]?.isLocked) {
        totalPaginatedRows += 1;
      } else {
        lockedSum += Number(node[colId].adjusted);
      }
    });
    const eachCellValue = (newValue - lockedSum) / totalPaginatedRows;

    data.forEach((node) => {
      if (!node?.[colId]?.isLocked) {
        let updatedValue = eachCellValue;
        node[colId].adjusted = updatedValue;
      }
    });
    return;
  }

  const newRatio = (newValue - lockedSum) / nonLockedSum;

  data.forEach((node) => {
    if (!node?.[colId]?.isLocked) {
      let updatedValue = Number(node[colId][splitKey]) * newRatio;
      node[colId].adjusted = updatedValue;
      node.last_updated_data = {
        [colId]: updatedValue,
      };
    }
  });
};

export const reAdjustHierarchyInstance = (
  row,
  column,
  initialEditRowData,
  instance,
  totalInstance,
  totalKey,
  dispatch,
  prevOldValue,
  lockedParentNode,
  activeL0Node,
  suppressEditFlag,
  isUserProfileEnabled,
  SKULength,
  isCalledFromMFPDashboard,
  editHierarchyChildTotalRowInstance,
  editHierarchyInstance,
  initialEditRowDataForChildTable,
  isUserProfileEnabledForSkuLevelTableFromStoreTable,
  activeChildHierarchyKey,
  selectedRowsFromMFP,
  useAdjustedUserForecastBase
) => {
  try {
    let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

    let colId = column.colId?.split(".")?.[0];

    let lockedParentdata = lockedParentNode?.data;
    let lockedParentValue = lockedParentdata?.[colId];

    let iaLockedParentValue = lockedParentValue?.[splitKey];
    let adjustedLockedParentValue = lockedParentValue?.adjusted;
    let modifiedAdjusted = 0;
    let modifiedAdjustedRespectiveIA = 0;

    const newValue = Number(row[colId].adjusted);

    // Move to parent on refactor

    var oldValue = getOldValue(prevOldValue, colId, row, initialEditRowData);

    if (Number(newValue) === Number(oldValue)) return;

    let totalRowNode = totalInstance?.getRowNode(totalKey);

    let lockedSum = 0;
    let nonLockedIASum = 0;
    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        let val = Number(node.data[colId]?.adjusted || 0);
        lockedSum += val;
      } else {
        //for handling edge case i.e when we have data and in that all [splitKey] datavalue is 0 except one data value
        if (row.row !== node.data.row) {
          let value = Number(node.data[colId]?.[splitKey] || 0);
          nonLockedIASum += value;
        }
      }
    });

    if (totalRowNode?.data[colId]?.adjusted - lockedSum < newValue) {
      infoHandler(
        dispatch,
        t("ada.editHierarchy.valueResetGreaterThanHierarchy", {
          row: row.row,
          column: colId,
        })
      );
      let currRowNode = instance?.getRowNode(row.row);

      return currRowNode?.setDataValue(column.colId, oldValue);
    }

    let nonLockedCount = 0;

    instance.forEachNode((node) => {
      if (
        node?.data?.[colId]?.isLocked ||
        row.row === node.data.row ||
        node?.data?.[colId]?.[splitKey] === null
      ) {
        let val = Number(node.data[colId]?.adjusted || 0);
        // sum += val;
      } else {
        nonLockedCount += 1;
      }
    });

    if (!nonLockedCount) {
      infoHandler(
        dispatch,
        t("ada.editHierarchy.valueResetCannotReadjust", {
          row: row.row,
          column: colId,
        })
      );

      let currRowNode = instance?.getRowNode(row.row);
      currRowNode?.setDataValue(column.colId, oldValue);

      return;
    }

    instance.forEachNode((node) => {
      if (row.row === node.data.row) {
        if (!suppressEditFlag) {
          // Marking node data as edited
          node.data.isEdited = true;
          node.data[colId].isEdited = true;
        }
      }
    });

    // Below loop is to get sum of all locked cells & current edited cell (both [splitKey] & Edited)
    let nonModifiedCount = 0;
    instance.forEachNode((node) => {
      if (row.row === node.data.row || node?.data?.[colId]?.isLocked) {
        modifiedAdjusted += node.data[colId].adjusted;
        modifiedAdjustedRespectiveIA += node.data[colId]?.[splitKey];
      } else {
        nonModifiedCount += 1;
      }
    });

    let valueToDistribute = adjustedLockedParentValue - modifiedAdjusted;

    let updatedRatio =
      valueToDistribute / (iaLockedParentValue - modifiedAdjustedRespectiveIA);

    if (iaLockedParentValue === modifiedAdjustedRespectiveIA) {
      updatedRatio = valueToDistribute / nonModifiedCount;
    }

    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    if (isUserProfileEnabled) {
      let sum = 0;
      let totalCellRatio = totalRowNode?.data[colId].user_profile;

      let l2StoreLocked = false;
      let calculatedTotalValue = 0;
      let updatedTotalValue = lockedParentValue?.adjusted;

      instance.forEachNode((node) => {
        if (node?.data?.[colId]?.isLocked) {
          l2StoreLocked = true;
          updatedTotalValue -= node.data[colId]?.adjusted;
          totalCellRatio -= node.data[colId]?.user_profile;
        }
      });
      updatedTotalValue -= newValue;
      totalCellRatio -= row[colId].user_profile;
      calculatedTotalValue = updatedTotalValue / totalCellRatio;

      let totalUserProfile = 0;
      instance.forEachNode((node) => {
        if (
          !node?.data?.[colId]?.isLocked &&
          row["store_code"] !== node.data["store_code"]
        ) {
          let updatedValue =
            node.data[colId]?.user_profile * calculatedTotalValue;
          node.data.isEdited = false;
          node.data[colId].isEdited = false;
          delete node.data[colId]?.adjusted_manual;
          node.setDataValue(column.colId, updatedValue);
          sum += updatedValue;
          totalUserProfile += node.data[colId]?.user_profile;
        }
      });

      instance.forEachNode((node) => {
        if (row.row === node.data?.row) {
          let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
          node.data.user_profile_data = {
            ...prevEditedRowUserProfileData,
            [colId]: {
              user_profile: true,
              ratio: Number(newValue),
            },
          };
        } else {
          if (
            node?.data.hasOwnProperty("product_code") &&
            !node?.data?.[colId]?.isLocked
          ) {
            let value = Number(node.data[colId]?.[splitKey]);
            let updatedValue = updatedRatio * value;

            if (+totalRowNode?.data[colId]?.[splitKey] === 0) {
              updatedValue = valueToDistribute / nonModifiedCount;
            }
            node.setDataValue(column.colId, updatedValue);
            // Updating Last updated
            let newData = node.data;
            newData.last_updated_data = {
              ...newValue.last_updated_data,
              [colId]: updatedValue,
            };

            node.setData(newData);
            newData[colId].isEditedBySibling = true;
            node.data[colId].isEdited = false;
          }
        }
      });

      totalInstance.forEachNode((node) => {
        let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
        if (totalKey === node.data?.row) {
          node.data.user_profile_data = {
            ...prevEditedRowUserProfileData,
            [colId]: {
              user_profile: true,
              ratio: Number(calculatedTotalValue),
              skipRatioCalculate: true,
            },
          };
        }
      });
    } else {
      if (SKULength > 1 && !lockedParentdata[colId]?.isLocked) {
        var sum = 0;
        let activeL0NodeForSku = {};
        instance.forEachNode((node) => {
          sum += Number(node.data[colId]?.adjusted || 0);
        });
        let totalRowNode = editHierarchyChildTotalRowInstance.getRowNode(
          "total"
        );
        if (totalRowNode?.data[colId]?.adjusted < sum) {
          infoHandler(
            dispatch,
            t("ada.editHierarchy.valueResetGreaterThanHierarchy", {
              row: row.row,
              column: colId,
            })
          );
          let currRowNode = instance?.getRowNode(row.row);
          currRowNode?.setDataValue(column.colId, oldValue);

          // lockedParentdata[colId].adjusted =
          //   lockedParentdata[colId].adjusted - oldValue;
          // lockedParentNode.setData(lockedParentdata);
          return;
        }
        let prevOldValueChild;
        let rowChild;
        lockedParentdata[colId].adjusted = sum;
        lockedParentNode.setData(lockedParentdata);

        editHierarchyInstance?.forEachNode((node) => {
          if (selectedRowsFromMFP[0]?.[Mfp_Key] === node.data.row) {
            activeL0NodeForSku = node;
          }
        });
        totalInstance.forEachNode((node) => {
          if (lockedParentdata.row === node.data.row) {
            prevOldValueChild = node.data[colId].adjusted;
          }
        });
        rowChild = totalInstance.getRowNode(lockedParentdata.row);
        editHierarchyChildTotalRowInstance.forEachNode((node) => {});
        reAdjustHierarchyInstanceFromGrandChildToChild(
          rowChild.data,
          column,
          initialEditRowDataForChildTable.current[
            selectedRowsFromMFP[0][Mfp_Key]
          ],
          totalInstance,
          editHierarchyChildTotalRowInstance,
          "total",
          dispatch,
          prevOldValueChild,
          totalRowNode, // locked parent value,
          activeL0NodeForSku,
          null,
          isUserProfileEnabledForSkuLevelTableFromStoreTable,
          useAdjustedUserForecastBase
        );
      } else {
        instance.forEachNode((node) => {
          if (row.row === node.data.row) {
            let newData = node.data;
            newData.last_updated_data = {
              ...newValue.last_updated_data,
              [colId]: newValue,
            };
            node.setData(newData);
            // Marking node data as edited
            newData.isEdited = true;
            newData[colId].isEdited = true;

            modifiedAdjusted += newValue;
            modifiedAdjustedRespectiveIA += newData[colId]?.[splitKey];
          }

          if (!node?.data?.[colId]?.isLocked && row.row !== node.data.row) {
            let newData = node.data;

            node.setData(newData);
            let value = Number(node.data[colId]?.[splitKey]);
            let updatedValue = updatedRatio * value;
            if (nonLockedIASum === 0) {
              updatedValue = updatedRatio;
            }
            if (+totalRowNode?.data[colId]?.[splitKey] === 0) {
              updatedValue = valueToDistribute / nonModifiedCount;
            }
            newData.last_updated_data = {
              ...newValue.last_updated_data,
              [colId]: updatedValue,
            };

            newData[colId].isEditedBySibling = true;

            node.setDataValue(column.colId, updatedValue);

            // Marking node data as edited
            // node.data.isEdited = false;
            node.data[colId].isEdited = false;

            // Updating Last updated
          }
        });
      }
    }

    // setting flag edited for L1 total (Selected L0)

    lockedParentdata.isEdited = true;
    lockedParentdata[colId].isEdited = false;
    lockedParentdata.isEditedFromChildData = true;
    lockedParentdata.isChildEdited = true;
    lockedParentdata[colId].isChildEdited = true;
    lockedParentdata[colId].isEditedFromChildData = true;
    lockedParentNode.setData(lockedParentdata);

    // setting flag edited for L0 selected department

    let activeL0Data = activeL0Node?.data;
    if (activeL0Data) {
      activeL0Data.isEdited = true;
      activeL0Data[colId].isEdited = true;
      activeL0Node.setData(activeL0Data);
    }
  } catch (error) {
    console.log("error", error);
  }
};

export const getL0ValidAfterL2Change = (
  row,
  column,
  initialEditRowData,
  instance,
  totalInstance,
  totalKey,
  dispatch,
  prevOldValue,
  lockedParentNode,
  useAdjustedUserForecastBase
) => {
  try {
    let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

    let colId = column.colId?.split(".")?.[0];

    let lockedParentdata = lockedParentNode?.data;
    let lockedParentValue = lockedParentdata?.[colId];

    let iaLockedParentValue = lockedParentValue?.[splitKey];
    let adjustedLockedParentValue = lockedParentValue?.adjusted;
    let modifiedAdjusted = 0;
    let modifiedAdjustedRespectiveIA = 0;

    const newValue = Number(row[colId].adjusted);

    // Move to parent on refactor

    var oldValue = getOldValue(prevOldValue, colId, row, initialEditRowData);
    console.log("chla123456667", row, newValue, oldValue);
    if (Number(newValue) === Number(oldValue)) return;

    let totalRowNode = totalInstance?.getRowNode(totalKey);

    let lockedSum = 0;
    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        let val = Number(node.data[colId]?.adjusted || 0);
        lockedSum += val;
      }
    });

    // if (totalRowNode?.data[colId]?.adjusted - lockedSum < newValue) {
    //   infoHandler(
    //     dispatch,
    //     `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
    //   );

    //   let currRowNode = instance?.getRowNode(row.row);
    //   currRowNode?.setDataValue(column.colId, oldValue);
    //   return true;
    // }
  } catch (error) {
    console.log("error", error);
  }
};

export const reAdjustHierarchyInstanceFromGrandChildToChild = (
  row,
  column,
  initialEditRowData,
  instance,
  totalInstance,
  totalKey,
  dispatch,
  prevOldValue,
  lockedParentNode,
  activeL0Node,
  suppressEditFlag,
  isUserProfileEnabled,
  useAdjustedUserForecastBase
) => {
  let colId = column.colId?.split(".")?.[0];
  let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

  let lockedParentdata = lockedParentNode?.data;
  let lockedParentValue = lockedParentdata?.[colId];

  let iaLockedParentValue = lockedParentValue?.[splitKey];
  let adjustedLockedParentValue = lockedParentValue?.adjusted;
  let modifiedAdjusted = 0;
  let modifiedAdjustedRespectiveIA = 0;

  const newValue = Number(row[colId].adjusted);

  // Move to parent on refactor

  var oldValue = getOldValueForSku(
    prevOldValue,
    colId,
    row,
    initialEditRowData
  );

  if (Number(newValue) === Number(oldValue)) return;

  let totalRowNode = totalInstance?.getRowNode(totalKey);

  let lockedSum = 0;
  instance.forEachNode((node) => {
    if (node?.data?.[colId]?.isLocked) {
      let val = Number(node.data[colId]?.adjusted || 0);
      lockedSum += val;
    }
  });
  // if (SKULength == 1) {
  //   if (totalRowNode?.data[colId]?.adjusted - lockedSum < newValue) {
  //     infoHandler(
  //       dispatch,
  //       `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
  //     );
  //     let currRowNode = instance?.getRowNode(row.row);

  //     currRowNode?.setDataValue(column.colId, oldValue);
  //     return;
  //   }
  // }

  let nonLockedCount = 0;

  instance.forEachNode((node) => {
    if (node?.data?.[colId]?.isLocked || row.row === node.data.row) {
      let val = Number(node.data[colId]?.adjusted || 0);

      // sum += val;
    } else {
      nonLockedCount += 1;
    }
  });

  if (!nonLockedCount) {
    infoHandler(
      dispatch,
      t("ada.editHierarchy.valueResetCannotReadjust", {
        row: row.row,
        column: colId,
      })
    );

    let currRowNode = instance?.getRowNode(row.row);
    currRowNode?.setDataValue(column.colId, oldValue);

    return;
  }

  instance.forEachNode((node) => {
    if (row.row === node.data.row) {
      if (!suppressEditFlag) {
        // Marking node data as edited
        node.data.isEdited = true;
        node.data[colId].isEdited = true;
      }
    }
  });

  // Below loop is to get sum of all locked cells & current edited cell (both [splitKey] & Edited)
  let nonModifiedCount = 0;
  instance.forEachNode((node) => {
    if (row.row === node.data.row || node?.data?.[colId]?.isLocked) {
      modifiedAdjusted += node.data[colId].adjusted;
      modifiedAdjustedRespectiveIA += node.data[colId]?.[splitKey];
    } else {
      nonModifiedCount += 1;
    }
  });

  let valueToDistribute = adjustedLockedParentValue - modifiedAdjusted;

  let updatedRatio =
    valueToDistribute / (iaLockedParentValue - modifiedAdjustedRespectiveIA);

  //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
  if (isUserProfileEnabled) {
    let sum = 0;
    let totalCellRatio = row[colId].user_profile;
    let l2StoreLocked = false;
    let calculatedTotalValue = 0;
    let updatedTotalValue = lockedParentValue?.adjusted;

    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        l2StoreLocked = true;
        updatedTotalValue -= node.data[colId]?.adjusted;
        totalCellRatio -= node.data[colId]?.user_profile;
      }
    });
    updatedTotalValue -= newValue;
    totalCellRatio -= row[colId].user_profile;
    calculatedTotalValue = updatedTotalValue / totalCellRatio;

    let totalUserProfile = 0;
    instance.forEachNode((node) => {
      if (
        !node?.data?.[colId]?.isLocked &&
        row["store_code"] !== node.data["store_code"]
      ) {
        let updatedValue =
          node.data[colId]?.user_profile * calculatedTotalValue;
        node.data.isEdited = false;
        node.data[colId].isEdited = false;
        delete node.data[colId]?.adjusted_manual;
        node.setDataValue(column.colId, updatedValue);
        sum += updatedValue;
        totalUserProfile += node.data[colId]?.user_profile;
      }
    });

    instance.forEachNode((node) => {
      if (row.row === node.data?.row) {
        let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
        node.data.user_profile_data = {
          ...prevEditedRowUserProfileData,
          [colId]: {
            user_profile: true,
            ratio: Number(newValue),
          },
        };
      } else {
        if (
          node?.data.hasOwnProperty("product_code") &&
          !node?.data?.[colId]?.isLocked
        ) {
          let value = Number(node.data[colId]?.[splitKey]);
          let updatedValue = updatedRatio * value;

          if (+totalRowNode?.data[colId]?.[splitKey] === 0) {
            updatedValue = valueToDistribute / nonModifiedCount;
          }
          node.setDataValue(column.colId, updatedValue);
          // Updating Last updated
          let newData = node.data;
          newData.last_updated_data = {
            ...newValue.last_updated_data,
            [colId]: updatedValue,
          };

          node.setData(newData);
        }
      }
    });

    totalInstance.forEachNode((node) => {
      let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
      node.data.user_profile_data = {
        ...prevEditedRowUserProfileData,
        [colId]: {
          user_profile: true,
          ratio: Number(updatedTotalValue),
        },
      };
    });
  } else {
    instance.forEachNode((node) => {
      if (row.row === node.data.row) {
        let newData = node.data;
        newData.last_updated_data = {
          ...newValue.last_updated_data,
          [colId]: newValue,
        };
        node.setData(newData);
        // Marking node data as edited
        newData.isEdited = true;
        newData[colId].isEdited = true;

        modifiedAdjusted += newValue;
        modifiedAdjustedRespectiveIA += newData[colId]?.[splitKey];
      }

      if (!node?.data?.[colId]?.isLocked && row.row !== node.data.row) {
        let value = Number(node.data[colId]?.[splitKey]);
        let updatedValue = updatedRatio * value;

        if (+totalRowNode?.data[colId]?.[splitKey] === 0) {
          updatedValue = valueToDistribute / nonModifiedCount;
        }
        node.setDataValue(column.colId, updatedValue);

        // Marking node data as edited
        // node.data.isEdited = true;
        // node.data[colId].isEdited = true;

        // Updating Last updated
        let newData = node.data;
        newData.last_updated_data = {
          ...newValue.last_updated_data,
          [colId]: updatedValue,
        };

        node.setData(newData);
      }
    });
  }

  // setting flag edited for L1 total (Selected L0)

  lockedParentdata.isEdited = true;
  lockedParentdata[colId].isEdited = false;
  lockedParentdata.isEditedFromChildData = true;
  lockedParentdata.isChildEdited = true;
  lockedParentdata[colId].isChildEdited = true;
  lockedParentdata[colId].isEditedFromChildData = true;
  lockedParentNode.setData(lockedParentdata);

  // setting flag edited for L0 selected department

  let activeL0Data = activeL0Node?.data;
  if (activeL0Data) {
    activeL0Data.isEdited = true;
    activeL0Data[colId].isEdited = true;
    activeL0Node.setData(activeL0Data);
  }
};

export const NonMountChangeByParent = (
  parentInstance,
  key,
  updatedData,
  grandParentInstance,
  greatGrandParentInstance,
  grandParentKey = "total",
  isUserProfileEnabled,
  isL0SiblingsUnLockedForEmptyForecast,
  useAdjustedUserForecastBase,
  predictedFiscalWeeks
) => {
  let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

  let currParent = parentInstance.current.api.getRowNode(key)?.data;
  let grandParent = grandParentInstance.current.api.getRowNode(grandParentKey)
    ?.data;
  let greatGrandParent = greatGrandParentInstance?.current?.api?.getRowNode(
    "total"
  )?.data;
  let columnEditedMapping = {};

  //checkingParentEdited
  for (let key in currParent) {
    if (
      (isNumber(key) || predictedFiscalWeeks?.includes(key)) &&
      (currParent[key]?.isEdited || currParent[key]?.isEditedBySibling) &&
      !columnEditedMapping[key]
    ) {
      columnEditedMapping[key] = true;
    }
  }

  if (grandParent) {
    for (let key in grandParent) {
      if (
        (isNumber(key) || predictedFiscalWeeks?.includes(key)) &&
        grandParent[key]?.isEdited &&
        !columnEditedMapping[key]
      ) {
        columnEditedMapping[key] = true;
      }
    }
  }

  if (greatGrandParent) {
    for (let key in greatGrandParent) {
      if (
        (isNumber(key) || predictedFiscalWeeks?.includes(key)) &&
        greatGrandParent[key]?.isEdited &&
        !columnEditedMapping[key]
      ) {
        columnEditedMapping[key] = true;
      }
    }
  }

  let updateData = (newValue, oldValue, userProfile, data, column) => {
    let sum = 0;

    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    if (isUserProfileEnabled) {
      let sum = 0;
      let eachCellRatio = newValue;
      if (userProfile !== 0) {
        eachCellRatio = newValue / userProfile;
        let totalUserProfile = 0;

        data.forEach((node) => {
          // let updatedValue = 0;
          // if (newValue) {
          //   updatedValue = eachCellRatio * node[column]?.adjusted;
          // }
          // if (oldValue === 0) {
          //   updatedValue = node[column]?.user_profile * newValue;
          // }
          let updatedValue = node[column]?.user_profile * eachCellRatio;

          node[column].adjusted = updatedValue;
          sum += updatedValue;
          totalUserProfile += node[column].user_profile;
        });
      } else {
        const eachCellValue = newValue / data.length;
        data.forEach((node) => {
          let updatedValue = eachCellValue;
          node[column].adjusted = updatedValue;
        });
      }

      return;
    }

    // When IA is null
    if (oldValue === null && isL0SiblingsUnLockedForEmptyForecast) {
      data.forEach((node) => {
        node[column].adjusted = null;
      });
      return;
    }

    // When IA is 0
    if (!Number(oldValue)) {
      const eachCellValue = newValue / data.length;

      data.forEach((node) => {
        let updatedValue = eachCellValue;
        node[column].adjusted = updatedValue;
      });
      return;
    }

    data.forEach((node) => {
      sum += Number(node[column]?.[splitKey]);
    });

    const newRatio = newValue / sum;

    data.forEach((node) => {
      let updatedValue = Number(node[column]?.[splitKey]) * newRatio;
      node[column].adjusted = updatedValue;
    });
  };

  // if (currParent.isEdited || ignoreEditedCheck) {
  for (let key in currParent) {
    if (
      (isNumber(key) || predictedFiscalWeeks?.includes(key)) &&
      columnEditedMapping[key]
    ) {
      updateData(
        currParent[key].adjusted,
        currParent[key]?.[splitKey],
        currParent[key].user_profile,
        updatedData,
        key
      );
    }
  }
  // }
  return updatedData;
};

export const lockCellApi = (cellProps, isLocked, instance) => {
  let lockedCellNode = instance?.current?.api.getRowNode(
    cellProps?.cellData?.data?.row
  );

  lockedCellNode.data[cellProps.column.id?.split(".")?.[0]].isLocked = isLocked;
  instance.current.api.refreshCells({
    force: true,
  });
};

export const lockCellCustomConditionFn = (instance) => {
  let isLocked =
    instance.data?.[instance?.colDef?.id?.split(".")?.[0]]?.isLocked;
  return isLocked;
};

// check in childs, if any of the cells are locked then return true

// P.S. mostly used to find locked childs in active state(i.e. The table was opened & edited & is hidden now)

export const hasIsLockedNested = (data, objKey) => {
  if (typeof data === "object" && data !== null) {
    // Check for "objKey" and "isLocked" in the current object:
    if (
      objKey in data &&
      typeof data?.[objKey] === "object" &&
      "isLocked" in data?.[objKey] &&
      data?.[objKey]?.["isLocked"] === true
    ) {
      return true;
    }
    // Recursively check nested objects and arrays within the specified key:
    for (const value of Object.values(data)) {
      if (hasIsLockedNested(value, objKey) && objKey !== "last_updated_data") {
        return true;
      }
    }
  }
  // Not found in this object or its nested structures:
  return false;
};
