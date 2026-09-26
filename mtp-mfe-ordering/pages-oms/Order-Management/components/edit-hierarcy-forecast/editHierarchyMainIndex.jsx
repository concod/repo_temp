import React from "react";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
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
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import EditHierarcyForecast from "./index";
import { isEmpty } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { Prompt } from "impact-ui-v3";
import { setIsCellEdited } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { getMatrixSummaryTableName } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { setMatrixSummaryTableName } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import LoadingOverlay from "core/Utils/Loader/loader";
import EmptyStateLayout from "../EmptyStateLayout";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

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

  return isEmpty(matrixSummaryReducer?.getTableName) ? (
    <LoadingOverlay loader={true} spinner applyDefaultCenterStyle={true} />
  ) : (
    <div className={classes.paddingLayout}>
      {isRedirectedFromDifferentPage == null && (
        <>
          <div style={{ marginBottom: "12px" }}>
            {!localStorage.getItem("isRedirectedFromDashboardToOms") && (
              <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>
            )}
          </div>
        </>
      )}
      {props?.isFiltersValid ||
      localStorage.getItem("isRedirectedFromDashboardToOms") ? (
        <div style={{ paddingTop: "12px" }}>
          <EditHierarcyForecast
            setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
            counterOnEditHierarchyChange={counterOnEditHierarchyChange}
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
    redirectDetails: store.omsReducer.orderManagementService.redirectDetails,
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditHierarchyMainIndex);
