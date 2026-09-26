// import { makeStyles } from "@mui/styles";
// import TabsComponent from "core/commonComponents/tabs";
// import { cloneDeep, isEmpty } from "lodash";
// import React, { useEffect, useRef, useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import ComparePlans from "../Compare-Plan";
// import Chart from "./chart";
// import DriverForecastTable from "./driver-forecast-table";
// import EditForecast from "./edit-forecast";
// import NoDataWrapper from "./no-data-wrapper";
// import { useHistoricActual } from "modules/ada/utils-ada/customHooks/useHostoricActuals";
// import {
//   getStaticForecastXaxis,
//   setXaxisStaticDates,
// } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
// import CustomAccordion from "core/commonComponents/Custom-Accordian";
// import DriverSignificance from "./driver-significance-table";
// import { forwardRef } from "react";
// import { useLoading } from "./LoaderWrapper";
// import EditForecastWrapper from "./edit-forecast-wrapper";
// import ForecastAdjustmentWrapper from "./forecast-adjustment-wrapper";
// import DriverRankTable from "./driver-rank-table";
// import DriverChannelDetailTable from "./driver-channel-detail-table";
// import { Accordion } from "impact-ui-v3";
// import { Prompt } from "impact-ui-v3";

// import LabelWithTooltip from "modules/ada/utils-ada/labelWithTooltip";
// import { Typography, Box } from "@mui/material";

// console.log("Ada Visual Deployment May 23th 10:00 am");
// const DashboardTabs = (props) => {
//   const {
//     activeKey,
//     setActiveKey,
//     showScenario,
//     showScenario2,
//     updateAllData,
//     graphPayload,
//     isMFPEnabled,
//     setDisableShowScenario,
//   } = props;
//   const classes = useStyles();
//   const dispatch = useDispatch();
//   useHistoricActual(activeKey, isMFPEnabled);
//   let isSaveInProgressRef = useRef(false);
//   let saveApiCountRef = useRef(0);
//   const isViewEditHierarchyMountedRef = useRef(false);
//   let disableAllowEditOnSaveRef = useRef(false);

//   const adaDashboardReducer = useSelector(
//     (store) => store?.adaReducer?.adaDashboardReducer
//   );
//   const { loading } = useLoading();

//   const [clientTabData, setClientTabData] = useState(
//     adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
//       ?.dashboard?.tabs || []
//   );

//   const [selectedForecast, setSelectedForecast] = useState({
//     selected: "",
//     activeKey: 0,
//   });
//   let [activeTransactionData, setActiveTransactionData] = useState({
//     transactionId: "",
//     status: "",
//   });

//   const [parentControlledVal, setParentControlledVal] = useState(0);
//   const [savePerformedTab, setSavePerformedTab] = useState(0);
//   const [comparisonSaveRow, setComparisonSaveRow] = useState("");
//   const [deepDiveTabChanged, setDeepDiveTabChanged] = useState(false);
//   const [disableAllowEditOnSave, setDisableAllowEditOnSave] = useState(false);
//   const [isComparisonTabMounted, setIsComparisonTabMounted] = useState(false);
//   const [resetDriversCounter, setResetDriversCounter] = useState(0);

//   const handleActiveTab = () => {
//     let clientConfigTabData =
//       adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
//         ?.dashboard?.tabs;
//     if (!clientConfigTabData?.length) return;
//     setParentControlledVal(clientConfigTabData?.length === 1 ? 0 : 1);
//     return clientConfigTabData;
//   };

//   useEffect(() => {
//     setDisableShowScenario(loading);
//   }, [loading]);

//   //Resets the Default Tab as Active after applying filters
//   useEffect(() => {
//     if (adaDashboardReducer?.isFiltersValid) {
//       let clientConfigTabData =
//         adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
//           ?.dashboard?.tabs;
//       if (clientConfigTabData?.length === 1) {
//         if (parentControlledVal !== 0) {
//           setParentControlledVal(0);
//         }
//       } else {
//         if (parentControlledVal !== 1) {
//           setParentControlledVal(1);
//         }
//       }
//     }
//   }, [adaDashboardReducer?.isFiltersValid]);

//   useEffect(() => {
//     let clientConfigTabData = handleActiveTab();

