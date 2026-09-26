import { makeStyles } from "@mui/styles";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import TabsComponent from "core/commonComponents/tabs";
import { Prompt } from "impact-ui";
import { forwardRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DownloadForecast from "./DownloadForecast";
import EditHierarchyForecast from "./edit-hierarcy-forecast";
// import ForecastMultiplier from "./forecast-multiplier";
import { setResetForecastMultiplierTabData } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import ForecastMultiplierWrapper from "./forecast-multiplier/forecastMultiplierWrapper";
import UploadForecast from "./UploadForecast";
import globalStyles from "core/Styles/globalStyles";

const EditForecast = (props, ref) => {
  const dispatch = useDispatch();
  const [lastSavedDrivers, setLastSavedDrivers] = useState([]);
  const [refreshAllEditHierarchy, setRefreshAllEditHierarchy] = useState(0);

  const globalClasses = globalStyles();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

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
    setLastEditedDrivers,
  } = props;

  const tabMapping = {
    ForecastMultiplier: (
      <ForecastMultiplierWrapper
        activeKey={activeKey}
        key={activeKey}
        ref={ref}
        lastEditedDrivers={lastEditedDrivers}
        allowEdit={props.allowEdit}
        showIAData={showIAData}
        showOriginalIAForecast={showOriginalIAForecast}
        showScenario={props.showScenario}
        id={id}
        selectedForecast={props.selectedForecast}
        tabKey={props.tabKey}
        // Show Original IA Forecast only when tab is not IA
        // as original IA forecast will be there by default in IA tab
        showIARecommended={props.tabKey !== "IA"}
        lastSavedDrivers={lastSavedDrivers}
        setLastSavedDrivers={setLastSavedDrivers}
        index={index}
        setSavePerformedTab={setSavePerformedTab}
        activeTab={parentControlledVal}
        disableAllowEditOnSave={disableAllowEditOnSave}
        setActiveTransactionData={setActiveTransactionData}
        activeTransactionData={activeTransactionData}
        setLastEditedDrivers={setLastEditedDrivers}
      />
    ),
    EditHierarchyForecast: (
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
      />
    ),
  };

  const editForecastTab = deepDive?.tabs?.map((tab) => {
    return {
      label: tab.label,
      id: tab.id,
      TabPanel: tabMapping[tab.TabPanel],
    };
  });

  return (
    <CustomAccordion label="Forecast Deep Dive">
      <Prompt
        isOpen={showPrompt.status}
        title="Changing Tabs?"
        subHeading="Are you sure you want to change tabs?"
        infoList={["Any unsaved changes will be lost."]}
        primaryButtonProps={{
          children: "Yes",
          onClick: () => {
            resetDrivers();
            handleParentControlledVal(null, showPrompt.value, true, true);

            if (id !== "IA") {
              dispatch(
                setResetForecastMultiplierTabData({
                  key: id,
                  value: {},
                })
              );
              setRefreshChartDataCounter((prev) => prev + 1);
            }
            setShowPrompt((prevState) => ({ ...prevState, status: false }));
          },
        }}
        tertiaryButtonProps={{
          children: "No",
          onClick: () =>
            setShowPrompt((prevState) => ({ ...prevState, status: false })),
        }}
        variant="warning"
      />
      <div className={globalClasses.layoutAlignEnd}>
        {adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_upload_button_for_forecast &&
          id !== "IA" && <UploadForecast />}
        <DownloadForecast />
      </div>
      <TabsComponent
        remountOnTabChange
        tabPannelStyle={{ padding: "0px" }}
        tabContainerstyle={{ padding: "0px" }}
        tabsData={editForecastTab}
        parentControlledVal={parentControlledVal}
        setParentControlledVal={handleParentControlledVal}
      />
    </CustomAccordion>
  );
};

export default forwardRef(EditForecast);

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiPaper-root": {
      padding: "0.5rem 4rem",
    },
  },
  title: {
    alignSelf: "center",
  },
  infoContainer: {
    background: theme.palette.background.warningInfo,
    padding: "0.6rem 0 1rem 1rem",
    marginTop: "1.5rem",
    border: `1px solid ${theme.palette.warning.main}`,
  },
  dialogContentText: {
    padding: "0 3rem",
  },
}));
