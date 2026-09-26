import {
  Paper,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  TextField,
} from "@mui/material";
import { Switch } from "impact-ui";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useState, useRef } from "react";
import {
  capitalizeFirstLetterDropdown,
  configureAttributeOptions,
  fetchStoreFilters,
  formatFiltersDependency,
  filterStoreChannels,
  convertFilterStrValsToDropdwnObjects,
} from "./common-functions";
import StoreGroupFiltersHelper from "./store-group-filters-helper";
import { getCrossDimensionFiltersData } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import Select from "core/commonComponents/filters/Select/Select";
import {
  fetchStoreGroupClusterMetricParameters,
  setClassificationValue,
  setClusterParamters,
  setClusterTimeFormat,
  setClusterTimePeriod,
  setStoreGroupCustomLoaderValue,
  submitCustomStoreGroupClusterRequest,
  resetToDefaultValues,
  setSelectedCluster,
} from "../services-store-grouping/custom-store-group-service";
import DateRangePickerComponent from "core/commonComponents/dateRangePicker";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  setStoreGrpFilteredCols,
  resetFilterStores,
} from "../services-store-grouping/custom-store-group-service";
import globalStyles from "core/Styles/globalStyles";
import clsx from "clsx";
import LoadingOverlay from "core/Utils/Loader/loader";
import { DEFAULT_DATE_FORMAT } from "config/constants";
import { useLocation } from "react-router-dom-v5-compat";

/**
 * New set of filters imports
 */
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import FilterChips from "core/commonComponents/filters/filterChips";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
/**
 *
 */