//     setClientTabData(clientConfigTabData);
//   }, [
//     adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
//       ?.dashboard?.tabs,
//   ]);

//   useEffect(() => {
//     if (clientTabData?.length <= 1) return;
//     if (showScenario) {
//       let updatedClientTabData = cloneDeep(clientTabData);
//       updatedClientTabData[2].defaultHidden = false;
//       setParentControlledVal(2);
//       setClientTabData(updatedClientTabData);
//     } else {
//       let updatedClientTabData = cloneDeep(clientTabData);
//       updatedClientTabData[2].defaultHidden = true;
//       setClientTabData(updatedClientTabData);
//       setParentControlledVal(1);
//     }
//   }, [showScenario]);

//   useEffect(() => {
//     if (clientTabData?.length <= 1) return;
//     if (
//       !adaDashboardReducer?.clientConfig?.attribute_value?.show_features
//         ?.show_two_scenarios
//     )
//       return;
//     if (showScenario2) {
//       let updatedClientTabData = cloneDeep(clientTabData);

//       updatedClientTabData[3].defaultHidden = false;

//       setParentControlledVal(3);
//       setClientTabData(updatedClientTabData);
//     } else {
//       let updatedClientTabData = cloneDeep(clientTabData);
//       updatedClientTabData[3].defaultHidden = true;
//       setClientTabData(updatedClientTabData);
//       setParentControlledVal(1);
//     }
//   }, [showScenario2]);

//   useEffect(() => {
//     // handleActiveTab();
//     setIsComparisonTabMounted(false);
//   }, [activeKey]);

//   useEffect(() => {
//     const fetch = async () => {
//       if (!isEmpty(graphPayload)) {
//         const data = await getStaticForecastXaxis(graphPayload);
//         dispatch(setXaxisStaticDates(data));
//       }
//     };
//     if (!activeKey) {
//       return;
//     } else {
//       fetch();
//     }
//   }, [activeKey]);

//   const handleParentControlledVal = (_, newVal, allowedTabChange) => {
//     setParentControlledVal(newVal);
//   };

//   return (
//     <div className={classes.container}>
//       <TabsComponent
//         parentControlledVal={parentControlledVal}
//         setParentControlledVal={handleParentControlledVal}
//         tabPannelStyle={{ padding: "10px 0 0" }}
//         tabContainerstyle={{ padding: "0px", marginTop: 0 }}
//         tabsData={
//           clientTabData
//             ? clientTabData
//                 .filter(({ defaultHidden }) => !defaultHidden)
//                 .map((tab, index) => {
//                   if (tab.isCompare) {
//                     return {
//                       label: tab.label,
//                       id: tab.id,
//                       TabPanel: activeKey ? (
//                         <ComparePlans
//                           index={index}
//                           activeTab={parentControlledVal}
//                           key={activeKey}
//                           {...props}
//                           {...tab}
//                           ref={{
//                             saveApiCountRef,
//                             isSaveInProgressRef,
//                           }}
//                           updateAllData={updateAllData}
//                           showScenario={showScenario}
//                           showScenario2={showScenario2}
//                           clientTabData={clientTabData}
//                           setSelectedForecast={setSelectedForecast}
//                           setIsComparisonTabMounted={setIsComparisonTabMounted}
//                           setSavePerformedTab={setSavePerformedTab}
//                           setComparisonSaveRow={setComparisonSaveRow}
//                           setResetDriversCounter={setResetDriversCounter}
//                           setActiveTransactionData={setActiveTransactionData}
//                         />
//                       ) : (
//                         <NoDataComparisonContainer />
//                       ),
//                     };
//                   }
//                   return {
//                     label: tab.label,
//                     id: tab.id,
//                     TabPanel: activeKey ? (
//                       <DashboardTab
//                         index={index}
//                         setSavePerformedTab={setSavePerformedTab}
//                         activeTab={parentControlledVal}
//                         setDeepDiveTabChanged={setDeepDiveTabChanged}
//                         {...props}
//                         tab={tab}
//                         ref={{
//                           saveApiCountRef,
//                           isSaveInProgressRef,
//                           disableAllowEditOnSaveRef,
//                           isViewEditHierarchyMountedRef,
//                         }}
//                         tabKey={tab.tabKey}
//                         showDriverForecast={tab.showDriverForecast}
//                         showDriverSignificance={tab.showDriverSignificance}
//                         allowEdit={tab.allowEdit}
//                         disableAllowEditOnSave={isSaveInProgressRef.current}
//                         setActiveTransactionData={setActiveTransactionData}
//                         activeTransactionData={activeTransactionData}
//                         allowL0Edit={tab.allowL0Edit}
//                         showOriginalIAForecast={tab.showOriginalIAForecast}
//                         showIAData={tab.showIAData}
//                         showDriverRank={tab.showDriverRank}
//                         setSelectedForecast={setSelectedForecast}
//                         selectedForecast={selectedForecast}
//                         isComparisonTabMounted={isComparisonTabMounted}
//                         resetDriversCounter={resetDriversCounter}
//                         setActiveKey={setActiveKey}
//                       />
//                     ) : (
//                       <NoDataContainer
//                         showDriverForecast={tab.showDriverForecast}
//                         showDriverRank={tab.showDriverRank}
//                       />
//                     ),
//                   };
//                 })
//             : []
//         }
//         remountOnTabChange={false}
//       />
//     </div>
//   );
// };

