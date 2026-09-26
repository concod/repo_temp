import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import moment from "moment";
import { Button, Grid, Typography } from "@mui/material";
import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_DEEP_DRIVE,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import OrderDeepDiveTable from "./OrderDeepDiveTable";
import {
  resetOrderManagementState,
  setInventoryOrderManagementFilterElements,
  setInventoryOrderManagementFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setRedirectFromDeepDive,
  getOmsCoreFiscalCalendar,
  setOrderManagementKpiSummaryLoader,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import OrderSKUSummaryDeepDive from "./OrderSKUSummaryDeepDive";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const OrderDeepDrive = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();

  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [dataFromOMS, setDataFromOMS] = useState(props?.location?.data);
  const [
    isRedirectedFromDashboardPage,
    setIsRedirectedFromDashboardPage,
  ] = useState(
    props?.location?.isRedirectedFromDashboardPage
      ? props?.location?.isRedirectedFromDashboardPage
      : false
  );
  const [isRedirectedFromOMS, setIsRedirectedFromOMS] = useState(
    props?.location?.isRedirectedFromOMS
  );
  const [isRecommended, setIsRecommended] = useState(
    props?.location?.isRecommended
  );
  const [reloadComponents, setReloadComponents] = useState(null);
  const [storedSkuData, setStoredSkuData] = useState(
    JSON.parse(localStorage.getItem("selectedSku"))
  );

  const redirectData = useRef();
  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage = type && true;

  const onBackButtonClickHandler = () => {
    let filterDependency =
      props?.filterDashboardConfiguration?.dependencyData?.length > 0
        ? props?.filterDashboardConfiguration?.dependencyData
        : props?.inventoryOrderManagementFilterDependency;
    setOrderManagementKpiSummaryLoader(true);
    props.setRedirectFromDeepDive(true);
    props.history.push({
      pathname: ORDER_MANAGEMENT,
      isRedirectedFromDeepDive: true,
      disabledFilter: isRedirectedFromDashboardPage,
      filterDependency: filterDependency,
    });
  };

  const routeOptions = [
    {
      id: 1,
      label: "Order Management",
      action: () => {
        let filterDependency =
          props?.filterDashboardConfiguration?.dependencyData?.length > 0
            ? props?.filterDashboardConfiguration?.dependencyData
            : props?.inventoryOrderManagementFilterDependency;
        history.push({
          pathname: ORDER_MANAGEMENT,
          isRedirectedFromDeepDive: true,
          disabledFilter: isRedirectedFromDashboardPage,
          filterDependency: filterDependency,
        });
        props.setRedirectFromDeepDive(true);
      },
    },
    {
      id: 2,
      label: "Deep Dive",
      action: () => {
        history.push(ORDER_MANAGEMENT_DEEP_DRIVE);
      },
    },
  ];

  useEffect(() => {
    redirectData.current = storedSkuData;
    localStorage.removeItem("selectedSku");
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem("startDate");
    localStorage.removeItem("startDate");
  }, []);

  useEffect(() => {
    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
      try {
        props.setInventoryOrderManagementFilterLoader(true);
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
      } catch (error) {
        props.setInventoryOrderManagementFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
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

  return (
    <>
      {isRedirectedFromDifferentPage == null && (
        <>
          <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>

          <div className={globalClasses.filterWrapper}>
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
                  {routeOptions[1].label}
                </Typography>

                {isRedirectedFromOMS && (
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
                      {routeOptions[0].label}
                    </Typography>
                  </Button>
                )}
              </Grid>
            </Grid>
          </div>
        </>
      )}

      <div
        className={classNames(
          globalClasses.filterWrapper,
          globalClasses.marginVertical1rem
        )}
      >
        <OrderSKUSummaryDeepDive
          skuData={isRedirectedFromDifferentPage ? storedSkuData : dataFromOMS}
          isRedirectFromDifferentPage={isRedirectedFromDifferentPage}
          isRecommended={isRedirectedFromDifferentPage ? false : isRecommended}
          setReloadComponents={setReloadComponents}
          fiscalCalendarData={fiscalCalendarDetails}
        />
      </div>
      <div
        className={classNames(
          globalClasses.filterWrapper,
          globalClasses.marginTop
        )}
      >
        <OrderDeepDiveTable
          skuData={isRedirectedFromDifferentPage ? storedSkuData : dataFromOMS}
          isRedirectFromDifferentPage={isRedirectedFromDifferentPage}
          reloadComponents={reloadComponents}
          setReloadComponents={setReloadComponents}
        />
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    redirectFromDeepDive:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .redirectFromDeepDive,
    inventoryOrderManagementFilterLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .inventoryOrderManagementFilterLoader,
    inventoryOrderManagementFilterElements:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .inventoryOrderManagementFilterElements,
    inventoryOrderManagementFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .inventoryOrderManagementFilterDependency,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .backButtonClicked,
    formFilters:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .formFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventoryOrderManagementFilterLoader: (payload) =>
    dispatch(setInventoryOrderManagementFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryOrderManagementFilterElements: (payload) =>
    dispatch(setInventoryOrderManagementFilterElements(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  resetOrderManagementState: (payload) =>
    dispatch(resetOrderManagementState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderManagementKpiSummaryLoader: (payload) =>
    dispatch(setOrderManagementKpiSummaryLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderDeepDrive);
