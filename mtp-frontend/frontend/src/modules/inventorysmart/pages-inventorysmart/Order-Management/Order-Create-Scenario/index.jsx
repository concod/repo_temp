import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  resetOrderManagementState,
  setInventoryOrderManagementFilterElements,
  setInventoryOrderManagementFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setRedirectFromDeepDive,
  getOmsCreateScenarioEditTableData,
  setOrderScenarioApplyTableDataLoader,
  getCreateScenarioDeepDiveTableConfiguration,
  getScenarioViewTableConfiguration,
  getOmsDeepDiveTableData,
  setOrderManagementDeepDiveTableData,
  setCreateScenarioViewTableData,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import OrderCreateScenarioTable from "./OrderCreateScenarioTable";
import { Button, Grid, Typography } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import OrderScenarioApplyTable from "./OrderScenarioApplyTable";
import { ProgressBar } from "impact-ui";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CreateScenarioStepper from "./CreateScenarioStepper";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import Loader from "core/Utils/Loader/loader";

const OrderCreateScenario = (props) => {
  const history = useHistory();
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [isSimulateSuccess, setIsSimulateSuccess] = useState(false);
  const [dataFromOMS, setDataFromOMS] = useState(props?.location?.state?.data);
  const [isRecommended, setIsRecommended] = useState(
    props?.location?.state?.isRecommended
  );
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(
    props?.location?.state?.isRedirectedFromDifferentPage
      ? props?.location?.state?.isRedirectedFromDifferentPage
      : false
  );
  const [simulatedTableData, setSimulatedTableData] = useState([]);
  const [progressLoader, setProgressLoader] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationError, setSimulationError] = useState(false);
  const [isScenarioApplied, setIsScenarioApplied] = useState(false);

  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [scenarioViewTableColumns, setScenarioViewTableColumns] = useState([]);
  const [activeStep, setActiveStep] = useState(
    parseInt(new URLSearchParams(window.location.search).get("step"))
  );

  const simulateCreateScenario = (selectedSku) => {
    if (selectedSku.length > 0) {
      try {
        props.setOrderScenarioApplyTableDataLoader(true);
        setSimulatedTableData([]);
        setIsSimulateSuccess(true);
        setProgress(0);
        setProgressLoader(true);
        setSimulationError(false);
        history.push(`${ORDER_MANAGEMENT_CREATE_SCENARIO}?step=1`);
        setActiveStep(1);
        selectedSku.filter((data) => {
          data.service_level_pct = parseFloat(
            parseFloat(data.service_level_pct).toFixed(2)
          );
        });
        var values = [];
        dataFromOMS.forEach((e) => {
          values.push(e.product_code);
        });
        const uniqueData = values.filter(
          (element, index) => values.indexOf(element) === index
        );
        let object = {
          recom_payload: {
            filters: [
              {
                filter_type: "cascaded",
                attribute_name: "product_code",
                operator: "in",
                dimension: "Product",
                values: uniqueData,
              },
            ],
            is_recommended: isRecommended,
            current_cycle_order: false,
            meta: {},
          },
          data: [...selectedSku],
        };
        let payload = [];
        selectedSku?.forEach((e) => {
          let productCode = parseInt(e.product_code);
          let prodObject = {
            product_code: productCode,
            loc_code: e.loc_code,
          };
          payload.push(prodObject);
        });
        let body = {
          data: [...payload],
        };
        Promise.all(
          [
            props.getOmsDeepDiveTableData(body),
            props.getOmsCreateScenarioEditTableData(object),
            props.getCreateScenarioDeepDiveTableConfiguration(),
            props.getScenarioViewTableConfiguration()
          ]
        ).then((data)=>{
          let formattedColumns = agGridColumnFormatter(data[2]?.data?.data);
          let ScenarioformattedColumns = agGridColumnFormatter(
            data[3]?.data?.data
          );
        setDeepDiveTableColumns(formattedColumns);
        setScenarioViewTableColumns(ScenarioformattedColumns);
        if (data[0]?.status) {
          let formatedData = agGridRowFormatter(data[0]?.data?.data);
          props.setOrderManagementDeepDiveTableData(formatedData);
        }
        if (data[1].status) {
          setSimulatedTableData(data[1]?.data?.data?.scenario);
          let scenarioViewformatedData = agGridRowFormatter(
            data[1]?.data?.data?.deep_dive_scenario
          );
          props?.setCreateScenarioViewTableData(scenarioViewformatedData);
          setProgressLoader(false);
          setSimulationError(false);
          props.setOrderScenarioApplyTableDataLoader(false);
        } else {
          setSimulationError(true);
          props.setOrderScenarioApplyTableDataLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
        })
      } catch (error) {
        setSimulationError(true);
        props.setOrderScenarioApplyTableDataLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages("Select atleast one sku id", "error");
    }
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
          disabledFilter: isRedirectedFromDifferentPage,
          filterDependency: filterDependency,
        });
        props.setRedirectFromDeepDive(true);
      },
    },
    {
      id: 2,
      label: "Create Scenario",
      action: () => {
        history.push(ORDER_MANAGEMENT_CREATE_SCENARIO);
      },
    },
  ];
  const onBackButtonClickHandler = () => {
    props.setRedirectFromDeepDive(true);
    let filterDependency =
      props?.filterDashboardConfiguration?.dependencyData?.length > 0
        ? props?.filterDashboardConfiguration?.dependencyData
        : props?.inventoryOrderManagementFilterDependency;
    props.history.push({
      pathname: ORDER_MANAGEMENT,
      isRedirectedFromDeepDive: true,
      disabledFilter: isRedirectedFromDifferentPage,
      filterDependency: filterDependency,
    });
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    if (progressLoader && !simulationError) {
      var timer = setTimeout(() => {
        setProgress(progress + 5 <= 95 ? progress + 5 : 95);
      }, 500);
    } else {
      return () => clearInterval(timer);
    }
  }, [progressLoader, progress, simulationError]);

  return (
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
          </Grid>
        </Grid>
      </div>
      <div className={classes.stepperWrapper} style={{ marginLeft: "34%" }}>
        <CreateScenarioStepper
          activeStep={parseInt(activeStep)}
          setActiveStep={setActiveStep}
        />
      </div>
      {activeStep === 0 ? (
        <>
          <div
            className={classNames(
              globalClasses.filterWrapper,
              globalClasses.marginVertical1rem
            )}
          >
            <OrderCreateScenarioTable
              skuData={dataFromOMS}
              simulateCreateScenario={simulateCreateScenario}
              isSimulateSuccess={isSimulateSuccess}
              isRecommended={isRecommended}
              isScenarioApplied={isScenarioApplied}
            />
          </div>
        </>
      ) : (
        <>
          {/* {isSimulateSuccess && progressLoader && (
      <div
        style={{
          width: "300px",
          padding: "15px",
          marginLeft: "42%",
          marginTop: "128px",
        }}
      >
        <ProgressBar variant="small" progress={progress} label="Loading..." />
      </div>
    )} */}
          <Loader
            loader={
              simulatedTableData.length > 0 &&
              props?.createScenarioViewTableData.length > 0
                ? false
                : true
            }
            minHeight={"260px"}
          >
            {simulatedTableData?.length > 0 &&
              props?.createScenarioViewTableData.length > 0 &&
              props?.orderManagementDeepDiveTableData && (
                <div
                  className={classNames(
                    globalClasses.filterWrapper,
                    globalClasses.marginVertical1rem
                  )}
                >
                  <OrderScenarioApplyTable
                    skuData={simulatedTableData}
                    deepDiveViewTableData={
                      props?.orderManagementDeepDiveTableData
                    }
                    deepDiveTableColumn={deepDiveTableColumns}
                    scenarioViewColumns={scenarioViewTableColumns}
                    scenarioViewTableData={props?.createScenarioViewTableData}
                    isRedirectedFromDifferentPage={
                      isRedirectedFromDifferentPage
                    }
                    isScenarioApplied={isScenarioApplied}
                    setIsScenarioApplied={setIsScenarioApplied}
                  />
                </div>
              )}
          </Loader>
        </>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    createScenarioViewTableData:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .createScenarioViewTableData,
    orderManagementDeepDiveTableData:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementDeepDiveTableData,
    orderScenarioApplyTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderScenarioApplyTableDataLoader,
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
  getCreateScenarioDeepDiveTableConfiguration: (payload) =>
    dispatch(getCreateScenarioDeepDiveTableConfiguration(payload)),
  getScenarioViewTableConfiguration: (payload) =>
    dispatch(getScenarioViewTableConfiguration(payload)),
  getOmsDeepDiveTableData: (payload) =>
    dispatch(getOmsDeepDiveTableData(payload)),
  setOrderManagementDeepDiveTableData: (payload) =>
    dispatch(setOrderManagementDeepDiveTableData(payload)),
  setCreateScenarioViewTableData: (payload) =>
    dispatch(setCreateScenarioViewTableData(payload)),
  setInventoryOrderManagementFilterLoader: (payload) =>
    dispatch(setInventoryOrderManagementFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryOrderManagementFilterElements: (payload) =>
    dispatch(setInventoryOrderManagementFilterElements(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  resetOrderManagementState: () => dispatch(resetOrderManagementState()),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  getOmsCreateScenarioEditTableData: (payload) =>
    dispatch(getOmsCreateScenarioEditTableData(payload)),
  setOrderScenarioApplyTableDataLoader: (payload) =>
    dispatch(setOrderScenarioApplyTableDataLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderCreateScenario);