const useStyles = makeStyles((theme) => ({
  classificationParameterDiv: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.typography.pxToRem(10),
  },
  horizontalCenter: {
    alignItems: "center",
  },
  centerAlign: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  applyRightMargin: {
    marginRight: theme.typography.pxToRem(8),
  },
  applyLeftMargin: {
    marginLeft: theme.typography.pxToRem(8),
  },
  requiredField: {
    color: theme.palette.error.main,
    marginLeft: theme.typography.pxToRem(2),
  },
}));
const CustomGroup = (props) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  const [storeGroupFilters, setstoreGroupFilters] = useState([]);
  const [storeFiltersSelection, setstoreFiltersSelection] = useState([]);
  const [productFiltersSelection, setproductFiltersSelection] = useState([]);
  const [storeGrpClusterParameters, setstoreGrpClusterParameters] = useState(
    []
  );
  const [storeGrpClusterTimeFormats, setstoreGrpClusterTimeFormats] = useState(
    []
  );
  const [triggerReset, settriggerReset] = useState(false);
  /**
   * Cluster Name dialog variables
   */
  const [openClusterNameModal, setopenClusterNameModal] = useState(false);
  const [newCustomClusterName, setnewCustomClusterName] = useState("");
  const [clusterNameModalLoader, setclusterNameModalLoader] = useState(false);

  /**
   * state variables for filters
   */
  const [openFilterModal, setOpenFilterModal] = useState(false);
  const [filterDependencyChips, setFilterDependencyChips] = useState([]);
  const [showFilterLoader, setShowFilterLoader] = useState(false);

  const resetBtnClicked = useRef(false);

  const classes = useStyles();

  /**
   *
   * @param {String} message
   * @param {String} type
   * Displays the Snack messages
   */
  const displayAlertMessage = (message, type = "error") => {
    props.addSnack({
      message: message,
      options: {
        variant: type,
      },
    });
  };

  useEffect(() => {
    const fetchCustomFiltersData = async () => {
      props.setStoreGroupCustomLoaderValue(true);
      //Fetch the table columns
      try {
        const cols = await props.getColumnsAg(
          "table_name=store_group_filter_cluster"
        );
        props.setStoreGrpFilteredCols(cols);
      } catch (error) {
        displayAlertMessage("Something went wrong");
      }
      //Fetching the filters
      try {
        const storeGroupfiltersResp = await fetchStoreFilters();
        // let currentAppName = location.pathname.includes("inventory-smart")
        //   ? "InventorySmart"
        //   : null;
        // const storeGroupfiltersResp = await fetchStoreFilters(
        //   [],
        //   false,
        //   currentAppName
        // );
        setstoreGroupFilters(storeGroupfiltersResp);
      } catch (error) {
        displayAlertMessage("Something went wrong");
      }
      //Filters block end

      //Fetching custom parameters
      try {
        const storeCustomGrpParametersResp = await props.fetchStoreGroupClusterMetricParameters(
          "custom"
        );
        if (storeCustomGrpParametersResp?.data?.data) {
          const parameters = capitalizeFirstLetterDropdown(
            storeCustomGrpParametersResp.data.data.metrics
          );
          setstoreGrpClusterParameters(parameters);
          const timeFormats = capitalizeFirstLetterDropdown(
            storeCustomGrpParametersResp.data.data.time_formats
          );
          setstoreGrpClusterTimeFormats(timeFormats);
        }
      } catch (error) {
        displayAlertMessage("Something went wrong");
      }
      //custom parametrs block end
      props.setStoreGroupCustomLoaderValue(false);
    };
    //On mount, fetch the data for filters
    fetchCustomFiltersData();
    return () => {
      /**
       * Reset the values to default state on unmounting of custom group
       */
      props.resetToDefaultValues();
      props.resetFilterStores();
    };
  }, []);

  /**
   * This function is called when the filter values in the filters are changed
   */
  const customFiltersOnChange = async (updatedSelectionChanges, dimension) => {
    setShowFilterLoader(true);
    const updatedCustomFiltersSelection =
      updatedSelectionChanges.length > 0
        ? formatFiltersDependency(updatedSelectionChanges)
        : [];

    try {
      let initialFilterElements = [...storeGroupFilters];
      let nonFilteredElementsByDimension =
        dimension === "product"
          ? storeFiltersSelection
          : productFiltersSelection;
      if (resetBtnClicked.current) {
        nonFilteredElementsByDimension = [];
      }
      const updatedFilteredElements = initialFilterElements.map(async (key) => {
        if (key.type === "cascaded") {
          let body = {
            attribute_name: key.column_name,
            filter_type: key.type,
            filters: [
              ...updatedCustomFiltersSelection,
              ...formatFiltersDependency(nonFilteredElementsByDimension),
            ],
            application_code: 3,
            dimension: key.dimension,
          };
          const options = await getCrossDimensionFiltersData(body)();
          if (key.column_name === "channel") {
            key.initialData = configureAttributeOptions(
              filterStoreChannels(options.data.data.attribute)
            );
          } else {
            key.initialData = configureAttributeOptions(
              options.data.data.attribute
            );
          }
        }
        return key;
      });
      await Promise.all(updatedFilteredElements);
      dimension === "product"
        ? setproductFiltersSelection(
            convertFilterStrValsToDropdwnObjects(updatedCustomFiltersSelection)
          )
        : setstoreFiltersSelection(
            convertFilterStrValsToDropdwnObjects(updatedCustomFiltersSelection)
          );
      setstoreGroupFilters(initialFilterElements);
      setFilterDependencyChips([
        ...updatedSelectionChanges,
        ...nonFilteredElementsByDimension,
      ]);
      if (resetBtnClicked.current) {
        resetBtnClicked.current = false;
      }
      setShowFilterLoader(false);
    } catch (error) {
      displayAlertMessage("Something went wrong");
      setShowFilterLoader(false);
    }
  };

  const productFiltersOnReset = () => {
    setproductFiltersSelection([]);
  };

  const storeFiltersOnReset = () => {
    setstoreFiltersSelection([]);
    setFilterDependencyChips([]);
    props.resetToDefaultValues();
    props.resetFilterStores();
  };

  const onClusterMetricsValueChange = (value, type) => {
    if (type === "classification") {
      //Classification Value Change
      //If switch checked is true, selected value is pattern
      //If switch checked is false, selected value is yoy (year on year)
      props.setClassificationValue(value ? "pattern" : "yoy");
    } else if (type === "parameters") {
      //Parameters Change
      props.setClusterParamters(value);
    } else if (type === "timeformat") {
      //Time Format Change
      props.setClusterTimeFormat(value);
    } else {
      //Time Period Range Change
      props.setClusterTimePeriod(value);
    }
  };

  const onSubmitClusterDetails = async () => {
    setclusterNameModalLoader(true);

    if (newCustomClusterName.length === 0) {
      displayAlertMessage("Cluster Name can't be empty");
      setclusterNameModalLoader(false);
      return;
    }
    const storeFilters = formatFiltersDependency(
      storeFiltersSelection,
      "store",
      true
    );
    const productFilters = formatFiltersDependency(
      productFiltersSelection,
      "product",
      true
    );

    let body = {
      filters: [...storeFilters, ...productFilters],
      range: [],
      sort: [],
      search: [],
      definitions: [],
      name: newCustomClusterName,
      metrics: {
        classification: props.selectedClusterClassification,
        time_format: props.selectedClusterTimeFormat[0].value,
        start_date: props.selectedClusterTimePeriod[0].format("YYYY-MM-DD"),
        end_date: props.selectedClusterTimePeriod[1].format("YYYY-MM-DD"),
        type: "custom",
        value: props.selectedClusterParameters.map((metric) => metric.value),
      },
    };
    try {
      const res = await props.submitCustomStoreGroupClusterRequest(body);
      const reqData = res.data.data;
      if (
        reqData.status === "in_queue" ||
        reqData.status === "in_progress" ||
        reqData.status === "completed"
      ) {
        if (reqData.status === "completed") {
          props.addSnack({
            message: `${reqData.message} - ${reqData.request_id}`,
            options: {
              variant: "success",
            },
          });
          setclusterNameModalLoader(false);
          setopenClusterNameModal(false);
          /**
           * Now set the selected cluster id
           */
          props.setSelectedCluster({ id: reqData.request_id });
          return;
        }
        props.addSnack({
          message: `New clustering started`,
          options: {
            variant: "success",
            style: { whiteSpace: "pre-line" },
          },
        });
        setclusterNameModalLoader(false);
        setopenClusterNameModal(false);
        settriggerReset(!triggerReset);
        setnewCustomClusterName("");
        props.resetFilterStores();
      } else {
        setclusterNameModalLoader(false);
        props.addSnack({
          message: `${reqData.message}`,
          options: {
            variant: "error",
          },
        });
      }
    } catch (error) {
      setclusterNameModalLoader(false);
      props.addSnack({
        message: `Can't submit a cluster job`,
        options: {
          variant: "error",
        },
      });
    }
  };

  const onCreateCluster = () => {
    let requiredFieldsError = false;
    //Check for filters
    for (const eachFilter of storeGroupFilters) {
      const selectedDimensionFilters =
        eachFilter.dimension === "product"
          ? productFiltersSelection
          : storeFiltersSelection;
      if (
        eachFilter.is_mandatory === true &&
        !selectedDimensionFilters.some((selFilter) => {
          return selFilter.column_name === eachFilter.attribute_name;
        })
      ) {
        requiredFieldsError = true;
        break;
      }
    }
    if (storeFiltersSelection.length === 0) {
      requiredFieldsError = true;
    }
    //Check for parameters
    if (props.selectedClusterParameters.length === 0) {
      requiredFieldsError = true;
    }
    //Check for timeformat
    if (props.selectedClusterTimeFormat.length === 0) {
      requiredFieldsError = true;
    }

    //Check for date Range
    //If the either of start or end dates is null or
    //If the start date is greater than end date
    if (
      !props.selectedClusterTimePeriod[0] ||
      !props.selectedClusterTimePeriod[1] ||
      isNaN(props.selectedClusterTimePeriod[0]) ||
      isNaN(props.selectedClusterTimePeriod[1]) ||
      props.selectedClusterTimePeriod[1].diff(
        props.selectedClusterTimePeriod[0]
      ) < 0
    ) {
      requiredFieldsError = true;
    }
    if (requiredFieldsError) {
      displayAlertMessage("Please select the required Filters");
      return;
    }
    setopenClusterNameModal(true);
  };

  useEffect(() => {
    if (props.selectedClusterFilters.length > 0) {
      setproductFiltersSelection(
        props.selectedClusterFilters.filter(
          (filter) => filter.dimension === "product"
        )
      );
      setstoreFiltersSelection(
        props.selectedClusterFilters.filter(
          (filter) => filter.dimension === "store"
        )
      );
    }
  }, [props.selectedClusterFilters]);

  return (
    <>
      {openClusterNameModal && (
        <ClusterName
          showLoader={clusterNameModalLoader}
          submitClusterRequest={onSubmitClusterDetails}
          open={openClusterNameModal}
          handleClose={() => setopenClusterNameModal(false)}
          clusterName={newCustomClusterName}
          setclusterName={setnewCustomClusterName}
        />
      )}

      <>
        <div className={globalClasses.filterWrapper}>
          <Grid
            container
            direction="row-reverse"
            justifyContent="space-between"
            alignItems="center"
          >
            <Grid>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FilterAltOutlinedIcon />}
                onClick={() => setOpenFilterModal(true)}
              >
                Select Filters
              </Button>
            </Grid>
          </Grid>
          {filterDependencyChips.length > 0 && (
            <FilterChips filterConfig={filterDependencyChips}></FilterChips>
          )}
        </div>
        <FilterModal
          open={openFilterModal}
          isModalFixedTop={true}
          closeOnOverlayClick={() => setOpenFilterModal(false)}
        >
          <CustomAccordion
            label="Store"
            defaultExpanded={true}
            customClass={globalClasses.accordianWrapper}
          >
            <LoadingOverlay loader={showFilterLoader}>
              <StoreGroupFiltersHelper
                defaultFilterSelection={storeFiltersSelection}
                dimension="store"
                updateData={customFiltersOnChange}
                customFilter={true}
                onReset={storeFiltersOnReset}
                filterArray={storeGroupFilters}
                resetFilter={triggerReset}
              />
            </LoadingOverlay>
          </CustomAccordion>
          <CustomAccordion
            label="Product"
            defaultExpanded={true}
            customClass={globalClasses.accordianWrapper}
          >
            <LoadingOverlay loader={showFilterLoader}>
              <StoreGroupFiltersHelper
                defaultFilterSelection={productFiltersSelection}
                dimension="product"
                updateData={customFiltersOnChange}
                customFilter={true}
                onReset={productFiltersOnReset}
                filterArray={storeGroupFilters}
                resetFilter={triggerReset}
              />
            </LoadingOverlay>
          </CustomAccordion>
        </FilterModal>
      </>
      <ParametersBlock
        parametersDropdownData={storeGrpClusterParameters}
        timeFormatsDropdownData={storeGrpClusterTimeFormats}
        onValueChange={onClusterMetricsValueChange}
        selectedClassification={props.selectedClusterClassification}
        selectedClusterTimePeriod={props.selectedClusterTimePeriod}
        selectedClusterParameters={props.selectedClusterParameters}
        selectedClusterTimeFormat={props.selectedClusterTimeFormat}
      />
      <div className={clsx(globalClasses.paper, classes.centerAlign)}>
        <Button
          className={classes.applyRightMargin}
          color="primary"
          variant="contained"
          onClick={onCreateCluster}
        >
          Apply
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            resetBtnClicked.current = true;
            settriggerReset(!triggerReset);
          }}
        >
          Reset
        </Button>
      </div>
    </>
  );
};

