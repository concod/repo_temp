import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import moment from "moment";
import { Grid } from "@mui/material";
import { isEmpty } from "lodash";
import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
} from "modules/oms/constants-oms/routeConstants";
import {
  setOrderManagementFilterElements,
  setRedirectFromDeepDive,
  getOmsCoreFiscalCalendar,
  setOrderManagementKpiSummaryLoader,
  getOmsDeepDiveFilters,
  setOrderManagementDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
  resetOrderManagementState,
  setSelectedRowsFromMatrixSummary,
  setOrderManagementDeepDiveFiltersPayload,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { Tabs, Tab, Button } from "impact-ui-v3";
import StyleOrderSummaryTable from "./Style-Order-Summary/styleOrderSummaryTable";
import OrderDeepDive from "../../Order-Deep-Dive";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import ProductDetailsFilters from "./ProductDetailsFilters";
import { getTabProps } from "./Style-Order-Summary/utils";
import Loader from "core/Utils/Loader/loader";
import EmptyStateLayout from "../EmptyStateLayout";
import { setRedirectionDetails } from "modules/oms/services-oms/Order-Management/order-management-service";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import { adjustMiddleContentHeight } from "../../../../utils-oms/oms-utility";

const productDetailsScreen = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const history = useHistory();

  const globalClasses = globalStyles();
  const classes = useStyles();
  // Fetching the redirection details from local storage
  const redirectionDetails = JSON.parse(
    localStorage.getItem("omsRedirectionDetails")
  );

  const [tabsList, setTabsList] = useState([]);
  const [tabValue, setTabValue] = useState(
    redirectionDetails?.tabSelected || "style_order_summary"
  );

  const [
    isRedirectedFromDashboardPage,
    setIsRedirectedFromDashboardPage,
  ] = useState(
    location?.state?.isRedirectedFromDashboardPage
      ? location?.state?.isRedirectedFromDashboardPage
      : false
  );
  const [reloadComponents, setReloadComponents] = useState(0);
  const [showLoader, setShowLoader] = useState(true);
  const [storedSkuData, setStoredSkuData] = useState(
    JSON.parse(localStorage.getItem("selectedSku"))
  );
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage = type && true;
  const middleContentRef = useRef(null);

  const PRODUCT_DETAILS_TABS = [
    {
      label:
        props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
          ?.header_tab_title || "Style Order Summary",
      value: "style_order_summary",
    },
    {
      label: "Deep Dive",
      value: "deep_dive",
    },
  ];

  useEffect(() => {
    const newTabsList = [];
    PRODUCT_DETAILS_TABS.forEach((tabOption) => {
      newTabsList.push({ ...getTabProps(tabOption) });
    });
    setTabsList(newTabsList);
  }, [props?.orderingScreensConfig]);

  const renderTabComponents = () => {
    const ProductDetailsMapper = {
      style_order_summary: (
        <StyleOrderSummaryTable
          fiscalCalendarDetails={fiscalCalendarDetails}
          reloadFromParent={reloadComponents}
          ropParentDateRange={props.ropDate}
          recommRecieptParentDateRange={props.recommRecieptDate}
          handleChangeTabValue={handleChangeTabValue}
        />
      ),
      deep_dive: (
        <OrderDeepDive
          reloadFromParent={reloadComponents}
          fiscalCalendarDetails={fiscalCalendarDetails}
        />
      ),
    };

    let tablePanel = tabsList.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div>{ProductDetailsMapper[tabValue]}</div>;
    });
    return tablePanel;
  };

  const onBackButtonClickHandler = () => {
    let filterDependency =
      props?.filterDashboardConfiguration?.dependencyData?.length > 0
        ? props?.filterDashboardConfiguration?.dependencyData
        : props?.orderManagementFilterDependency;
    setOrderManagementKpiSummaryLoader(true);
    props.setRedirectFromDeepDive(true);

    navigate(ORDER_MANAGEMENT_MATRIX_SUMMARY, {
      state: {
        isRedirectedFromDeepDive: true,
        disabledFilter: isRedirectedFromDashboardPage,
        filterDependency: filterDependency,
      },
    });
  };

  const navigateToHighLevelSummary = () => {
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
    // {
    //   id: 3,
    //   label: "Product Details",
    //   action: () => {
    //     navigate(ORDER_MANAGEMENT_PRODUCT_DETAILS);
    //   },
    // },
    {
      id: 4,
      label: "Style Order Summary",
      action: () => {
        navigate(ORDER_MANAGEMENT);
      },
    },
  ];

  useEffect(() => {
    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
      try {
        setShowLoader(true);
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        setShowLoader(false);
      } catch (error) {
        setShowLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };
    fetchFilters();
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

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
    setReloadComponents(0);
  };

  useEffect(() => {
    //Handling the case where user refreshes the page
    const isRefreshed = !sessionStorage.getItem("productDetailsLoaded");
    if (
      isRefreshed &&
      location.pathname !== ORDER_MANAGEMENT_MATRIX_SUMMARY &&
      location.pathname !== ORDER_MANAGEMENT &&
      location.pathname !== ORDER_MANAGEMENT_CREATE_SCENARIO
    ) {
      props.resetOrderManagementState();
    }
    sessionStorage.setItem("productDetailsLoaded", "true");

    //Handling the case where user navigates to different screen (out of OMS Module)
    const resetOrderManagementReduxState = history.listen((location) => {
      if (
        location.pathname !== ORDER_MANAGEMENT &&
        location.pathname !== ORDER_MANAGEMENT_MATRIX_SUMMARY &&
        location.pathname !== ORDER_MANAGEMENT_PRODUCT_DETAILS &&
        location.pathname !== ORDER_MANAGEMENT_CREATE_SCENARIO
      ) {
        props.resetOrderManagementState();
      }
    });
    return () => resetOrderManagementReduxState();
  }, []);

  useEffect(() => {
    const fetchDeepDiveFilters = async () => {
      try {
        let deepDiveFilters = await props.getOmsDeepDiveFilters();

        let productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        props?.setOrderManagementProductDetailsFilters(productDetailsFilters);

        if (deepDiveFilters?.data?.data?.length > 1) {
          props?.setOrderManagementDeepDiveFilters(
            deepDiveFilters?.data?.data?.slice(1)
          );
        }

        //Handling Redirection cases
        if (redirectionDetails?.isRedirection) {
          const filterSelectedIdsFromMatrix = productDetailsFilters?.[0] || {};
          const selectedIdsFromMatrix =
            redirectionDetails?.selectedRowIds || [];
          const selectedFilters = redirectionDetails?.selectedFilters || [];
          const selectedRowsFilter = {
            filter_type: filterSelectedIdsFromMatrix?.type,
            attribute_name: filterSelectedIdsFromMatrix?.column_name,
            operator: "in",
            dimension: filterSelectedIdsFromMatrix?.dimension,
            values: [...selectedIdsFromMatrix],
          };
          props?.setSelectedRowsFromMatrixSummary(selectedRowsFilter);
          props?.setOrderManagementDeepDiveFiltersPayload({
            filters: selectedFilters,
          });
        }
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(err);
      }
    };

    if (
      props?.orderManagementProductDetailsFilters?.length === 0 ||
      props?.orderManagementDeepDiveFilters?.length === 0 ||
      redirectionDetails?.isRedirection
    ) {
      fetchDeepDiveFilters();
    }
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props?.orderManagementDeepDiveFiltersData) &&
      middleContentRef.current
    ) {
      adjustMiddleContentHeight(middleContentRef);
    }
  }, [props.orderManagementDeepDiveFiltersData]);

  const onProductDetailsFilterApply = () => {
    setReloadComponents(reloadComponents + 1);
  };

  return (
    <div className={classes.paddingLayout}>
      {isRedirectedFromDifferentPage == null && (
        <>
          {!redirectionDetails?.isRedirection && (
            <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>
          )}
          {/* Hiding the back button */}
          {/* {!redirectionDetails?.isRedirectedFromISModules && (
            <div className={globalClasses.paddingAround}>
              <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid container xs={4} alignItems="center">
                  <Typography
                    variant="h3"
                    component="h3"
                    className={`${globalClasses.pageHeader}`}
                  >
                    {routeOptions[2].label}
                  </Typography>

                  <Button
                    variant="text"
                    color="primary"
                    onClick={onBackButtonClickHandler}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <ArrowBackIosIcon
                      fontSize="inherit"
                      sx={{ marginRight: "-4px" }}
                    />
                    <Typography variant="p" color="buttonwordcolor.main">
                      {routeOptions[1].label}
                    </Typography>
                  </Button>
                </Grid>
              </Grid>
            </div>
          )} */}

          {props?.isFiltersValid || redirectionDetails?.isRedirection ? (
            <>
              <div
                className={globalClasses.flexRow}
                style={{
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                {!isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "800",
                    }}
                  >
                    Style Order Summary
                  </span>
                )}
                <Grid
                  item
                  xs={12}
                  sx={{ pt: "1rem" }}
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <ProductDetailsFilters
                    labelOrientation={"left"}
                    isDefaultSelectionNeeded={true}
                  />

                  {!isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                    <div style={{ paddingLeft: "1rem" }}>
                      <Button
                        variant="tertiary"
                        onClick={onProductDetailsFilterApply}
                        id="applyBtn"
                        color="primary"
                        disabled={props.isDeepdiveFilterLoading}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </Grid>
              </div>
              {!isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                <Loader
                  loader={
                    isEmpty(props?.orderManagementDeepDiveFiltersData)
                      ? true
                      : false
                  }
                  minHeight={"260px"}
                >
                  <div
                    ref={middleContentRef}
                    className={classNames(globalClasses.marginTop)}
                  >
                    <OrderDeepDive
                      reloadFromParent={reloadComponents}
                      fiscalCalendarDetails={fiscalCalendarDetails}
                    />
                    <StyleOrderSummaryTable
                      fiscalCalendarDetails={fiscalCalendarDetails}
                      reloadFromParent={reloadComponents}
                      ropParentDateRange={props.ropDate}
                      recommRecieptParentDateRange={props.recommRecieptDate}
                      handleChangeTabValue={handleChangeTabValue}
                    />
                  </div>
                </Loader>
              )}

              {isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                <Loader loader={true} minHeight={"260px"}></Loader>
              )}
            </>
          ) : (
            <div
              className={globalClasses.centerAlign}
              style={{ margin: "2rem" }}
            >
              <EmptyStateLayout
                onPrimaryButtonClick={navigateToHighLevelSummary}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    redirectFromDeepDive:
      store.omsReducer.orderManagementService.redirectFromDeepDive,
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
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderManagementDeepDiveFiltersData:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersData,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    isFiltersValid: store.omsReducer.orderManagementService.isFiltersValid,
    isDeepdiveFilterLoading:
      store.omsReducer.orderManagementService.isDeepdiveFilterLoading,
    redirectDetails: store.omsReducer.orderManagementService.redirectDetails,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderManagementFilterElements: (payload) =>
    dispatch(setOrderManagementFilterElements(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderManagementKpiSummaryLoader: (payload) =>
    dispatch(setOrderManagementKpiSummaryLoader(payload)),
  getOmsDeepDiveFilters: () => dispatch(getOmsDeepDiveFilters()),
  setOrderManagementDeepDiveFilters: (payload) =>
    dispatch(setOrderManagementDeepDiveFilters(payload)),
  setOrderManagementProductDetailsFilters: (payload) =>
    dispatch(setOrderManagementProductDetailsFilters(payload)),
  setSelectedRowsFromMatrixSummary: (payload) =>
    dispatch(setSelectedRowsFromMatrixSummary(payload)),
  setOrderManagementDeepDiveFiltersPayload: (payload) =>
    dispatch(setOrderManagementDeepDiveFiltersPayload(payload)),
  setRedirectionDetails: (payload) => dispatch(setRedirectionDetails(payload)),
  resetOrderManagementState: () => dispatch(resetOrderManagementState()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(productDetailsScreen);