// export default DashboardTabs;

// const useStyles = makeStyles((theme) => ({
//   dashboardContainer: {
//     "& .impact-input-wrapper input": {
//       textAlign: "right",
//     },
//     "& .impact_accordion_main_container": {
//       gap: "15px",
//       backgroundColor: "unset",

//       "& > div:first-of-type": {
//         borderTopLeftRadius: "8px",
//         borderTopRightRadius: "8px",
//       },
//       "& > div:last-of-type": {
//         borderBottomLeftRadius: "8px",
//         borderBottomRightRadius: "8px",
//       },
//     },
//   },

//   container: {
//     position: "relative",
//   },
//   titleFilter: {
//     marginBottom: "1rem",
//   },
// }));

// const DashboardTab = forwardRef((props, ref) => {
//   const {
//     tabKey,
//     activeKey,
//     allowEdit = true,
//     allowL0Edit = true,
//     showIAData = false,
//     showDriverForecast = true,
//     showDriverSignificance = false,
//     showDriverRank = false,
//     showOriginalIAForecast,
//     tab,
//     selectedForecast,
//     setSelectedForecast,
//     activeTab,
//     index,
//     isComparisonTabMounted,
//     setSavePerformedTab,
//     setDeepDiveTabChanged,
//     disableAllowEditOnSave,
//     resetDriversCounter,
//     setActiveKey,
//     setActiveTransactionData,
//     activeTransactionData,
//     isViewEditHierarchyMountedRef,
//   } = props;

//   let { saveApiCountRef, isSaveInProgressRef, disableAllowEditOnSaveRef } = ref;

//   let currentHierarchyKey = useRef(null);
//   let forecastMultiplierInstance = useRef({});
//   let editHierarchyInstance = useRef({});
//   let editHierarchyTotalRowInstance = useRef({});
//   let editHierarchyChildInstance = useRef({});
//   let editHierarchyGrandChildInstance = useRef({});
//   let editHierarchyChildTotalRowInstance = useRef({});
//   let editChildRowData = useRef({});
//   let allEditedChildRowData = useRef({});
//   let initialEditRowData = useRef({});
//   let initialTotalRowData = useRef({});
//   let initialEditChildRowData = useRef({});
//   let allEditedGrandChildRowData = useRef({});
//   const classes = useStyles();
//   //allEditedGrandChildRowMapping could be managed with allEditedGrandChildRowData
//   // for readability created mapping ref b/w edited L1 & L2
//   let allEditedGrandChildRowMapping = useRef({});

//   let lastEditedDriversRef = useRef([]);
//   let onSaveRef = useRef(null);

//   // let isTabMounted = useRef({});

//   // to trigger api calls on change in driver forecast
//   // could have been handle with only setDriverForecastVal
//   // However, for readability and to avoid unnecessary condition keeping two states
//   // const [driverForecastVal, setDriverForecastVal] = useState(null);
//   const [lastEditedDrivers, setLastEditedDrivers] = useState([]);
//   const [activeChildHierarchyKey, setActiveChildHierarchyKey] = useState(null);
//   const [
//     counterOnEditHierarchyChange,
//     setCounterOnEditHierarchyChange,
//   ] = useState(0);

