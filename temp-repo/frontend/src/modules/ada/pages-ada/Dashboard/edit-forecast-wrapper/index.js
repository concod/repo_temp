import { forwardRef } from "react";
import { useState } from "react";
import EditHierarchyForecast from "modules/ada/pages-ada/Dashboard/edit-forecast/edit-hierarcy-forecast";

const EditForecastWrapper = (props, ref) => {
  const [lastSavedDrivers, setLastSavedDrivers] = useState([]);
  const [refreshAllEditHierarchy, setRefreshAllEditHierarchy] = useState(0);

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
  } = props;

  return (
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
      isForecastSumarryEdited={isForecastSumarryEdited}
    />
  );
};

export default forwardRef(EditForecastWrapper);
