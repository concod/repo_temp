import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Select } from "./Select";
import { find, indexOf, isEmpty } from "lodash";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import makeStyles from "@mui/styles/makeStyles";
import { setSelectedFilters } from "../../actions/filterAction";
import { Snackbar } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import FilterGroupFormWrapper from "./filterGroupFormWrapper";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const useStyles = makeStyles((theme) => ({
  button: {
    marginLeft: "0.6rem",
    textTransform: "none",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    border: "1px solid #e3ecf4",
  },
  plansmartFilterRow: {
    border: "none",
    display: "flex",
    flexWrap: "wrap",
  },
  plansmartFilterWrapper: {
    width: "100%",
  },
  plansmartLabel: {
    display: "block",
    alignSelf: "flex-start",
    color: theme.palette.colours.labelColour,
    textTransform: "capitalize",
    marginBottom: theme.spacing(1),
    ...theme.typography.body2,
  },
  action: {
    flex: "1rem",
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "1rem",
    marginTop: "2rem",
    alignItems: "end",
  },
  filterChildren: {
    minWidth: "16rem",
  },
  requiredField: {
    color: theme.palette.error.main,
    marginLeft: theme.typography.pxToRem(2),
  },
}));
const ProductFilterGroup = (props) => {
  const [selected, setSelected] = useState(props.inititalSelection || []);
  const [dependencyChange, setDependency] = useState(false);
  const [warningPopup, setWarningPopup] = useState(false);
  const [resetOptions, setResetOptions] = useState(false);
  const firstTimeRender = useRef(true);
  const isPlansmartFilter = props.className === "plansmart-filter";
  const globalClasses = globalStyles();
  const classes = useStyles();
  // const [customFilter, setCustomFilter] = useState( || false);

  useEffect(() => {
    if (props.inititalSelection) {
      setSelected(props.inititalSelection);
      let obj = {};
      obj[props.screen] = props.inititalSelection;
      // props.setProductStatusData(obj);
    }
  }, [props.inititalSelection]);

  const updateDependency = (key, params) => {
    //updated selected with the values
    if (!isEmpty(params)) {
      updateSelected(key, params);
      setDependency(true);
    } else if (key.display_type === "BooleanField") {
      updateSelected(key, params);
      setDependency(true);
    } else {
      removeSelected(key, params);
    }
    setResetOptions(false);
  };

  const updateSelected = async (key, params) => {
    let newValue = {
      ...key,
      values: params,
    };
    let newSelected = [...selected];
    var match = find(newSelected, { filter_id: key.filter_id });
    if (match) {
      let index = indexOf(newSelected, match);
      newSelected.splice(index, 1, newValue);
    } else {
      newSelected = [...selected, newValue];
      setSelected(newSelected);
    }
    setSelected(newSelected);
    if (props.update) await props.update(newSelected, key);
    let obj = {};
    obj[props.screen] = newSelected;
    props.setProductStatusData(obj);
  };

  const removeSelected = async (key, params) => {
    let cascadedFilterLevel = [];
    if (key.dimension === "product" || key?.extra?.dimension === "product") {
      cascadedFilterLevel = props.productDimensionHierarchy;
    } else if (key.dimension === "store" || key?.extra?.dimension === "store") {
      cascadedFilterLevel = props.storeDimensionHierarchy;
    }
    let newSelected = [...selected];

    var match = find(newSelected, { filter_id: key.filter_id });
    if (match) {
      let index = indexOf(newSelected, match);
      newSelected.splice(index, 1);
      let selectedFiltersObj = { ...props.selectedFilters };
      if (key.dimension === "product_store" && key.is_mandatory) {
        let screenNameProd = props.screen.replace(key.dimension, "product");
        let screenNameStore = props.screen.replace(key.dimension, "store");
        selectedFiltersObj[screenNameProd] = [];
        selectedFiltersObj[screenNameStore] = [];
        props.setProductStatusData(selectedFiltersObj);
      }
      const positionInFilterLevel = cascadedFilterLevel.indexOf(key.filter_id);
      if (positionInFilterLevel !== -1) {
        const filterLevel = cascadedFilterLevel.slice(0, positionInFilterLevel);
        cascadedFilterLevel = cascadedFilterLevel.slice(positionInFilterLevel);

        if (!isEmpty(cascadedFilterLevel)) {
          // remove filter(s) lower in cascading order
          newSelected = newSelected.filter((filter) => {
            return (
              !cascadedFilterLevel.includes(filter.filter_id) &&
              filterLevel.includes(filter.filter_id)
            );
          });
        }
      }

      if (props.update && key.dimension === "product_store") {
        await props.update(newSelected, key, selectedFiltersObj);
      } else if (props.update) {
        await props.update(newSelected, key);
      }
      let obj = {};
      obj[props.screen] = newSelected;
      props.setProductStatusData(obj);
      setSelected(newSelected);
    }
  };

  const handleWarningClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setWarningPopup(false);
  };

  const displayMessage = (message, type = "error") => {
    props.addSnack({
      message: message,
      options: {
        variant: type,
      },
    });
  };

  const handleReset = async (dimension = "") => {
    props.onReset && (await props.onReset());
    if (props.resetFilterChips) {
      props.setFilterDependencyChips([]);
    }
    setSelected([]);
    setResetOptions(true);
    const currentDimension = dimension ? dimension : props.dimension;
    let obj = { ...props.selectedFilters };
    if (currentDimension === "product_store") {
      let screenNameProd = props.screen.replace(currentDimension, "product");
      let screenNameStore = props.screen.replace(currentDimension, "store");
      obj[screenNameProd] = [];
      obj[screenNameStore] = [];
    }
    obj[props.screen] = [];
    props.setProductStatusData(obj);
    if (currentDimension === "product_store") {
      await props.update(
        [],
        {
          dimension: currentDimension,
        },
        obj
      );
    } else {
      await props.update([], {
        dimension: currentDimension,
      });
    }
    setResetOptions(false);
  };

  const onFilter = async () => {
    let reqFieldsErr = false;
    for (const filter of props.filters) {
      const key = {
        filter_id: filter.column_name,
        filter_type: filter.type,
      };
      var match = find(selected, key);
      if (filter.is_mandatory && !match) {
        reqFieldsErr = true;
      }
    }
    if (reqFieldsErr) {
      displayMessage("Please select required fields");
      return;
    }
    let noDataPresent = await props.onFilter();
    if (noDataPresent) {
      setWarningPopup(true);
    }
  };

  useEffect(() => {
    if (props.resetOnLoad || (props.customFilter && !firstTimeRender.current)) {
      handleReset();
      props.update([]);
    }
  }, [props.resetFilter]);

  useEffect(() => {
    firstTimeRender.current = false;
  }, []);

  //render the type of filter
  ////initialData props used to send the options data
  const renderContent = (param, i) => {
    const getPreselectedOptions = () => {
      const initial = props.inititalSelection
        ? props.inititalSelection.filter(
            (select) => select.filter_id === param.filter_keyword
          )
        : [];
      if (initial.length > 0) {
        return initial[0].values;
      } else {
        return [];
      }
    };
    param.isClearable = param.is_clearable || true;
    param.isDisabled = param.is_disabled;
    return (
      <Select
        {...param}
        reset={resetOptions}
        dependency={selected}
        disabledDropdown={props.disabledDropdown}
        doNotUpdateDefaultValue={props.doNotUpdateDefaultValue}
        selectedOptions={getPreselectedOptions()}
        updation={dependencyChange}
        updateDependency={updateDependency}
        customPlaceholder={`${"Select"}${" "}${param.label}`}
      />
    );
  };

  return (
    <Paper
      elevation={0}
      className={isPlansmartFilter ? classes.plansmartFilterWrapper : ""}
    >
      <div
        className={
          isPlansmartFilter || !props.showBorderedWrapper
            ? classes.plansmartFilterRow
            : classes.filterRow
        }
        style={props.style}
      >
        <Snackbar
          open={warningPopup}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          autoHideDuration={6000}
          onClose={handleWarningClose}
        >
          <Alert
            onClose={handleWarningClose}
            severity="info"
            sx={{ width: "100%" }}
          >
            There is no data for these filters. Please try with a new
            combination.
          </Alert>
        </Snackbar>
        {props.children ? (
          <div data-testid="filtertype" className={classes.filterChildren}>
            {props.children}
          </div>
        ) : (
          ""
        )}
        {/* Adding custom filter on top if needed */}
        {props.customFilterOrderTop && props.customComponent}
        {props.filters && (
          <FilterGroupFormWrapper
            updateDependency={updateDependency}
            filters={props.filters}
            inititalSelection={selected}
            resetOptions={resetOptions}
            disabledFields={props.disabledDropdown}
            dependencyChange={dependencyChange}
          ></FilterGroupFormWrapper>
        )}
        {!props.customFilterOrderTop && props.customComponent}
        {props.customFilter
          ? ""
          : props.filters?.length > 0 && (
              <div className={!isPlansmartFilter ? classes.action : ""}>
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    id="filterBtn"
                    disabled={props.disabledDropdown}
                    onClick={onFilter}
                  >
                    Filter
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    id="resetBtn"
                    className={classes.button}
                    disabled={props.disabledDropdown}
                    onClick={() => handleReset()}
                  >
                    Reset
                  </Button>
                </>
              </div>
            )}
        {props.showResetButton
          ? props.filters?.length > 0 && (
              <div className={!isPlansmartFilter ? classes.action : ""}>
                <Button
                  variant="outlined"
                  color="primary"
                  id="resetBtn"
                  className={classes.button}
                  disabled={props.disabledDropdown}
                  onClick={() => handleReset()}
                >
                  Reset
                </Button>
              </div>
            )
          : ""}
      </div>
    </Paper>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    productDimensionHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .productDimensionHierarchy,
    storeDimensionHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .storeDimensionHierarchy,
    selectedFilters: state.filterReducer.selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setSelectedFilters(data)),
    addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ProductFilterGroup);