//   const [showPrompt, setShowPrompt] = useState({
//     status: false,
//     value: 0,
//   });
//   const [parentControlledVal, setParentControlledVal] = useState(0);
//   const [channels, setChannels] = useState([]);
//   const [selectedChannel, setSelectedChannel] = useState([]);

//   // on tab change b/w multiplier and Edit Hierarchy, using this couter to call the chart api as user may have
//   //edited  multiplier or Edit Hierarchy, so in order to show correct data we are calling chart api again
//   const [refreshChartDataCounter, setRefreshChartDataCounter] = useState(0);

//   const [isTabMounted, setIsTabMounted] = useState(false);
//   const [isForecastSumarryEdited, setIsForecastSumarryEdited] = useState(false);
//   const [
//     isEditHierarchyForecastEdited,
//     setIsEditHierarchyForecastEdited,
//   ] = useState(false);
//   const [refreshAdjustmentWrapper, setRefreshAdjustmentWrapper] = useState(0);
//   const [accordionExpanded, setAccordionExpanded] = useState([
//     "forecast_adjustment",
//     "drivers_forecast",
//     "driver_significance",
//     // "edit_hierarchy_forecast",
//   ]);

//   const handleParentControlledVal = (
//     _,
//     newVal,
//     allowedTabChange,
//     isManualTabChange
//   ) => {
//     if (!allowedTabChange && tab.id !== "IA") {
//       // setShowPrompt({
//       //   status: true,
//       //   value: newVal,
//       // });
//     } else {
//       setParentControlledVal(newVal);

//       // isManualTabChange is used to show the user correct message after save operation success
//       // i.e. if user needs to reload or not
//       if (isManualTabChange) {
//         setDeepDiveTabChanged(true);
//       }
//     }
//   };

//   const adaDashboardReducer = useSelector(
//     (store) => store?.adaReducer?.adaDashboardReducer
//   );

//   const resetDrivers = () => {
//     // setDriverForecastVal(null);
//     // setDriverForecastAllVal(null);
//     // setLastEditedDrivers([]);

//     setSelectedForecast({
//       selected: "",
//       activeKey: 0,
//     });

//     // reset previous hierarchy data on apply filter

//     currentHierarchyKey.current = null;
//     forecastMultiplierInstance.current = {};
//     editHierarchyInstance.current = {};
//     editHierarchyTotalRowInstance.current = {};
//     editHierarchyChildInstance.current = {};
//     editHierarchyGrandChildInstance.current = {};
//     editHierarchyChildTotalRowInstance.current = {};

//     editChildRowData.current = {};
//     allEditedChildRowData.current = {};
//     initialEditRowData.current = {};
//     initialTotalRowData.current = {};
//     initialEditChildRowData.current = {};
//     allEditedGrandChildRowData.current = {};
//     allEditedGrandChildRowMapping.current = {};
//     lastEditedDriversRef.current = [];
//     setActiveChildHierarchyKey(null);
//   };

//   useEffect(() => {
//     if (!activeKey || !resetDriversCounter) return;
//     if (lastEditedDrivers?.length) {
//       resetDrivers();
//       setLastEditedDrivers([]);
//       lastEditedDriversRef.current = [];
//     } else {
//       setActiveKey((prev) => prev + 1);
//     }
//   }, [resetDriversCounter]);

//   useEffect(() => {
//     if (!activeKey || activeKey === 1) return;
//     resetDrivers();
//     setChannels([]);
//     setSelectedChannel([]);
//     if (lastEditedDrivers?.length) {
//       setLastEditedDrivers([]);
//       lastEditedDriversRef.current = [];
//     }
//     // setIsTabMounted(false)
//     // isTabMounted.current = false;
//   }, [activeKey]);

//   useEffect(() => {
//     if (!activeKey) return;

//     if (index === activeTab) {
//       setIsTabMounted(true);

//       // isTabMounted.current = true;
//     }
//   }, [index, activeTab]);

//   //Resetting the states and refs once the filter is valid
//   useEffect(() => {
//     if (adaDashboardReducer?.isFiltersValid) {
//       resetDrivers();
//       if (lastEditedDrivers?.length) {
//         setLastEditedDrivers([]);
//       }

