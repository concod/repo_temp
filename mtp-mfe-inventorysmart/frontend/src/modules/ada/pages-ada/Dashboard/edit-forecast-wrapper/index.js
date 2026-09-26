import { forwardRef, useEffect } from "react";
import { useState } from "react";
import EditHierarchyForecast from "modules/ada/pages-ada/Dashboard/edit-forecast/edit-hierarcy-forecast";
import { useDispatch, useSelector } from "react-redux";
import { setEditHierarchyForecastSave } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { FORECAST_SAVE_STATUS } from "modules/ada/utils-ada/utilityFunctions";
import ViewHierarchyDriversSignificance from "./ViewHierarchyDriversSignificance";

const EditForecastWrapper = (props, ref) => {
  const [lastSavedDrivers, setLastSavedDrivers] = useState([]);
  const [refreshAllEditHierarchy, setRefreshAllEditHierarchy] = useState(0);
  const dispatch = useDispatch();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const showDriverSignificance =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;

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
  } = props;

  useEffect(() => {
    return () => {
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
        setIsSavePerformed={setIsSavePerformed}
        setIsForecastSumarryEdited={setIsForecastSumarryEdited}
      />
    </>
  );
};

export default forwardRef(EditForecastWrapper);
