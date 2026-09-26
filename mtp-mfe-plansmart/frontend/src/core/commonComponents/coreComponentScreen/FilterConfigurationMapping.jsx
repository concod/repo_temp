import {
  Button,
  Typography,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
} from "@mui/material";
import { isEmpty, find, cloneDeep, uniqBy, toNumber, isNil } from "lodash";
import { useState, useRef } from "react";
import { connect } from "react-redux";
import {
  getSelectedFiltersFromConfig,
  requiredFieldCheck,
  updateDependencyData,
} from "./utils";
import {
  getUamFilterDependency,
  getRequiredFilterList,
  updateFilterDimension,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  setIsFilterApplied,
  setSavedFiltersList,
} from "core/actions/filterAction";
import globalStyles from "core/Styles/globalStyles";
import FilterGroupSection from "./FilterGroupSection";
import {
  setFilterConfiguration,
  setSavedFilterData,
  resetFilterConfiguration,
  saveFilterUserConfiguration,
  updateFilterUserConfiguration,
} from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import useKeyboardShortcut from "core/Utils/keyboard-shorcuts";

const FilterConfigurationMapping = (props) => {
  const globalClasses = globalStyles();
  const {
    filterSelected,
    setFilterDependencyChips,
    filterSectionRadio,
    setFilterSectionRadio,
    setOpenModal,
    setIsEditModalOpen,
    hideFilterActions,
    keyboardShortcuts,
  } = props;

  // Filter Variables
  const [showFilterLoader, setShowFilterLoader] = useState(false);
  const [mappingKeys, setMappingKeys] = useState({});
  const filterButtonRef = useRef(null);

  // Use the custom hook to listen for keyboards shortcut
  const shortcuts = [
    {
      shortcutKey: keyboardShortcuts?.filters?.applyFilter,
      callback: () => {
        if (filterButtonRef.current) {
          filterButtonRef.current?.click();
        }
      },
    },
  ];
  useKeyboardShortcut(shortcuts);

  const onSaveFilterClickHandler = async (filterData) => {
    try {
      let filterDependency = getFilterSelectionDependency();
      const screenName = props.filterDashboardConfiguration[0].screen_name;
      const savedFilterScreenName =
        props.filterDashboardConfiguration?.[0]?.saved_filter_screen_name;

      // required check is ignoted if config type is global and no filter is selected- saved filter reset
      if (!(props.filterConfigType === "global" && isEmpty(filterDependency))) {
        // mandatory fields filled check
        if (!requiredFieldCheck(filterData, filterDependency)) {
          throw Error("Please select required fields");
        }
      }

      if (props.filterSaveLevel === "mandatory") {
        filterDependency = getRequiredFilterList(filterData, filterDependency);
      }

      if (props.containsCustomFilterSection) {
        const { customFilterData, customFilterDependency } =
          props.getCustomFilterDataAndDependency();
        filterData = [...filterData, ...customFilterData];
        filterDependency = [...filterDependency, ...customFilterDependency];
      }
      filterDependency = updateFilterDimension(
        cloneDeep(filterDependency),
        filterData,
        false,
        true
      );
      const allSavedFilterSelection = uniqBy(
        [...filterDependency],
        (obj) => obj.attribute_name + obj.dimension
      );

      if (props.filterConfigType === "global") {
        await saveFilterUserConfiguration({
          saved_filter_preference: allSavedFilterSelection,
        });
      } else {
        if (filterSelected !== "") {
          let updatedFilterConfig = {};
          let filterCode = null;
          let copySavedFilterList = cloneDeep(props.savedFilterDashboard);
          copySavedFilterList = copySavedFilterList.map((filter) => {
            if (filter.name === filterSelected) {
              updatedFilterConfig = {
                name: filter.name,
                screen_name:
                  filter?.screen_code === 3
                    ? "All"
                    : savedFilterScreenName
                    ? savedFilterScreenName
                    : screenName,
                is_default: props.isFilterSaveGlobal ? true : filter.is_default,
                saved_filter_preference: allSavedFilterSelection,
                is_broadcast: filter?.is_broadcast,
              };
              filterCode = filter.fuc_code;
              filter.saved_filter_preference = allSavedFilterSelection;
            }

            return filter;
          });
          props.setSavedFiltersList(copySavedFilterList);

          await updateFilterUserConfiguration(filterCode, updatedFilterConfig);
        } else {
          if (props.savedFilterDashboard?.length === props.filterSaveLimit) {
            displaySnackMessages(
              `User cannot create more than ${props.filterSaveLimit} filter views. Please delete any of the existing views before saving new view`,
              "warning"
            );
          } else {
            setIsEditModalOpen(true);
          }
          return;
        }
      }

      displaySnackMessages("Successfully saved filter selection", "success");

      if (props.filterConfigType === "global") {
        props.setSavedFilterData(allSavedFilterSelection);
        // reset filterconfiguration as that modules set the new saved filter on mount
        let updatedFilterDashboardConfigurationObj = cloneDeep(
          props.filterDashboardConfigurationObj
        );
        // setting filterDashboardData to originalFilterDashboardData so we dont have to re-create filter config
        updatedFilterDashboardConfigurationObj.filterConfig[0].originalFilterDashboardData =
          updatedFilterDashboardConfigurationObj.filterConfig[0].filterDashboardData;
        let obj = {};
        obj[props.filterConfigKey] = updatedFilterDashboardConfigurationObj;
        props.resetFilterConfiguration(obj);
      }
    } catch (err) {
      displaySnackMessages(err.message || "Something went wrong", "error");
    }
  };

  const onFilterClickHandler = async (
    filterData,
    customOnFilterFunc,
    customFilterDependency = []
  ) => {
    try {
      const shouldUpdateDimension =
        props.filterDashboardConfiguration[0].update_filter_dimension_on_apply;
      let dependencyData = getFilterSelectionDependency();

      if (!requiredFieldCheck(filterData, dependencyData)) {
        throw Error("Please select required fields");
      }

      // updating applied filters data in filter configuration
      updateFilterAppliedData();
      props.setIsFilterApplied(true);
      let filterDependency = [];
      let customDependency = [];
      if (!isEmpty(customFilterDependency)) {
        customFilterDependency.forEach((dependency) => {
          if (dependency?.extra?.include_in_filter_dependency) {
            customDependency.push(updateDependencyData(dependency));
          }
        });
      }
      dependencyData = [...dependencyData, ...customDependency];
      if (!props.noUAMFilterDependency) {
        const disableUamOnApply =
          props.filterDashboardConfiguration[filterSectionRadio]
            .disableUamOnApply;

        if (!disableUamOnApply) {
          //Get UAM filters if there is UAM filter dependency & pass those filters to Filter function
          const screenName = props.filterDashboardConfiguration[0].screen_name;
          const expectedFilterDimensions =
            props.filterDashboardConfiguration[0].expectedFilterDimensions;
          setShowFilterLoader(true);
          filterDependency = await getUamFilterDependency(
            dependencyData,
            screenName,
            expectedFilterDimensions
          );
          setShowFilterLoader(false);
        } else {
          filterDependency = dependencyData;
        }

        // Replace attribute name for the selected dependency with the mappedKeys value
        if (!isEmpty(mappingKeys))
          filterDependency = filterDependency.map((item) => {
            if (Object.keys(mappingKeys).includes(item.attribute_name)) {
              return {
                ...item,
                attribute_name: mappingKeys[item.attribute_name],
                filter_id: mappingKeys[item.attribute_name],
              };
            } else return item;
          });
        dependencyData = filterDependency;
      }
      //Pass the selected filters to filter function
      if (!isNil(shouldUpdateDimension) && !shouldUpdateDimension) {
        customOnFilterFunc(dependencyData, filterData, filterSectionRadio);
      } else {
        //Pass the selected filters to filter function
        customOnFilterFunc(
          updateFilterDimension(dependencyData, filterData, false, true),
          updateFilterDimension(filterData, filterData, true),
          filterSectionRadio
        );
      }
      setOpenModal(false);
    } catch (err) {
      displaySnackMessages(err.message || "Something went wrong", "error");
    }
  };

  const updateFilterAppliedData = () => {
    let updatedFilterConfigurations = cloneDeep(
      props.filterDashboardConfiguration
    );
    let updatedAppliedFilter = cloneDeep(props.appliedFilterData);
    updatedFilterConfigurations.forEach((item, index) => {
      if (
        index == filterSectionRadio ||
        updatedFilterConfigurations?.length === 1
      ) {
        updatedAppliedFilter.dependencyData = getFilterSelectionDependency();
        updatedAppliedFilter.filterHeader = filterSectionRadio;
      }
    });

    let obj = {};
    obj[props.filterConfigKey] = {
      filterConfig: updatedFilterConfigurations,
      appliedFilterData: updatedAppliedFilter,
    };
    props.setFilterConfiguration(obj);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getFilterSelectionDependency = () => {
    return getSelectedFiltersFromConfig(
      props.filterDashboardConfiguration,
      filterSectionRadio,
      props.filterReducer
    );
  };

  const renderEmptyFilterConf = () => {
    return (
      <Typography variant="body1" component="p" color="error">
        Please configure filters for this screen.
      </Typography>
    );
  };

  return (
    <div>
      <>
        {props.filterDashboardConfiguration?.length > 1 && (
          <FormControl>
            <RadioGroup
              aria-labelledby="filter-group-radio"
              value={filterSectionRadio}
              name="filter-group-radio"
              row
              onChange={(event) => {
                const sectionIndex = toNumber(event.target.value) || 0;
                setFilterSectionRadio(sectionIndex);
              }}
            >
              {props.filterDashboardConfiguration?.map((filter, index) => {
                return (
                  <FormControlLabel
                    value={index}
                    control={<Radio />}
                    label={filter.filterSectionHeader}
                  />
                );
              })}
            </RadioGroup>
          </FormControl>
        )}
        {props.filterDashboardConfiguration?.length
          ? props.filterDashboardConfiguration?.map((filter, index) => {
              return (
                (filterSectionRadio == index ||
                  props.filterDashboardConfiguration?.length === 1) && (
                  <div>
                    <>
                      {props.customTopComponent}

                      {filter.filterDashboardClassification.length
                        ? filter.filterDashboardClassification?.map((item) => {
                            return (
                              <FilterGroupSection
                                {...props}
                                item={item}
                                filter={filter}
                                setMappingKeys={setMappingKeys}
                                setFilterDependencyChips={
                                  setFilterDependencyChips
                                }
                                setShowFilterLoader={setShowFilterLoader}
                                showFilterLoader={showFilterLoader}
                                filterSectionRadio={filterSectionRadio}
                              />
                            );
                          })
                        : renderEmptyFilterConf()}
                      {props.customBottomComponent}
                    </>
                    {Boolean(filter.filterDashboardClassification?.length) &&
                      !hideFilterActions && (
                        <div
                          className={`${globalClasses.flexRow} ${globalClasses.gap}`}
                        >
                          <Button
                            variant="contained"
                            color="primary"
                            id="saveFilterBtn"
                            disabled={props.disableFilters || showFilterLoader}
                            onClick={() =>
                              onSaveFilterClickHandler(
                                filter.filterDashboardData
                              )
                            }
                          >
                            Save Filter
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            id="filterBtn"
                            ref={filterButtonRef}
                            disabled={props.disableFilters || showFilterLoader}
                            onClick={() =>
                              onFilterClickHandler(
                                filter.filterDashboardData,
                                props.onApplyFilter,
                                filter?.filterFetchCustomDependency
                              )
                            }
                          >
                            Apply Filter
                          </Button>
                        </div>
                      )}
                  </div>
                )
              );
            })
          : renderEmptyFilterConf()}
      </>
    </div>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    filterDashboardConfigurationObj:
      state.filterReducer.filterDashboardConfiguration[
        ownProps.filterConfigKey
      ],
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[ownProps.filterConfigKey]
        ?.filterConfig,
    appliedFilterData:
      state.filterReducer.filterDashboardConfiguration[ownProps.filterConfigKey]
        ?.appliedFilterData,
    selectedFilters: state.filterReducer.selectedFilters,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    savedFilterDashboard: state.filterReducer.savedFilterDashboard,
    filterSaveLevel:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.filterSaveLevel,
    filterConfigType:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .filterConfigType,
    filterSaveLimit:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.filterSaveLimit,
    filterReducer: state.filterReducer,
    isFilterSaveGlobal:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .isFilterSaveGlobal,
    keyboardShortcuts: state.tenantConfigReducer?.keyboardShortcuts,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setSavedFilterData: (data) => dispatch(setSavedFilterData(data)),
    resetFilterConfiguration: (data) =>
      dispatch(resetFilterConfiguration(data)),
    setSavedFiltersList: (data) => dispatch(setSavedFiltersList(data)),
    setIsFilterApplied: (data) => dispatch(setIsFilterApplied(data)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FilterConfigurationMapping);
