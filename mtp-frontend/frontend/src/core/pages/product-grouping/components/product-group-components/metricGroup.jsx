import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  getCombinedFilterDashboardData,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import FilterChips from "core/commonComponents/filters/filterChips";
import { cloneDeep } from "lodash";
import {
  ToggleLoader,
  fetchProdGrpFilteredProducts,
  fetchRequestInfo,
  getMetrics,
  setInitialMetricFilters,
  setMetricEndDate,
  setMetricStartDate,
  setProdGroupFilteredProds,
  setProdGrpFilteredCols,
  setResetFilterTable,
  setSelectedCluster,
  setSelectedObjectiveMetric,
  setSelectedObjectiveTimeFormat,
  setSelectedProducts,
  submitClusterJob,
} from "core/pages/product-grouping/product-grouping-service";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "../../../../Utils/select";
import {
  getAllFilters,
  getFiltersValues,
  setSelectedFilters,
} from "../../../../actions/filterAction";
import { addSnack } from "../../../../actions/snackbarActions";
import {
  getColumnsAg,
  setTableState,
} from "../../../../actions/tableColumnActions";
import DateRangePicker from "../../../../commonComponents/dateRangePicker";
import ObjectiveFilters from "../../../../commonComponents/filters/filterGroup";

const useStyles = makeStyles({
  objectiveDrpDwn: {
    display: "flex",
    alignItems: "center",
  },
  formGrp: {
    display: "flex",
    flexDirection: "row",
  },
  paperStyling: {
    border: "1px solid #e3ecf4",
    marginTop: 20,
    padding: 10,
  },
  customMetricLabelDiv: {
    width: "60%",
  },
  customMetricChecboxesDiv: {
    width: "100%",
  },
  customTimeFormatLabelDiv: {
    width: "60%",
  },
  customTimeFormatDiv: {
    width: "100%",
  },
  customDateLabelDiv: {
    width: "40%",
  },
  customDateDiv: {
    width: "100%",
  },
  objectiveMetricLabelDiv: {
    width: "60%",
  },
  objectiveMetricDrpDwnDiv: {
    width: "100%",
  },
  objectiveTimeFormatLabelDiv: {
    width: "60%",
  },
  objectiveTimeFormatDiv: {
    width: "100%",
  },
  objectiveDateLabelDiv: {
    width: "40%",
  },
  objectiveDateDiv: {
    width: "100%",
  },
  subFilterGroup: {
    padding: "1rem",
    margin: "1rem",
  },
});
const ObjectiveGroup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [objectiveFilterData, setobjectiveFilterData] = useState([]);
  const [filterDependency, setDependency] = useState([]);
  const [focusedInput, setfocusedInput] = useState(null);
  const [metrics, setmetrics] = useState([]);
  const [timeFormats, settimeFormats] = useState([]);
  const [triggerReset, settriggerReset] = useState(false);
  const [openClusterNameModal, setopenClusterNameModal] = useState(false);
  const [showLoader, setshowLoader] = useState(false);
  const [clusterName, setclusterName] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [filterDependencyChips, setFilterDependencyChips] = useState([]);
  const [showFilterLoader, setShowFilterLoader] = useState(false);

  const openClusterNameModalFunc = () => {
    if (
      filterDependency.length === 0 ||
      props.selectedMetric === "" ||
      props.startDate === null ||
      props.endDate === null
    ) {
      props.addSnack({
        message: "Please apply necessary filters",
        options: {
          variant: "error",
        },
      });
      return;
    }
    setOpenModal(false);
    setopenClusterNameModal(true);
  };
  const closeClusterNameModalFunc = () => {
    setopenClusterNameModal(false);
  };
  const onDatesChange = (start, end) => {
    props.setMetricStartDate(start);
    props.setMetricEndDate(end);
  };
  const onFocusChange = (inp) => {
    setfocusedInput(inp);
  };
  const configureInitialData = (options) => {
    return options.map((item) => {
      return mapDataToLabel(item);
    });
  };
  const configureTimeFormatOptions = (options) => {
    return options.map((format) => {
      return {
        label: format,
        value: format,
      };
    });
  };

  /**
   *
   * @param {array of strings} values
   * @returns array of objects with label as string value passed and value also same as string value passed
   * Here we have used the existing timeformatOptions functions which returns the same output
   * But for better naming understanding, a seperate is created which uses timeformatoptions fucntion
   */
  const configureDependencyValues = (values) => {
    return configureTimeFormatOptions(values);
  };

  useEffect(() => {
    setmetrics([]);
    const fetchData = async () => {
      props.ToggleLoader(true);
      try {
        let response = await props.getAllFilters("product grouping");

        const filterDashboardData = await getCombinedFilterDashboardData(
          response.data.data,
          []
        );

        const filterElements = response.data.data.map(async (key) => {
          const options = filterDashboardData[key.column_name];
          key.filter_keyword = key.column_name;
          key.initialData = configureInitialData(options);
          return key;
        });

        await Promise.all(filterElements);
        const cols = await props.getColumnsAg(
          "table_name=product_group_filter_cluster"
        );
        props.setProdGrpFilteredCols(cols);
        setobjectiveFilterData(response.data.data);
        if (props.type === "objective") {
          const metricsRes = await props.getMetrics("objective");
          setmetrics(
            metricsRes.data.data.metrics.map((metric) => {
              return {
                label: metric,
                value: metric,
              };
            })
          );
          settimeFormats(
            configureTimeFormatOptions(metricsRes.data.data.time_formats)
          );
          props.setSelectedObjectiveTimeFormat({
            label: metricsRes.data.data.time_formats[0],
            value: metricsRes.data.data.time_formats[0],
          });
        } else {
          const metricsRes = await props.getMetrics("custom");
          setmetrics(
            metricsRes.data.data.metrics.map((metric) => {
              return {
                label: metric,
                value: metric,
                checked: false,
              };
            })
          );

          settimeFormats(
            configureTimeFormatOptions(metricsRes.data.data.time_formats)
          );
          props.setSelectedObjectiveTimeFormat({
            label: metricsRes.data.data.time_formats[0],
            value: metricsRes.data.data.time_formats[0],
          });
          props.setSelectedObjectiveTimeFormat({
            label: metricsRes.data.data.time_formats[0],
            value: metricsRes.data.data.time_formats[0],
          });
        }
        settriggerReset(!triggerReset);
        props.ToggleLoader(false);
      } catch (error) {
        props.ToggleLoader(false);
      }
    };
    fetchData();
  }, [props.type]);

  useEffect(() => {
    if (props.type === "custom") {
      let updatedMetrics = metrics.map((metric) => {
        if (
          props.selectedMetric !== "" &&
          props.selectedMetric.some((selMetric) => {
            return metric.value === selMetric.value;
          })
        ) {
          return {
            ...metric,
            checked: true,
          };
        } else {
          return {
            ...metric,
            checked: false,
          };
        }
      });
      setmetrics(updatedMetrics);
    }
  }, [props.selectedMetric]);
  const updateData = async (dependency) => {
    setShowFilterLoader(true);
    let selectionDependency =
      dependency.length > 0
        ? dependency.map((item) => {
            return {
              attribute_name: item.filter_id,
              operator: "in",
              values: Array.isArray(item.values)
                ? item.values.map((opt) => opt.value)
                : item.values,
              filter_type: item.filter_type,
              filter_id: item.filter_id,
            };
          })
        : [];
    try {
      setFilterDependencyChips(dependency);
      let initialFilterElements = [...objectiveFilterData];

      const filterDashboardData = await getCombinedFilterDashboardData(
        initialFilterElements,
        selectionDependency
      );

      const filterElements = initialFilterElements.map(async (key) => {
        if (key.type === "cascaded") {
          let body = {
            attribute_name: key.column_name,
            filter_type: key.type,
            filters: selectionDependency,
          };
          const options = filterDashboardData[key.column_name];
          key.initialData = configureInitialData(options);
        }
        return key;
      });
      await Promise.all(filterElements);
      setDependency(selectionDependency);
      setobjectiveFilterData(initialFilterElements);
      setShowFilterLoader(false);
    } catch (error) {
      setShowFilterLoader(false);
    }
  };

  const submitClusterRequest = async () => {
    props.setSelectedProducts([]);
    props.setProdGroupFilteredProds({ data: [], count: 0 });
    setshowLoader(true);
    let dependency = filterDependency.map((filter) => {
      return {
        ...filter,
        column_name: filter.attribute_name,
        dimension: "Product",
      };
    });
    let body = {
      filters: dependency,
      range: [],
      sort: [],
      search: [],
      definitions: [],
      name: clusterName,
      metrics: {
        time_format: props.selectedTimeFormat.value,
        start_date: props.startDate.format("YYYY-MM-DD"),
        end_date: props.endDate.format("YYYY-MM-DD"),
        type: props.type,
        value:
          props.type === "objective"
            ? [props.selectedMetric.value]
            : props.selectedMetric.map((metric) => metric.value),
      },
    };
    if (props.isEdit) {
      //Yet to develop
    } else {
      try {
        const res = await props.submitClusterJob(body);
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
            setshowLoader(false);
            closeClusterNameModalFunc();
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
        } else {
          setshowLoader(false);
          props.addSnack({
            message: `${reqData.message}`,
            options: {
              variant: "error",
            },
          });
        }
      } catch (error) {
        setshowLoader(false);
        props.addSnack({
          message: `Can't submit a cluster job`,
          options: {
            variant: "error",
          },
        });
      }
    }
    setshowLoader(false);
    closeClusterNameModalFunc();
    settriggerReset(!triggerReset);
    setclusterName("");
  };

  const onReset = () => {
    props.setSelectedObjectiveTimeFormat(timeFormats[0]);
    props.setProdGroupFilteredProds({ data: [], count: 0 });
    props.setSelectedProducts([]);
    onMetricChange("");
    props.setMetricStartDate(null);
    props.setMetricEndDate(null);
    setDependency([]);
    props.setInitialMetricFilters([]);
    if (props.type === "custom") {
      setmetrics(
        metrics.map((metric) => {
          return {
            ...metric,
            checked: false,
          };
        })
      );
    }
    props.setSelectedCluster({});
    props.setResetFilterTable(true);
  };

  const onMetricChange = (option) => {
    props.setSelectedObjectiveMetric(option);
  };
  const onCustomMetricChange = (event) => {
    let updatedMetrics = metrics.map((metric) => {
      if (metric.value === event.target.name) {
        return {
          ...metric,
          checked: event.target.checked,
        };
      } else {
        return metric;
      }
    });
    props.setSelectedObjectiveMetric(
      updatedMetrics.filter((metric) => {
        return metric.checked;
      })
    );
  };
  const onTimeFormatChange = (option) => {
    props.setSelectedObjectiveTimeFormat(option);
  };

  useEffect(() => {
    if (props.initialMetricFilters.length) {
      setDependency(props.initialMetricFilters);
      setFilterDependencyChips(
        cloneDeep(props.initialMetricFilters).map((metric) => {
          metric.values = metric.values.map((val) => ({
            label: val,
            value: val,
          }));
          return metric;
        })
      );
    }
  }, [props.initialMetricFilters]);
  return (
    <>
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
                onClick={() => setOpenModal(true)}
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
          open={openModal}
          isModalFixedTop={true}
          closeOnOverlayClick={() => setOpenModal(false)}
        >
          <CustomAccordion label="Filter" defaultExpanded={true}>
            <Paper elevation={3} className={globalClasses.paperWrapper}>
              <LoadingOverlay loader={showFilterLoader} minHeight={200}>
                <ObjectiveFilters
                  inititalSelection={filterDependency.map((filter) => ({
                    ...filter,
                    values: configureDependencyValues(filter.values),
                  }))}
                  filters={objectiveFilterData}
                  screen="product_metric"
                  update={updateData}
                  customFilter={true}
                  onReset={onReset}
                  resetFilter={triggerReset}
                />
              </LoadingOverlay>
            </Paper>
          </CustomAccordion>
        </FilterModal>
      </>
      {openClusterNameModal && (
        <ClusterName
          showLoader={showLoader}
          submitClusterRequest={submitClusterRequest}
          open={openClusterNameModal}
          handleClose={closeClusterNameModalFunc}
          clusterName={clusterName}
          setclusterName={setclusterName}
        />
      )}
      <Paper
        className={`${globalClasses.paddingAround} ${globalClasses.marginTop}`}
      >
        {props.type === "objective" ? (
          <Grid container spacing={2}>
            <Grid
              item
              container
              direction="row"
              xs={3}
              className={globalClasses.verticalAlignCenter}
            >
              <Typography className={globalClasses.marginHorizontal}>
                Select Objective
              </Typography>
              <Grid item xs={5}>
                <Select
                  value={props.selectedMetric}
                  options={metrics}
                  onChange={onMetricChange}
                  isSearchable={false}
                />
              </Grid>
            </Grid>
            <Grid
              item
              container
              direction="row"
              xs={3}
              className={globalClasses.verticalAlignCenter}
            >
              <Typography className={globalClasses.marginHorizontal}>
                Time format
              </Typography>
              <Grid item xs={5}>
                <Select
                  options={timeFormats}
                  value={props.selectedTimeFormat}
                  onChange={onTimeFormatChange}
                  isSearchable={false}
                />
              </Grid>
            </Grid>
            <Grid
              item
              container
              direction="row"
              xs={4}
              className={globalClasses.verticalAlignCenter}
            >
              <Typography className={globalClasses.marginHorizontal}>
                Time period
              </Typography>
              <Grid item xs={8}>
                <DateRangePicker
                  disableType="disableFuture"
                  startDate={props.startDate}
                  endDate={props.endDate}
                  focusedInput={focusedInput}
                  onDatesChange={onDatesChange}
                  onFocusChange={onFocusChange}
                  weeklySelection={true}
                />
              </Grid>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid
              item
              container
              direction="row"
              xs={4}
              className={globalClasses.verticalAlignCenter}
            >
              <Typography className={globalClasses.marginHorizontal}>
                Grouping based on
              </Typography>
              <Grid item xs={8}>
                <FormControl
                  sx={{ m: 3 }}
                  component="fieldset"
                  variant="standard"
                >
                  <FormGroup className={classes.formGrp}>
                    {metrics.map((metric) => {
                      return (
                        <FormControlLabel
                          control={
                            <Checkbox
                              color="primary"
                              checked={metric.checked}
                              onChange={onCustomMetricChange}
                              name={metric.value}
                            />
                          }
                          label={metric.label}
                        />
                      );
                    })}
                  </FormGroup>
                </FormControl>
              </Grid>
            </Grid>
            <Grid
              item
              container
              direction="row"
              xs={3}
              className={globalClasses.verticalAlignCenter}
            >
              <Typography className={globalClasses.marginHorizontal}>
                Time format
              </Typography>
              <Grid item xs={5}>
                <Select
                  options={timeFormats}
                  value={props.selectedTimeFormat}
                  onChange={onTimeFormatChange}
                />
              </Grid>
            </Grid>
            <Grid
              item
              container
              direction="row"
              xs={4}
              className={globalClasses.verticalAlignCenter}
            >
              <Typography className={globalClasses.marginHorizontal}>
                Time period
              </Typography>
              <Grid item xs={8}>
                <DateRangePicker
                  disableType="disableFuture"
                  startDate={props.startDate}
                  endDate={props.endDate}
                  focusedInput={focusedInput}
                  onDatesChange={onDatesChange}
                  onFocusChange={onFocusChange}
                  weeklySelection={true}
                />
              </Grid>
            </Grid>
          </Grid>
        )}
      </Paper>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginTop}`}
      >
        <Button
          variant="contained"
          color="primary"
          id="filterBtn"
          onClick={openClusterNameModalFunc}
        >
          Apply
        </Button>
        <Button
          variant="outlined"
          id="resetBtn"
          onClick={() => settriggerReset(!triggerReset)}
        >
          Reset
        </Button>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    selectedMetric: state.productGroupReducer.selectedObjectiveMetric,
    selectedTimeFormat: state.productGroupReducer.selectedObjectiveTimeFormat,
    initialMetricFilters: state.productGroupReducer.initialProdMetricFilters,
    startDate: state.productGroupReducer.metricStartDate,
    endDate: state.productGroupReducer.metricEndDate,
  };
};
const mapActionsToProps = {
  ToggleLoader,
  getAllFilters,
  getFiltersValues,
  setSelectedFilters,
  getMetrics,
  setSelectedObjectiveMetric,
  setSelectedObjectiveTimeFormat,
  addSnack,
  setSelectedProducts,
  submitClusterJob,
  setTableState,
  setProdGrpFilteredCols,
  getColumnsAg,
  setMetricStartDate,
  setMetricEndDate,
  setProdGroupFilteredProds,
  setInitialMetricFilters,
  fetchRequestInfo,
  fetchProdGrpFilteredProducts,
  setSelectedCluster,
  setResetFilterTable,
};
export default connect(mapStateToProps, mapActionsToProps)(ObjectiveGroup);

const ClusterName = (props) => {
  return (
    <>
      <Dialog
        id="productGrpingGrpNameDialog"
        open={props.open}
        fullWidth={true}
        maxWidth={"sm"}
        onClose={props.handleClose}
        aria-labelledby="form-dialog-title"
        onBackdropClick="false"
      >
        {props.showLoader && <LinearProgress />}
        <DialogTitle id="form-dialog-title">Enter Cluster name</DialogTitle>
        <DialogContent>
          <TextField
            id="productGrpingGrpClusterNameInp"
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
            id="productGrpingGrpDfnNameCnclBtn"
          >
            Cancel
          </Button>
          <Button
            disabled={props.showLoader}
            onClick={props.submitClusterRequest}
            color="primary"
            id="productGrpingGrpDfnNameSaveBtn"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
