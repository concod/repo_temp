import React, { useState, useEffect, useRef } from "react";
import { connect, useSelector } from "react-redux";
import { Select } from "./Select";
import { find, indexOf, isEmpty, isNull } from "lodash";
import Paper from "@mui/material/Paper";
import { Button, Alert as ImpactAlert, Tooltip, Badge } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { setSelectedFilters } from "../../actions/filterAction";
import { Snackbar, Typography } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import FilterGroupFormWrapper from "./filterGroupFormWrapper";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import FilterUploadStrip from "./filterUpload";
import FilterUploadSection from "./filterUpload/FilterUploadSection";
import FilterClipBoardSection from "./filterUpload/FilterClipBoardSection";
import { formatCrossDimensionCascadedFilters } from "./utlis";
import { getItemFromLastIndexForArray } from "core/Utils/utils";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <ImpactAlert elevation={6} ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  button: {
    marginLeft: "0.6rem",
    textTransform: "none",
  },
  maxWidth: {
    maxWidth: "200px",
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
  action: {
    flex: "1rem",
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: pxToRem(19),
    marginTop: pxToRem(25),
    gap: pxToRem(6),
    alignItems: "end",
  },
  filterChildren: {
    minWidth: "16rem",
  },
  paddingBottom_16: {
    padding: "0px 0px 16px 0px",
  },
  heading: {
    fontSize: "1rem",
    fontWeight: 800,
    color: theme.palette.text.black,
    lineHeight: "1.5rem",
    marginRight: "0.75rem",
  },
  horizontalLine: {
    width: "100%",
    height: pxToRem(1),
    background: colours.geyser,
    marginTop: pxToRem(36),
  },
}));
const ProductFilterGroup = (props) => {
  const [selected, setSelected] = useState(props.inititalSelection || []);
  const [dependencyChange, setDependency] = useState(false);
  const [warningPopup, setWarningPopup] = useState(false);
  const [resetOptions, setResetOptions] = useState(false);
  const [clearAllButtonMarginTop, setClearAllButtonMarginTop] = useState(0);
  const firstTimeRender = useRef(true);
  const clearAllButtonRef = useRef(null);
  const filterGroupRef = useRef(null);
  const isPlansmartFilter = props.className === "plansmart-filter";
  const globalClasses = globalStyles();
  const classes = useStyles();
  const { enableFilterUpload=false } = useSelector(
    (state) =>
      state?.tenantUserRoleMgmtReducer?.userRoleManagementReducer
  );
  // const [customFilter, setCustomFilter] = useState( || false);
  const [selectedFilterChoice, setSelectedFilterChoice] = useState(
    `${props.filterLabel} heirarchy`
  );

  const SCREENS_TO_HIDE_RESET_BUTTON = [
    "allocation-forecast-screen-custom-0",
    "excess-inv-reports-screen-custom-0",
    "lost-sales-custom-0",
  ];
  const CUSTOM_DIMENSION = "custom";

  useEffect(() => {
    setSelectedFilterChoice(`${props.filterLabel} heirarchy`);
  }, [props.filterLabel]);

  useEffect(() => {
    if (props.inititalSelection) {
      setSelected(props.inititalSelection);
      let obj = {};
      obj[props.screen] = props.inititalSelection;
      // props.setProductStatusData(obj);
    }
  }, [props.inititalSelection]);

  const updateDependency = (key, params) => {
    let emptyParams = false;
    if (
      key.display_type === "rangePicker" &&
      isNull(params[0]) &&
      isNull(params[1])
    ) {
      emptyParams = true;
    }
    //updated selected with the values
    if (!isEmpty(params) && !emptyParams) {
      updateSelected(key, params);
      setDependency(true);
    } else if (
      key.display_type === "BooleanField" ||
      key.display_type === "sliderRange"
    ) {
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
    let isCrossDimensionCascading = false;
    let currentFiltersScreen = props?.screen;
    let crossDimensionCascadingFilters = [];
    
    // Generic dimension handling: Get dimension from key
    const dimension = key.dimension || key?.extra?.dimension;
    
    if (dimension) {
      // Try to get from generic dimensionHierarchies first
      if (props.dimensionHierarchies && props.dimensionHierarchies[dimension]) {
        cascadedFilterLevel = props.dimensionHierarchies[dimension];
      } 
      // Fallback to legacy specific properties for backward compatibility
      else {
        const legacyPropertyName = `${dimension}DimensionHierarchy`;
        if (props[legacyPropertyName]) {
          cascadedFilterLevel = props[legacyPropertyName];
        }
      }
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
      if (!isEmpty(key?.extra?.attributes)) {
        isCrossDimensionCascading = true;
        let crossCascadingDimensions = key?.extra?.attributes.filter(
          (attr) => attr.dimension !== key.dimension
        );
        crossCascadingDimensions.forEach((attr) => {
          let filterScreenName = currentFiltersScreen.replace(
            key?.dimension,
            attr?.dimension
          );
          if (!isEmpty(props.selectedFilters?.[filterScreenName])) {
            let selectedCrossDimensionCascadedFilter =
              props.selectedFilters?.[filterScreenName]?.[0];
            crossDimensionCascadingFilters.push(
              formatCrossDimensionCascadedFilters(
                selectedCrossDimensionCascadedFilter
              )
            );
          }
        });
      }
      if (props.update && key.dimension === "product_store") {
        await props.update(newSelected, key, selectedFiltersObj);
      } else if (props.update) {
        if (isCrossDimensionCascading) {
          crossDimensionCascadingFilters.forEach(async (filter) => {
            await props.update([], filter, {});
          });
        }
        let selectedFiltersObj = isCrossDimensionCascading ? {} : null;
        await props.update(newSelected, key, selectedFiltersObj);
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
    let isCrossDimensionCascading = false;
    let crossCascadingDimensions = [];
    let crossCascadingScreenNames = [];
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
    if(props.filters && props.filters.length > 0) {
      props.filters.some((filter) => {
        if(filter?.extra?.attributes) {
          isCrossDimensionCascading = true;
          crossCascadingDimensions = filter?.extra?.attributes
            .filter((attr) => attr.dimension !== props?.dimension)
            .map((attr) => attr.dimension);
          return true;
        }
        return false;
      })
    }
    if (isCrossDimensionCascading) {
      Object.keys(props?.selectedFilters).forEach((key) => {
        let filterDimension = getItemFromLastIndexForArray(key.split("-"), 2);
        if (crossCascadingDimensions.indexOf(filterDimension) !== -1) {
          crossCascadingScreenNames.push(key);
        }
      });
      crossCascadingScreenNames.forEach((screenName) => {
        obj[screenName] = [];
      });
    }
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
      if (isCrossDimensionCascading) {
        crossCascadingDimensions.forEach(async (dimension) => {
          await props.update(
            [],
            {
              dimension: dimension,
            },
            {}
          );
        });
      }
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
      displayMessage("Please select the required fields");
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

  useEffect(() => {
    if (
      !props.alignClearButton ||
      !props.showResetButton ||
      !props.filters?.length
    ) {
        return;
    }

    const runClearAllAlignment = () => {
      const filterGroupElement = filterGroupRef.current;
      const clearAllButtonElement = clearAllButtonRef.current;
      if (!filterGroupElement || !clearAllButtonElement) return;

      const dimensionSection = filterGroupElement.closest(".dimension-section");
      const filterBtnGroup = document.querySelector(".filter-button-group")
      const alignmentAnchor = dimensionSection?.firstElementChild || filterBtnGroup;
      if (!alignmentAnchor) return;

      const prevInlineMarginTop = clearAllButtonElement.style.marginTop;
      clearAllButtonElement.style.marginTop = "0px";
      const baseTop = clearAllButtonElement.getBoundingClientRect().top;
      clearAllButtonElement.style.marginTop = prevInlineMarginTop;

      const nextMarginTop = Math.min(
        0,
        Math.round(alignmentAnchor.getBoundingClientRect().top - baseTop)
      );

      setClearAllButtonMarginTop((prev) => (prev === nextMarginTop ? prev : nextMarginTop));
    };

    runClearAllAlignment();

  }, [
    props.alignClearButton,
    props.showResetButton,
    props.filters?.length,
    props.disableFilterModal,
    props.formGroupHeader,
    props.filterLabel,
    props.screen,
    props.dimension,
    props.firstTimeRenderLoader,
  ]);

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
      ref={filterGroupRef}
      className={isPlansmartFilter ? classes.plansmartFilterWrapper : ""}
    >
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${classes.paddingBottom_16} ${props?.formGroupHeader && props?.isFormComponent && " disable-top-padding"} product-filter-group-container`}
      >
        {props?.formGroupHeader && props?.isFormComponent && <Typography className={classes.heading}>
          {props?.formGroupHeader}
        </Typography>}
        <div
          className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
        >
          {!props.disableFilterModal && (
            <Typography className={classes.heading}>
              {/* {props.isEditModalOpen ? "Edit Filters" : props.filterLabel} */}
              {props.filterLabel}
            </Typography>
          )}
          {props.filterSelected && !props.disableFilterModal && (
              <div className={classes.maxWidth}>
                <Badge
                  label={props.filterSelected}
                  color={"info"}
                  variant={"stroke"}
                />
              </div>
          )}
        </div>
        {props.showResetButton
          ? props.filters?.length > 0 && (
              <div
                ref={clearAllButtonRef}
                style={{
                  ...(props.alignClearButton && {
                  alignSelf: "flex-start",
                  marginTop: `${clearAllButtonMarginTop || 0}px`,
                 }),
                }}
              >
                <Button
                  size="large"
                  variant="text"
                  id="resetBtn"
                  disabled={props.disabledDropdown}
                  onClick={() => handleReset()}
                >
                  Clear All
                </Button>
              </div>
            )
          : ""}
      </div>
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
          <div>
            <Alert
              onClose={handleWarningClose}
              severity="info"
              description="There is no data for these filters. Please try with a new combination."
            />
          </div>
        </Snackbar>
        {props.enableFilterUpload && enableFilterUpload && (
          <FilterUploadStrip
            props={{
              heirarchy: props.filterLabel,
              selectedFilterChoice,
              setSelectedFilterChoice,
            }}
          />
        )}
        {selectedFilterChoice === `${props.filterLabel} heirarchy` && (
          <>
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
                handleResetFlag={props?.handleResetFlag}
                handleReset={handleReset}
                updateDependency={updateDependency}
                filters={props.filters}
                inititalSelection={selected}
                resetOptions={resetOptions}
                disabledFields={props.disabledDropdown}
                dependencyChange={dependencyChange}
                disableFilterModal={props.disableFilterModal}
                withPortal={props?.withPortal}
                isFormComponent={props?.isFormComponent}
              ></FilterGroupFormWrapper>
            )}
          </>
        )}
        {selectedFilterChoice === "Upload Excel" && (
          <FilterUploadSection
            props={{
              screenName: props?.screenName,
              filterConfigKey: props?.filterConfigKey,
            }}
          />
        )}
        {selectedFilterChoice === "Copy and Paste" && (
          <FilterClipBoardSection />
        )}
        {!props.customFilterOrderTop && props.customComponent}
        {props.customFilter
          ? ""
          : props.filters?.length > 0 && (
              <>
                <div className={classes.horizontalLine} />

                <div
                  className={`actionButtons ${
                    !isPlansmartFilter ? classes.action : ""
                  }`}
                >
                  <>
                    <Button
                      variant="text"
                      id="resetBtn"
                      className={classes.button}
                      disabled={props.disabledDropdown}
                      onClick={() => handleReset()}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="primary"
                      className={classes.button}
                      id="filterBtn"
                      disabled={props.disabledDropdown}
                      onClick={onFilter}
                    >
                      Filter
                    </Button>
                  </>
                </div>
              </>
            )}
        {/* {props.showResetButton &&
          props.filters?.length > 0 &&
          !(
            props.dimension === CUSTOM_DIMENSION &&
            SCREENS_TO_HIDE_RESET_BUTTON.includes(props.screen)
          ) &&
          !props.disableFilterModal && (
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
          )} */}
      </div>
    </Paper>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    // Generic dimension hierarchies - supports any dimension dynamically
    dimensionHierarchies:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .dimensionHierarchies,
    // Legacy properties - kept for backward compatibility
    productDimensionHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .productDimensionHierarchy,
    storeDimensionHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .storeDimensionHierarchy,
    vendorDimensionHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .vendorDimensionHierarchy,
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