//       //Setting to Default tab - Forecast Multiplier when filters are reapplied
//       if (showPrompt.value !== 0) {
//         handleParentControlledVal(null, 0, true);
//       }
//     }
//   }, [adaDashboardReducer?.isFiltersValid]);

//   useEffect(() => {
//     if (counterOnEditHierarchyChange > 0) {
//       setIsEditHierarchyForecastEdited(true);
//     }
//   }, [counterOnEditHierarchyChange]);

//   if (index !== activeTab && !isTabMounted) {
//     return null;
//   }

//   return (
//     <div className={classes.dashboardContainer}>
//       <Accordion
//         data={[
//           showDriverForecast && {
//             content: (
//               <DriverForecastTable
//                 ref={{
//                   lastEditedDriversRef,
//                   activeChildHierarchyKey,
//                   editHierarchyInstance,
//                   editHierarchyChildTotalRowInstance,
//                   editHierarchyChildInstance,
//                   editHierarchyTotalRowInstance,
//                   editHierarchyGrandChildInstance,
//                   allEditedChildRowData,
//                   allEditedGrandChildRowData,
//                   allEditedGrandChildRowMapping,
//                 }}
//                 key={activeKey}
//                 activeKey={activeKey}
//                 lastEditedDrivers={lastEditedDrivers}
//                 setLastEditedDrivers={setLastEditedDrivers}
//                 tabKey={tabKey}
//                 showIAData={showIAData}
//                 {...tab}
//                 allowEdit={allowEdit}
//                 disableAllowEditOnSave={disableAllowEditOnSave}
//                 showDriverRank={showDriverRank}
//               />
//             ),
//             header: tab.accordionTitle ? (
//               tab.accordionTitle
//             ) : (
//               <LabelWithTooltip
//                 label="Drivers of Forecast"
//                 title={
//                   <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.5 }}>
//                     This section contains forecast drivers information such as
//                     Discount%, Effective Discount%, Actual Discount% and Last
//                     Year Discount%. Changing any values in of discount % in week
//                     will update original forecast values to Driver Adjusted
//                     Forecast and eventually it updates Adjusted User Forecast
//                     for respective week.
//                   </Typography>
//                 }
//               />
//             ),
//             id: "drivers_forecast",
//             value: "drivers_forecast",
//           },

//           showDriverSignificance && {
//             content: <DriverSignificance activeKey={activeKey} />,
//             header: "Drivers Significance",
//             id: "driver_significance",
//             value: "driver_significance",
//           },
//           {
//             content: (
//               <ForecastAdjustmentWrapper
//                 key={refreshAdjustmentWrapper}
//                 activeKey={activeKey}
//                 resetDrivers={resetDrivers}
//                 lastEditedDrivers={lastEditedDrivers}
//                 tabKey={tabKey}
//                 allowEdit={allowEdit}
//                 allowL0Edit={allowL0Edit}
//                 showIAData={showIAData}
//                 selectedForecast={selectedForecast}
//                 showOriginalIAForecast={showOriginalIAForecast}
//                 showPrompt={showPrompt}
//                 handleParentControlledVal={handleParentControlledVal}
//                 setShowPrompt={setShowPrompt}
//                 parentControlledVal={parentControlledVal}
//                 activeChildHierarchyKey={activeChildHierarchyKey}
//                 setActiveChildHierarchyKey={setActiveChildHierarchyKey}
//                 counterOnEditHierarchyChange={counterOnEditHierarchyChange}
//                 setCounterOnEditHierarchyChange={
//                   setCounterOnEditHierarchyChange
//                 }
//                 setRefreshChartDataCounter={setRefreshChartDataCounter}
//                 refreshChartDataCounter={refreshChartDataCounter}
//                 index={index}
//                 setSavePerformedTab={setSavePerformedTab}
//                 activeTab={parentControlledVal}
//                 disableAllowEditOnSave={disableAllowEditOnSave}
//                 setSelectedForecast={setSelectedForecast}
//                 setActiveTransactionData={setActiveTransactionData}
//                 activeTransactionData={activeTransactionData}
//                 setIsForecastSumarryEdited={setIsForecastSumarryEdited}
//                 {...tab}
//                 ref={{
//                   editHierarchyInstance,
//                   editHierarchyTotalRowInstance,
//                   forecastMultiplierInstance,
//                   editHierarchyChildInstance,
//                   editHierarchyGrandChildInstance,
//                   editHierarchyChildTotalRowInstance,
//                   initialEditChildRowData,
//                   allEditedGrandChildRowData,
//                   lastEditedDriversRef,
//                   initialEditRowData,
//                   initialTotalRowData,
//                   editChildRowData,
//                   currentHierarchyKey,
//                   allEditedChildRowData,
//                   allEditedGrandChildRowMapping,
//                   saveApiCountRef,
//                   isSaveInProgressRef,
//                   disableAllowEditOnSaveRef,
//                   onSaveRef,
//                 }}
//               />
//             ),
//             header: (
//               <LabelWithTooltip
//                 label="Forecast Adjustment"
//                 title={
//                   <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.5 }}>
//                     In this section, you will see aggregated IA, Adjusted, and
//                     User forecasts for selected products. To change IA suggested
//                     or driver-adjusted forecast values, either use a multiplier
//                     or manually adjust the forecast for the selected products.
//                   </Typography>
//                 }
//               />
//             ),
//             id: "forecast_adjustment",
//             value: "forecast_adjustment",
//           },

