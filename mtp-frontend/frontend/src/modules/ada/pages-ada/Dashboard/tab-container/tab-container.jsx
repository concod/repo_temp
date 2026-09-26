import { makeStyles } from "@mui/styles";
import TabsComponent from "core/commonComponents/tabs";
import { cloneDeep, isEmpty } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import ComparePlans from "../../Compare-Plan";

import { useHistoricActual } from "modules/ada/utils-ada/customHooks/useHostoricActuals";
import {
  getStaticForecastXaxis,
  setXaxisStaticDates,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { useSaveForecastStatus } from "modules/ada/utils-ada/customHooks/useSaveForecastStatus";
import DashboardTab from "./dashboard-tab";
import NoDataWrapper from "../no-data-wrapper";
import { useLoading } from "../LoaderWrapper";

console.log("Ada Visual Deployment October 6th 04:52 pm");

const TabContainer = (props) => {
  const {
    activeKey,
    setActiveKey,
    showScenario,
    showScenario2,
    updateAllData,
    graphPayload,
    isMFPEnabled,
    setDisableShowScenario,
  } = props;
  const classes = useStyles();
  const dispatch = useDispatch();
  // useHistoricActual(activeKey, isMFPEnabled);
  let isSaveInProgressRef = useRef(false);
  let saveApiCountRef = useRef(0);
  let disableAllowEditOnSaveRef = useRef(false);
  const timeoutRef = useRef(null);
  const isViewEditHierarchyMountedRef = useRef(false);

  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const { loading } = useLoading();

  const [clientTabData, setClientTabData] = useState(
    adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.tabs || []
  );

  const [selectedForecast, setSelectedForecast] = useState({
    selected: "",
    activeKey: 0,
  });
  let [activeTransactionData, setActiveTransactionData] = useState({
    transactionId: "",
    status: "",
  });

  const [parentControlledVal, setParentControlledVal] = useState(0);
  const [savePerformedTab, setSavePerformedTab] = useState(0);
  const [comparisonSaveRow, setComparisonSaveRow] = useState("");
  const [deepDiveTabChanged, setDeepDiveTabChanged] = useState(false);
  const [disableAllowEditOnSave, setDisableAllowEditOnSave] = useState(false);
  const [isComparisonTabMounted, setIsComparisonTabMounted] = useState(false);
  const [resetDriversCounter, setResetDriversCounter] = useState(0);
  const [isSavePerformed, setIsSavePerformed] = useState(false);

  useSaveForecastStatus(
    saveApiCountRef,
    isSaveInProgressRef,
    showScenario,
    showScenario2,
    savePerformedTab,
    deepDiveTabChanged,
    setDeepDiveTabChanged,
    setDisableAllowEditOnSave,
    disableAllowEditOnSaveRef,
    isViewEditHierarchyMountedRef,
    comparisonSaveRow,
    setComparisonSaveRow,
    setResetDriversCounter,
    activeTransactionData,
    setActiveTransactionData,
    timeoutRef,
    setIsSavePerformed,
    setSelectedForecast
  );

  const handleActiveTab = () => {
    let clientConfigTabData =
      adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
        ?.dashboard?.tabs;
    if (!clientConfigTabData?.length) return;
    setParentControlledVal(clientConfigTabData?.length === 1 ? 0 : 1);
    return clientConfigTabData;
  };

  useEffect(() => {
    setDisableShowScenario(loading);
  }, [loading]);

  //Resets the Default Tab as Active after applying filters
  useEffect(() => {
    if (adaDashboardReducer?.isFiltersValid) {
      let clientConfigTabData =
        adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
          ?.dashboard?.tabs;
      if (clientConfigTabData?.length === 1) {
        if (parentControlledVal !== 0) {
          setParentControlledVal(0);
        }
      } else {
        if (parentControlledVal !== 1) {
          setParentControlledVal(1);
        }
      }
    }
  }, [adaDashboardReducer?.isFiltersValid]);

  useEffect(() => {
    let clientConfigTabData = handleActiveTab();

    setClientTabData(clientConfigTabData);
  }, [
    adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.tabs,
  ]);

  useEffect(() => {
    if (clientTabData?.length <= 1) return;
    if (showScenario) {
      let updatedClientTabData = cloneDeep(clientTabData);
      updatedClientTabData[2].defaultHidden = false;
      setParentControlledVal(2);
      setClientTabData(updatedClientTabData);
    } else {
      let updatedClientTabData = cloneDeep(clientTabData);
      updatedClientTabData[2].defaultHidden = true;
      setClientTabData(updatedClientTabData);
      setParentControlledVal(1);
    }
  }, [showScenario]);

  useEffect(() => {
    if (clientTabData?.length <= 1) return;
    if (
      !adaDashboardReducer?.clientConfig?.attribute_value?.show_features
        ?.show_two_scenarios
    )
      return;
    if (showScenario2) {
      let updatedClientTabData = cloneDeep(clientTabData);

      updatedClientTabData[3].defaultHidden = false;

      setParentControlledVal(3);
      setClientTabData(updatedClientTabData);
    } else {
      let updatedClientTabData = cloneDeep(clientTabData);
      updatedClientTabData[3].defaultHidden = true;
      setClientTabData(updatedClientTabData);
      setParentControlledVal(1);
    }
  }, [showScenario2]);

  useEffect(() => {
    // handleActiveTab();
    setIsComparisonTabMounted(false);
  }, [activeKey]);

  useEffect(() => {
    const fetch = async () => {
      if (!isEmpty(graphPayload)) {
        const data = await getStaticForecastXaxis(graphPayload);
        dispatch(setXaxisStaticDates(data));
      }
    };
    if (!activeKey) {
      return;
    } else {
      fetch();
    }
  }, [activeKey]);

  const handleParentControlledVal = (_, newVal, allowedTabChange) => {
    setParentControlledVal(newVal);
  };

  return (
    <div className={classes.container}>
      <TabsComponent
        parentControlledVal={parentControlledVal}
        setParentControlledVal={handleParentControlledVal}
        tabPannelStyle={{ padding: "10px 0 0" }}
        tabContainerstyle={{ padding: "0px", marginTop: 0 }}
        tabsData={
          clientTabData
            ? clientTabData
                .filter(({ defaultHidden }) => !defaultHidden)
                .map((tab, index) => {
                  if (tab.isCompare) {
                    return {
                      label: tab.label,
                      id: tab.id,
                      TabPanel: activeKey ? (
                        <ComparePlans
                          index={index}
                          activeTab={parentControlledVal}
                          key={activeKey}
                          {...props}
                          {...tab}
                          ref={{
                            saveApiCountRef,
                            isSaveInProgressRef,
                          }}
                          updateAllData={updateAllData}
                          showScenario={showScenario}
                          showScenario2={showScenario2}
                          clientTabData={clientTabData}
                          setSelectedForecast={setSelectedForecast}
                          setIsComparisonTabMounted={setIsComparisonTabMounted}
                          setSavePerformedTab={setSavePerformedTab}
                          setComparisonSaveRow={setComparisonSaveRow}
                          setResetDriversCounter={setResetDriversCounter}
                          setActiveTransactionData={setActiveTransactionData}
                        />
                      ) : (
                        <NoDataComparisonContainer />
                      ),
                    };
                  }
                  return {
                    label: tab.label,
                    id: tab.id,
                    TabPanel: activeKey ? (
                      <DashboardTab
                        index={index}
                        setSavePerformedTab={setSavePerformedTab}
                        activeTab={parentControlledVal}
                        setDeepDiveTabChanged={setDeepDiveTabChanged}
                        {...props}
                        tab={tab}
                        ref={{
                          saveApiCountRef,
                          isSaveInProgressRef,
                          disableAllowEditOnSaveRef,
                          timeoutRef,
                          isViewEditHierarchyMountedRef,
                        }}
                        tabKey={tab.tabKey}
                        showDriverForecast={tab.showDriverForecast}
                        showDriverSignificance={tab.showDriverSignificance}
                        allowEdit={tab.allowEdit}
                        disableAllowEditOnSave={isSaveInProgressRef.current}
                        setActiveTransactionData={setActiveTransactionData}
                        activeTransactionData={activeTransactionData}
                        allowL0Edit={tab.allowL0Edit}
                        showOriginalIAForecast={tab.showOriginalIAForecast}
                        showIAData={tab.showIAData}
                        showDriverRank={tab.showDriverRank}
                        setSelectedForecast={setSelectedForecast}
                        selectedForecast={selectedForecast}
                        isComparisonTabMounted={isComparisonTabMounted}
                        resetDriversCounter={resetDriversCounter}
                        setActiveKey={setActiveKey}
                      />
                    ) : (
                      <NoDataContainer
                        showDriverForecast={tab.showDriverForecast}
                        showDriverRank={tab.showDriverRank}
                      />
                    ),
                  };
                })
            : []
        }
        remountOnTabChange={false}
      />
    </div>
  );
};
export default TabContainer;

const useStyles = makeStyles((theme) => ({
  container: {
    position: "relative",
  },
  titleFilter: {
    marginBottom: "1rem",
  },
}));

const NoDataComparisonContainer = () => {
  return (
    <>
      <NoDataWrapper label="Scenario Comparison Forecast" />
      <NoDataWrapper label="Scenario Comparison" />
    </>
  );
};

const NoDataContainer = ({ showDriverForecast }) => {
  return (
    <>
      {showDriverForecast && <NoDataWrapper label="Drivers of Forecast" />}
      <NoDataWrapper label="Forecast Deep Dive" />
      <NoDataWrapper label="Visualization" />
    </>
  );
};