const ParametersBlock = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [focusedInput, setfocusedInput] = useState(null);
  const onFocusChange = (input) => {
    setfocusedInput(input);
  };

  const onTimePeriodChange = (start, end) => {
    const updatedTimePeriod = [start, end];
    props.onValueChange(updatedTimePeriod, "timeperiodrange");
  };

  const onClusterParametersValueChange = (_key, option) => {
    props.onValueChange(option, "parameters");
  };

  const onTimeFormatChange = (_key, option) => {
    props.onValueChange(option, "timeformat");
  };
  return (
    <Paper className={globalClasses.paper}>
      <div className={classes.classificationParameterDiv}>
        <Typography className={classes.applyRightMargin}>
          Classification based on:{" "}
          <span className={classes.requiredField}>*</span>
        </Typography>
        <Switch
          checked={props.selectedClassification === "pattern"}
          onChange={(event) =>
            props.onValueChange(event.target.checked, "classification")
          }
          rightLabel="Pattern Classification"
          leftLabel="YOY Clasification"
        />
      </div>
      <Grid container spacing={2}>
        <Grid
          item
          container
          direction="row"
          xs={3}
          className={classes.horizontalCenter}
        >
          <Typography className={classes.applyRightMargin}>
            Select Parameters <span className={classes.requiredField}>*</span>
          </Typography>
          <Grid item xs={5}>
            <Select
              id="storeGroupingParametersDrpdown"
              initialData={props.parametersDropdownData}
              menuPortalTarget={document.body}
              selectedOptions={props.selectedClusterParameters}
              isSearchable={true}
              dependency={[]}
              updateDependency={onClusterParametersValueChange}
              isDisabled={false}
              is_multiple_selection={true}
            />
          </Grid>
        </Grid>
        <Grid
          item
          xs={3}
          container
          direction="row"
          className={classes.horizontalCenter}
        >
          <Typography className={classes.applyRightMargin}>
            Time Format <span className={classes.requiredField}>*</span>
          </Typography>
          <Grid item xs={5}>
            <Select
              id="storeGroupingTimeFormatDrpdown"
              initialData={props.timeFormatsDropdownData}
              menuPortalTarget={document.body}
              selectedOptions={props.selectedClusterTimeFormat}
              isSearchable={true}
              dependency={[]}
              updateDependency={onTimeFormatChange}
              isDisabled={false}
            />
          </Grid>
        </Grid>
        <Grid
          item
          container
          direction="row"
          xs={4}
          className={classes.horizontalCenter}
        >
          <Typography className={classes.applyRightMargin}>
            Time Period <span className={classes.requiredField}>*</span>
          </Typography>
          <Grid item xs={8}>
            <DateRangePickerComponent
              disableType="disableFuture"
              startDate={props.selectedClusterTimePeriod[0]}
              endDate={props.selectedClusterTimePeriod[1]}
              focusedInput={focusedInput}
              onDatesChange={onTimePeriodChange}
              onFocusChange={onFocusChange}
              weeklySelection={true}
              dateFormat={DEFAULT_DATE_FORMAT}
            />
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

const ClusterName = (props) => {
  return (
    <>
      <Dialog
        id="storeGrpingGrpNameDialog"
        open={props.open}
        fullWidth={true}
        maxWidth={"sm"}
        onClose={props.handleClose}
        aria-labelledby="form-dialog-title"
        onBackdropClick="false"
      >
        <LoadingOverlay loader={props.showLoader} spinner>
          <DialogTitle id="form-dialog-title">Enter Cluster name</DialogTitle>
          <DialogContent>
            <TextField
              id="storeGrpingGrpClusterNameInp"
              autoFocus
              margin="dense"
              placeholder="Enter here"
              fullWidth
              disabled={props.showLoader}
              value={props.clusterName}
              onChange={(event) => props.setclusterName(event.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button
              disabled={props.showLoader}
              onClick={props.handleClose}
              color="primary"
              id="storeGrpingGrpDfnNameCnclBtn"
            >
              Cancel
            </Button>
            <Button
              disabled={props.showLoader}
              onClick={props.submitClusterRequest}
              color="primary"
              id="storeGrpingGrpDfnNameSaveBtn"
            >
              Save
            </Button>
          </DialogActions>
        </LoadingOverlay>
      </Dialog>
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    selectedClusterParameters:
      store.storeGroupReducer.selectedClusterParameters,
    selectedClusterClassification:
      store.storeGroupReducer.selectedClusterClassification,
    selectedClusterTimeFormat:
      store.storeGroupReducer.selectedClusterTimeFormat,
    selectedClusterTimePeriod:
      store.storeGroupReducer.selectedClusterTimePeriodRange,
    selectedClusterFilters: store.storeGroupReducer.selectedClusterFilters,
  };
};

const mapActionsToProps = {
  addSnack,
  fetchStoreGroupClusterMetricParameters,
  setClassificationValue,
  setClusterParamters,
  setClusterTimeFormat,
  setClusterTimePeriod,
  setStoreGroupCustomLoaderValue,
  submitCustomStoreGroupClusterRequest,
  getColumnsAg,
  setStoreGrpFilteredCols,
  resetFilterStores,
  resetToDefaultValues,
  setSelectedCluster,
};
export default connect(mapStateToProps, mapActionsToProps)(CustomGroup);