//           {
//             content:
//               accordionExpanded?.includes("edit_hierarchy_forecast") ||
//               isEditHierarchyForecastEdited ||
//               tab.id === "IA" ? (
//                 <>
//                   <EditForecastWrapper
//                     isForecastSumarryEdited={isForecastSumarryEdited}
//                     activeKey={activeKey}
//                     resetDrivers={resetDrivers}
//                     lastEditedDrivers={lastEditedDrivers}
//                     tabKey={tabKey}
//                     allowEdit={allowEdit}
//                     allowL0Edit={allowL0Edit}
//                     showIAData={showIAData}
//                     selectedForecast={selectedForecast}
//                     showOriginalIAForecast={showOriginalIAForecast}
//                     showPrompt={showPrompt}
//                     handleParentControlledVal={handleParentControlledVal}
//                     setShowPrompt={setShowPrompt}
//                     parentControlledVal={parentControlledVal}
//                     activeChildHierarchyKey={activeChildHierarchyKey}
//                     setActiveChildHierarchyKey={setActiveChildHierarchyKey}
//                     counterOnEditHierarchyChange={counterOnEditHierarchyChange}
//                     setCounterOnEditHierarchyChange={
//                       setCounterOnEditHierarchyChange
//                     }
//                     setRefreshChartDataCounter={setRefreshChartDataCounter}
//                     index={index}
//                     setSavePerformedTab={setSavePerformedTab}
//                     activeTab={parentControlledVal}
//                     disableAllowEditOnSave={disableAllowEditOnSave}
//                     setSelectedForecast={setSelectedForecast}
//                     setActiveTransactionData={setActiveTransactionData}
//                     activeTransactionData={activeTransactionData}
//                     {...tab}
//                     ref={{
//                       editHierarchyInstance,
//                       editHierarchyTotalRowInstance,
//                       forecastMultiplierInstance,
//                       editHierarchyChildInstance,
//                       editHierarchyGrandChildInstance,
//                       editHierarchyChildTotalRowInstance,
//                       initialEditChildRowData,
//                       allEditedGrandChildRowData,
//                       lastEditedDriversRef,
//                       initialEditRowData,
//                       initialTotalRowData,
//                       editChildRowData,
//                       currentHierarchyKey,
//                       allEditedChildRowData,
//                       allEditedGrandChildRowMapping,
//                       saveApiCountRef,
//                       isSaveInProgressRef,
//                       disableAllowEditOnSaveRef,
//                       isViewEditHierarchyMountedRef,
//                     }}
//                   />
//                 </>
//               ) : null,
//             header: (
//               <LabelWithTooltip
//                 label="View/edit Hierarchy Forecast"
//                 title={
//                   <Box>
//                     <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.5 }}>
//                       In this section, you can:
//                     </Typography>

//                     <Box
//                       sx={{
//                         display: "flex",
//                         alignItems: "flex-start",
//                         mb: 0.5,
//                       }}
//                     >
//                       <Box
//                         component="div"
//                         sx={{
//                           width: 6,
//                           height: 6,
//                           borderRadius: "50%",
//                           backgroundColor: "white", // or your theme color
//                           mt: "7px",
//                           mr: 1,
//                           flexShrink: 0,
//                         }}
//                       />
//                       <Typography sx={{ fontSize: 13 }}>
//                         Compare and finalize either the IA forecast or the MFP
//                         forecast. The IA forecast is finalized by default.
//                       </Typography>
//                     </Box>

