import React from "react";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";

import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
} from "modules/oms/constants-oms/routeConstants";
import {
  setOrderManagementFilterElements,
  setOrderManagementFilterLoader,
  setRedirectFromDeepDive,
  setOrderManagementKpiSummaryLoader,
  setRedirectionDetails,
  resetOrderManagementState,
  setSelectedFilters,
  setSelectedDcs,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  ERROR_MESSAGE,
  OMS_OM_REDIRECT_DASHBOARD_DCS,
} from "modules/oms/constants-oms/stringConstants";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import EditHierarcyForecast from "./index";
import { isEmpty } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { Prompt, Alert } from "impact-ui-v3";
import { setIsCellEdited } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { getMatrixSummaryTableName } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { setMatrixSummaryTableName } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import LoadingOverlay from "core/Utils/Loader/loader";
import EmptyStateLayout from "../EmptyStateLayout";
import DcFilter from "../../../common/DcFilter";
import { setFilterConfiguration } from "core/actions/filterAction";

const EditHierarchyMainIndex = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const history = useHistory();

  const globalClasses = globalStyles();
  const classes = useStyles();

  const [
    isRedirectedFromDashboardPage,
    setIsRedirectedFromDashboardPage,
  ] = useState(
    location?.state?.isRedirectedFromDashboardPage
      ? location?.state?.isRedirectedFromDashboardPage
      : false
  );
  const [tableNamel0, setTableNameL0] = useState({});

  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage = type && true;

  //Ada visual module things
  const [activeKey, setActiveKey] = useState(0);

  const [loader, setLoader] = useState(false);

  const [lastEditedDrivers, setLastEditedDrivers] = useState([]);
  const [activeChildHierarchyKey, setActiveChildHierarchyKey] = useState(null);
  const [
    activeChildHierarchyDescription,
    setActiveChildHierarchyDescription,
  ] = useState(null);
  let lastEditedDriversRef = useRef([]);
  let editHierarchyInstance = useRef({});
  let editHierarchyTotalRowInstance = useRef({});
  let editHierarchyChildInstance = useRef({});
  let editHierarchyGrandChildInstance = useRef({});
  let editHierarchyChildTotalRowInstance = useRef({});
  let allEditedChildRowData = useRef({});
  let allEditedGrandChildRowData = useRef({});
  let allEditedGrandChildRowMapping = useRef({});
  let initialEditChildRowData = useRef({});
  let initialEditRowData = useRef({});
  let initialTotalRowData = useRef({});
  let editChildRowData = useRef({});
  let forecastMultiplierInstance = useRef({});
  let SkuName = useRef({});
  let isCompareChanges = useRef(false);
  let currentHierarchyKey = useRef(null);
  let l0TableDataPayloadRef = useRef(null);
  const [showScreen, setShowScreen] = useState(false);
  const [
    counterOnEditHierarchyChange,
    setCounterOnEditHierarchyChange,
  ] = useState(0);
  const [openNavigationPopUp, setOpenNavigationPopUp] = useState(false);
  const [isRedirectedFromDashboard, setIsRedirectedFromDashboard] = useState(
    false
  );

  const dispatch = useDispatch();

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );

  useEffect(() => {
    //Fetch Table Name for Matrix Summary
    const fetchTableNameForMatrixSummary = async () => {
      try {
        const getTableName = await getMatrixSummaryTableName();
        if (getTableName.data.status) {
          dispatch(setMatrixSummaryTableName(getTableName?.data?.data[0]));
        }
      } catch (error) {
        console.log("error", error);
      }
    };
    fetchTableNameForMatrixSummary();
  }, []);

  // Close child and grandchild tables when DC filter changes
  useEffect(() => {
    // Close all child and grandchild tables
    if (activeChildHierarchyKey) {
      setActiveChildHierarchyKey(null);
      setActiveChildHierarchyDescription(null);
    }
  }, [props.selectedFilters]);

  const onBackButtonClickHandler = () => {
    if (matrixSummaryReducer?.isCellEdited) {
      setOpenNavigationPopUp(true);
    } else {
      let filterDependency =
        props?.filterDashboardConfiguration?.dependencyData?.length > 0
          ? props?.filterDashboardConfiguration?.dependencyData
          : props?.orderManagementFilterDependency;
      setOrderManagementKpiSummaryLoader(true);
      props.setRedirectFromDeepDive(true);

      navigate(ORDER_MANAGEMENT, {
        state: {
          isRedirectedFromDeepDive: true,
          disabledFilter: isRedirectedFromDashboardPage,
          filterDependency: filterDependency,
        },
      });
      sessionStorage.setItem("isRedirectedFromMatrixSummary", "true");
    }
  };

  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: 1,
      label: "Order Management",
      action: () => {
        navigateToHighLevelSummary();
      },
    },
    {
      id: 2,
      label: "Matrix Summary",
      action: () => {
        navigate(ORDER_MANAGEMENT_MATRIX_SUMMARY);
      },
    },
  ];

  const navigateToHighLevelSummary = () => {
    if (matrixSummaryReducer?.isCellEdited) {
      setOpenNavigationPopUp(true);
    } else {
      props?.setRedirectionDetails({
        target: "high_level_summary",
        source: "matrix_summary",
        dateFilters: props?.redirectDetails?.dateFilters,
        selectedRoqDateTab: props?.highLevelSummaryState?.selectedRoqDateTab,
      });
      let filterDependency =
        props?.filterDashboardConfiguration?.dependencyData?.length > 0
          ? props?.filterDashboardConfiguration?.dependencyData
          : props?.orderManagementFilterDependency;

      navigate(ORDER_MANAGEMENT, {
        state: {
          isRedirectedFromDeepDive: true,
          disabledFilter: isRedirectedFromDashboardPage,
          filterDependency: filterDependency,
        },
      });
      props.setRedirectFromDeepDive(true);
      setOrderManagementKpiSummaryLoader(true);
      sessionStorage.setItem("isRedirectedFromMatrixSummary", "true");
    }
  };

  useEffect(() => {
    //Handling the case where user refreshes the page
    const isRefreshed = !sessionStorage.getItem("matrixSummaryLoaded");
    if (
      isRefreshed &&
      location.pathname !== ORDER_MANAGEMENT &&
      location.pathname !== ORDER_MANAGEMENT_PRODUCT_DETAILS
    ) {
      props.resetOrderManagementState();
      props.setFilterConfiguration({
        orderManagementFilterConfiguration: undefined,
      });
    }
    sessionStorage.setItem("matrixSummaryLoaded", "true");

    //Handling the case where user navigates to different screen (out of OMS Module)
    const resetOrderManagementReduxState = history.listen((location) => {
      if (
        location.pathname !== ORDER_MANAGEMENT &&
        location.pathname !== ORDER_MANAGEMENT_MATRIX_SUMMARY &&
        location.pathname !== ORDER_MANAGEMENT_PRODUCT_DETAILS
      ) {
        props.resetOrderManagementState();
        props.setFilterConfiguration({
          orderManagementFilterConfiguration: undefined,
        });
      }
    });
    return () => resetOrderManagementReduxState();
  }, []);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const NavigationFromPopUp = () => {
    try {
      let filterDependency =
        props?.filterDashboardConfiguration?.dependencyData?.length > 0
          ? props?.filterDashboardConfiguration?.dependencyData
          : props?.orderManagementFilterDependency;
      setOrderManagementKpiSummaryLoader(true);
      props.setRedirectFromDeepDive(true);
      dispatch(setIsCellEdited(false));

      navigate(ORDER_MANAGEMENT, {
        state: {
          isRedirectedFromDeepDive: true,
          disabledFilter: isRedirectedFromDashboardPage,
          filterDependency: filterDependency,
        },
      });
      sessionStorage.setItem("isRedirectedFromMatrixSummary", "true");
    } catch (err) {
      console.log("Error while navigating", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  useEffect(() => {
    if (localStorage.getItem("isRedirectedFromDashboardToOms")) {
      setIsRedirectedFromDashboard(true);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("isRedirectedFromDashboardToOms")) return;

    let parsedDcs = [];
    const raw = localStorage.getItem(OMS_OM_REDIRECT_DASHBOARD_DCS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedDcs = parsed;
          props.setSelectedDcs(parsed);
        }
      } catch (e) {
        console.error("Matrix summary: failed to hydrate redirect DCs", e);
      }
    }

    // Always hydrate Redux selectedFilters from the dashboard filter
    // dependency so downstream components (e.g. DcFilter) render based on the
    // applied non-DC filters even when no DCs were selected upstream.
    let dep = [];
    try {
      dep =
        JSON.parse(localStorage.getItem("selectedFiltersDependency") || "[]") ||
        [];
    } catch (e) {
      console.error(
        "Matrix summary: failed to parse selectedFiltersDependency",
        e
      );
    }
    if (parsedDcs.length > 0) {
      props.setSelectedFilters(mergeOmsDcIntoFilters(dep, parsedDcs));
    } else if (Array.isArray(dep) && dep.length > 0) {
      props.setSelectedFilters(dep);
    }
  }, []);

  return isEmpty(matrixSummaryReducer?.getTableName) ? (
    <LoadingOverlay loader={true} spinner applyDefaultCenterStyle={true} />
  ) : (
    <div className={classes.paddingLayout}>
      <div
        style={{
          marginBottom: "12px",
          display: "grid",
          gridAutoFlow: "column",
        }}
      >
        {isRedirectedFromDifferentPage == null &&
          !localStorage.getItem("isRedirectedFromDashboardToOms") && (
            <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>
          )}
        {props.selectedDcs?.length > 0 &&
          props.selectedDcs?.length < props.dcOptions?.length && (
            <Alert
              title="Select Appropriate NO.Of DCs To Proceed With Order QTY And MOQ Calculation."
              severity="info"
              subtleBackground
              style={{ zIndex: 1 }}
            />
          )}
        <DcFilter />
      </div>

      {props?.isFiltersValid ||
      localStorage.getItem("isRedirectedFromDashboardToOms") ? (
        <div style={{ paddingTop: "12px" }}>
          <EditHierarcyForecast
            setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
            counterOnEditHierarchyChange={counterOnEditHierarchyChange}
            selectedFilters={props.selectedFilters}
            setActiveChildHierarchyKey={setActiveChildHierarchyKey}
            activeChildHierarchyKey={activeChildHierarchyKey}
            activeChildHierarchyDescription={activeChildHierarchyDescription}
            setActiveChildHierarchyDescription={
              setActiveChildHierarchyDescription
            }
            key={activeKey}
            lastEditedDrivers={lastEditedDrivers}
            ref={{
              editHierarchyInstance,
              editHierarchyTotalRowInstance,
              forecastMultiplierInstance,
              editHierarchyChildInstance,
              editHierarchyGrandChildInstance,
              editHierarchyChildTotalRowInstance,
              initialEditChildRowData,
              allEditedGrandChildRowData,
              lastEditedDriversRef,
              initialEditRowData,
              initialTotalRowData,
              editChildRowData,
              currentHierarchyKey,
              allEditedChildRowData,
              allEditedGrandChildRowMapping,
              SkuName,
              isCompareChanges,
              l0TableDataPayloadRef,
            }}
            showIAData={false}
            id={"adjusted"}
            isRedirectedFromDashboard={isRedirectedFromDashboard}
            l0TableName={tableNamel0}
            navigateToHighLevelSummary={navigateToHighLevelSummary}
          />
        </div>
      ) : (
        <div className={globalClasses.centerAlign}>
          <EmptyStateLayout onPrimaryButtonClick={navigateToHighLevelSummary} />
        </div>
      )}

      <Prompt
        isOpen={openNavigationPopUp}
        variant="warning"
        title=" Are you sure you want to change screens?"
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
        onPrimaryButtonClick={() => {
          NavigationFromPopUp();
          setOpenNavigationPopUp(false);
        }}
        onSecondaryButtonClick={() => {
          setOpenNavigationPopUp(false);
        }}
        handleClose={() => {
          setOpenNavigationPopUp(false);
        }}
      >
        Any unsaved changes will be lost.
      </Prompt>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    redirectFromDeepDive:
      store.omsReducer.orderManagementService.redirectFromDeepDive,
    orderManagementFilterLoader:
      store.omsReducer.orderManagementService.orderManagementFilterLoader,
    orderManagementFilterElements:
      store.omsReducer.orderManagementService.orderManagementFilterElements,
    orderManagementFilterDependency:
      store.omsReducer.orderManagementService.orderManagementFilterDependency,
    backButtonClicked:
      store.omsReducer.orderManagementService.backButtonClicked,
    formFilters: store.omsReducer.orderManagementService.formFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    isFiltersValid: store.omsReducer.orderManagementService.isFiltersValid,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    redirectDetails: store.omsReducer.orderManagementService.redirectDetails,
    selectedDcs: store.omsReducer.orderManagementService.selectedDcs,
    dcOptions: store.omsReducer.orderManagementService.dcOptions,
  };
};

const mapDispatchToProps = (dispatch) => ({
  resetOrderManagementState: () => dispatch(resetOrderManagementState()),
  setOrderManagementFilterLoader: (payload) =>
    dispatch(setOrderManagementFilterLoader(payload)),
  setOrderManagementFilterElements: (payload) =>
    dispatch(setOrderManagementFilterElements(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  setRedirectionDetails: (payload) => dispatch(setRedirectionDetails(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderManagementKpiSummaryLoader: (payload) =>
    dispatch(setOrderManagementKpiSummaryLoader(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setSelectedDcs: (payload) => dispatch(setSelectedDcs(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditHierarchyMainIndex);
