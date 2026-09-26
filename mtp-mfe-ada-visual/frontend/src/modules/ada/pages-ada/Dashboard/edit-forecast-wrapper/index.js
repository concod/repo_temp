import { forwardRef, useEffect } from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import EditHierarchyForecast from "modules/ada/pages-ada/Dashboard/edit-forecast/edit-hierarcy-forecast";
import { setEditHierarchyForecastSave } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { FORECAST_SAVE_STATUS } from "modules/ada/utils-ada/utilityFunctions";
import ViewHierarchyDriversSignificance from "./ViewHierarchyDriversSignificance";

const EditForecastWrapper = (props, ref) => {
  const [refreshAllEditHierarchy, setRefreshAllEditHierarchy] = useState(0);
  const dispatch = useDispatch();

  const {
    activeKey,
    resetDrivers,
    lastEditedDrivers,
    showIAData,
    id,
    showOriginalIAForecast,
    showPrompt,
    handleParentControlledVal,
    setShowPrompt,
    parentControlledVal,
    deepDive,
    counterOnEditHierarchyChange,
    setCounterOnEditHierarchyChange,
    setRefreshChartDataCounter,
    index,
    setSavePerformedTab,
    disableAllowEditOnSave,
    setSelectedForecast,
    setActiveTransactionData,
    activeTransactionData,
    isForecastSumarryEdited,
    setIsEditHierarchyForecastEdited,
    setIsSavePerformed,
    setIsForecastSumarryEdited,
    editHierarchyForecastSave,
    forecastMultiplierSaveStatus,
    lastSavedDrivers,
    setLastSavedDrivers,
    setLastEditedDrivers,
  } = props;

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const showDriverSignificance =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;

  useEffect(() => {
    ref?.isViewEditHierarchyMountedRef &&
      (ref.isViewEditHierarchyMountedRef.current = true);
    return () => {
      ref?.isViewEditHierarchyMountedRef &&
        (ref.isViewEditHierarchyMountedRef.current = false);
      forecastMultiplierSaveStatus !== FORECAST_SAVE_STATUS.SAVING &&
        dispatch(setEditHierarchyForecastSave(FORECAST_SAVE_STATUS.IDLE));
    };
  }, []);

  useEffect(() => {
    if (
      editHierarchyForecastSave === FORECAST_SAVE_STATUS.SAVING &&
      activeTransactionData.status == "COMPLETED"
    ) {
      dispatch(setEditHierarchyForecastSave(FORECAST_SAVE_STATUS.SAVED));
    }
  }, [activeTransactionData]);

  return (
    <>
      {showDriverSignificance && (
        <ViewHierarchyDriversSignificance
          key={activeKey || refreshAllEditHierarchy}
          ref={ref}
        />
      )}
      <EditHierarchyForecast
        counterOnEditHierarchyChange={counterOnEditHierarchyChange}
        setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
        key={activeKey || refreshAllEditHierarchy}
        {...props}
        lastEditedDrivers={lastEditedDrivers}
        ref={ref}
        showIAData={showIAData}
        id={id}
        lastSavedDrivers={lastSavedDrivers}
        setLastSavedDrivers={setLastSavedDrivers}
        index={index}
        setSavePerformedTab={setSavePerformedTab}
        activeTab={parentControlledVal}
        disableAllowEditOnSave={disableAllowEditOnSave}
        setActiveTransactionData={setActiveTransactionData}
        setRefreshAllEditHierarchy={setRefreshAllEditHierarchy}
        setSelectedForecast={setSelectedForecast}
        hideSave={true}
        setIsEditHierarchyForecastEdited={setIsEditHierarchyForecastEdited}
        setIsSavePerformed={() => null}
        setIsForecastSumarryEdited={setIsForecastSumarryEdited}
        resetDrivers={resetDrivers}
        setLastEditedDrivers={setLastEditedDrivers}
      />
    </>
  );
};

export default forwardRef(EditForecastWrapper);