//                     <Box sx={{ display: "flex", alignItems: "flex-start" }}>
//                       <Box
//                         component="span"
//                         sx={{
//                           width: 6,
//                           height: 6,
//                           borderRadius: "50%",
//                           backgroundColor: "white", // or your theme color
//                           mt: "7px",
//                           mr: 1,
//                           flexShrink: 0,
//                         }}
//                       />
//                       <Typography sx={{ fontSize: 13 }}>
//                         View and edit forecast numbers for any product, store,
//                         or size.
//                       </Typography>
//                     </Box>
//                   </Box>
//                 }
//               />
//             ),
//             id: "edit_hierarchy_forecast",
//             value: "edit_hierarchy_forecast",
//           },
//         ].filter(Boolean)}
//         draggable
//         isMultiExpanded
//         onChange={(value) => {
//           if (tab.id !== "IA") {
//             if (value === "edit_hierarchy_forecast") {
//               if (isForecastSumarryEdited) {
//                 setShowPrompt({
//                   status: true,
//                   value: value,
//                 });
//                 return;
//               }
//             }

//             if (value === "forecast_adjustment") {
//               if (isEditHierarchyForecastEdited) {
//                 setShowPrompt({
//                   status: true,
//                   value: value,
//                 });
//                 return;
//               }
//             }
//           }
//           if (accordionExpanded.includes(value)) {
//             setAccordionExpanded(
//               accordionExpanded.filter((item) => item !== value)
//             );
//           } else {
//             let newAccordionExpanded = [...accordionExpanded, value];
//             if (value === "edit_hierarchy_forecast") {
//               newAccordionExpanded = newAccordionExpanded.filter(
//                 (item) => item !== "forecast_adjustment"
//               );
//             }
//             if (value === "forecast_adjustment") {
//               newAccordionExpanded = newAccordionExpanded.filter(
//                 (item) => item !== "edit_hierarchy_forecast"
//               );
//             }
//             setAccordionExpanded(newAccordionExpanded);
//           }
//         }}
//         expanded={accordionExpanded}
//       />

//       {/* {showDriverSignificance && <DriverSignificance activeKey={activeKey} />} */}
//       <Prompt
//         isOpen={showPrompt.status}
//         title="You have unsaved changes."
//         children={<>Do you want to discard them?</>}
//         primaryButtonLabel="Cancel"
//         secondaryButtonLabel="Discard Changes"
//         onPrimaryButtonClick={() => {
//           setShowPrompt({
//             status: false,
//             value: showPrompt.value,
//           });
//         }}
//         onSecondaryButtonClick={() => {
//           if (showPrompt.value === "edit_hierarchy_forecast") {
//             setAccordionExpanded([
//               ...accordionExpanded.filter(
//                 (item) => item !== "forecast_adjustment"
//               ),
//               showPrompt.value,
//             ]);
//             setIsForecastSumarryEdited(false);
//             setRefreshAdjustmentWrapper((prev) => prev + 1);
//           }
//           if (showPrompt.value === "forecast_adjustment") {
//             setAccordionExpanded([
//               ...accordionExpanded.filter(
//                 (item) => item !== "edit_hierarchy_forecast"
//               ),
//               showPrompt.value,
//             ]);
//             setIsEditHierarchyForecastEdited(false);
//           }
//           setShowPrompt({
//             status: false,
//             value: showPrompt.value,
//           });
//         }}
//         variant="warning"
//       />
//     </div>
//   );
// });

// const NoDataContainer = ({ showDriverForecast }) => {
//   return (
//     <>
//       <NoDataWrapper label="Forecast Adjustment" />
//       {showDriverForecast && <NoDataWrapper label="Drivers of Forecast" />}

//       <NoDataWrapper label="View/Edit Hierarchy Forecast" />
//     </>
//   );
// };

// const NoDataComparisonContainer = () => {
//   return (
//     <>
//       <NoDataWrapper label="Scenario Comparison Forecast" />
//       <NoDataWrapper label="Scenario Comparison" />
//     </>
//   );
// };
