import {
  isEmpty,
  cloneDeep,
  isArray,
  uniqBy,
  isNil,
  find,
  isEqual,
  pick,
  union,
  omit,
} from "lodash";
import { useEffect, useState, useRef, useCallback } from "react";
import globalStyles from "core/Styles/globalStyles";
import FilterChips from "core/commonComponents/filters/filterChips";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import LoadingOverlay from "core/Utils/Loader/loader";
import makeStyles from "@mui/styles/makeStyles";
import { connect } from "react-redux";
import {
  mapDataToLabel,
  getSelectedFiltersFromConfig,
  fetchFilterFieldData,
  getRequiredFilterList,
  requiredFieldCheck,
  displayErrorMessage,
  isFilterConfigurationMappingValid,
  getSelectionDependency,
  getCombinedFilterDashboardData,
  disableNonMandatoryFieldsAction,
  sortSavedFiltersUtility,
  getMappedKeyForFilter,
  getFilterElements,
  getFilterFetchCustomDependency,
  updateFilterDimension,
} from "./utils";
import {
  setFilterConfiguration,
  setSelectedFilters,
  resetFilterConfiguration,
  getFilterUserConfiguration,
  saveFilterUserConfiguration,
  updateFilterUserConfiguration,
  deleteFilterUserConfiguration,
  setSavedSelectedFilter,
} from "core/actions/filterAction";
import SavedFiltersSection from "./SavedFiltersSection";
import { setSavedFiltersList } from "core/actions/filterAction";
import FilterConfigurationMapping from "./FilterConfigurationMapping";
import { addSnack } from "core/actions/snackbarActions";
import { Select, Input } from "impact-ui";
import { savedFiltersSortOptions } from "./constants";
import { debounce } from "lodash";
import Divider from "@mui/material/Divider";
import { Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import { useLocation } from "react-router-dom-v5-compat";
import { isTextInputValid } from "core/Utils/form/form-helpers";

const useStyles = makeStyles(() => ({
  filterSearchDivStyle: {
    width: "100%",
    maxWidth: pxToRem(500),
    "& .input-container": {
      width: "100%",
      maxWidth: pxToRem(313),
      height: pxToRem(35),
    },
    "& .MuiTypography-body1": {
      marginLeft: pxToRem(7),
    },
    "& .MuiDivider-root": {
      marginLeft: pxToRem(10),
      border: `${pxToRem(0.7)} solid ${colours.silverChalice}`,
    },
  },
  defaultCircleStyle: {
    width: pxToRem(20),
    height: pxToRem(20),
    background: colours.bleachWhite,
    border: `${pxToRem(1)} solid ${colours.webOrange}`,
    borderRadius: "50%",
  },
  defaultDivStyle: {
    marginLeft: pxToRem(10),
  },
  activeDivStyle: {
    marginLeft: pxToRem(25),
  },
}));

const FilterDashobardSection = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const { openModal, setOpenModal, disableFilterModal, apiEndPoint } = props;
  let location = useLocation();
  const firstTimeRender = useRef(true);
  const [defaultFilterLoaded, setDefaultFilterLoaded] = useState(false);
  const inValidMappingWarning = useRef(true);
  const filterDashboardDataRef = useRef([]);
  const filterDependencyDataRef = useRef([]);
  const appliedFilterDataRef = useRef({});

  // Filter Variables
  const [filterDependencyChips, setFilterDependencyChips] = useState([]);
  const [filterSectionRadio, setFilterSectionRadio] = useState(0);
  const [filterSelected, setFilterSelected] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showFilterLoader, setShowFilterLoader] = useState(false);
  const [firstTimeRenderLoader, setFirstTimeRenderLoader] = useState(true);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentSortByOptions, setCurrentSortByOptions] = useState(
    savedFiltersSortOptions
  );
  const [selectedSortByOptions, setSelectedSortByOptions] = useState(
    savedFiltersSortOptions[0]
  );
  const [nameSearchVal, setNameSearchVal] = useState("");
  const [originalList, setOriginalList] = useState([]);

  // setting is defualt filters as selected on load before firstTimeRender is called
  useEffect(async () => {
    if (
      props.filterConfigType === "screen" &&
      !isEmpty(props.filterDashboardConfiguration) &&
      !defaultFilterLoaded
    ) {
      const {
        screen_name,
        saved_filter_screen_name,
      } = getFilterConfigurationData();
      const savedFilterUserConfig = await getFilterUserConfiguration(
        saved_filter_screen_name ? saved_filter_screen_name : screen_name
      );
      const defaultFilter = savedFilterUserConfig.find(
        (filter) => filter.is_default === true
      );
      setOriginalList(savedFilterUserConfig);
      props.setSavedFiltersList(
        sortSavedFiltersUtility(
          savedFilterUserConfig,
          selectedSortByOptions.value
        )
      );

      if (!isNil(defaultFilter)) {
        setFilterSelectedData(defaultFilter.name);
      }

      setDefaultFilterLoaded(true);
    } else if (props.filterConfigType !== "screen" && !defaultFilterLoaded) {
      setDefaultFilterLoaded(true);
    }
  }, [props.filterDashboardConfiguration]);

  const getCombinedCustomFilterDependency = (customFilterDependency) => {
    let combinedFilterDependency = [];

    !isEmpty(customFilterDependency) &&
      props.filterDashboardConfiguration?.[0]?.filterDashboardClassification.forEach(
        (item) => {
          if (!isNil(customFilterDependency[item.screenName])) {
            combinedFilterDependency = [
              ...combinedFilterDependency,
              ...customFilterDependency[item.screenName],
            ];
          }
        }
      );
    if (props?.updateCombinedCustomFilterDependency) {
      combinedFilterDependency = props?.updateCombinedCustomFilterDependency(
        combinedFilterDependency
      );
    }
    return combinedFilterDependency;
  };

  /**
   * on update in filter configuration we are updating the filter data and filter dependency ref-
   * which is used when updating filter data on filter dropdown data fetch action
   */
  useEffect(() => {
    const filterDashboardData =
      props.filterDashboardConfiguration?.[0]?.filterDashboardData;
    if (!isNil(filterDashboardData) && !isEmpty(filterDashboardData)) {
      filterDashboardDataRef.current = filterDashboardData;
    }
    const filterDependency = getFilterSelectionDependency();
    filterDependencyDataRef.current = filterDependency;
  }, [props.filterDashboardConfiguration, filterSelected]);

  useEffect(async () => {
    try {
      // saved filter selection is set only when filter dashboard is first rendered
      if (
        !isEmpty(props.filterDashboardConfiguration) &&
        firstTimeRender.current &&
        defaultFilterLoaded
      ) {
        const {
          screen_name,
          filterData,
          saved_filter_screen_name,
        } = getFilterConfigurationData();
        let savedFilterSelection = [];

        if (
          !isNil(props.customFilterDependency) &&
          !isEmpty(props.customFilterDependency) &&
          !props.preventFilterPreselection
        ) {
          savedFilterSelection = getCombinedCustomFilterDependency(
            props.customFilterDependency
          );
        } else if (!props.preventFilterPreselection) {
          if (props.filterConfigType === "screen" && filterSelected !== "") {
            let selectedFilterConfig = [];
            const savedFilterUserConfig = await getFilterUserConfiguration(
              saved_filter_screen_name ? saved_filter_screen_name : screen_name
            );
            setOriginalList(savedFilterUserConfig);
            props.setSavedFiltersList(
              sortSavedFiltersUtility(
                savedFilterUserConfig,
                selectedSortByOptions.value
              )
            );

            selectedFilterConfig =
              filterSelected !== "" &&
              savedFilterUserConfig.filter((item) => {
                return item.name === filterSelected;
              })?.[0]?.saved_filter_preference;

            savedFilterSelection = selectedFilterConfig
              ? selectedFilterConfig
              : [];
          } else if (props.filterConfigType === "global") {
            savedFilterSelection = props.savedFilterSelection;
          }
        }

        const filterDependencyPayload = cloneDeep(savedFilterSelection);
        savedFilterSelection = getSelectionDependency(savedFilterSelection);

        let isMappingInvalidBool = false;
        let mappingErrorMessageStr = "";
        let filterDataSet = cloneDeep(
          props.filterDashboardConfiguration[0]?.originalFilterDashboardData
        );

        // filter saved selection based on fields on dashboard
        savedFilterSelection = getRequiredFilterList(
          filterDataSet,
          savedFilterSelection,
          false
        );

        if (props.quickFilterLoad) {
          /**
           * 1. setting dropdownOpenCallback for data fetch action
           * 2. setting dropdown data using saved filters
           */

          // Function to fetch the super data set of the saved filters [All possible options for the current filter]
          const getFilterSuperSet = async () => {
            const savedFilterList = filterDataSet.filter((filterItem) => {
              return savedFilterSelection.some(
                (savedFilter) =>
                  filterItem.column_name === savedFilter.attribute_name
              );
            });
            // Adding column_name property to savedFilters
              const processedSavedFilter = savedFilterSelection.map(
                (filter) => {
                  return {
                    ...filter,
                    column_name: filter.attribute_name,
                  };
                }
              );
            const filterDashboardData = await getCombinedFilterDashboardData(
              updateFilterDimension(processedSavedFilter, filterDataSet), // Passing saved filters via updateFilterDimension function
              [],
              screen_name,
              apiEndPoint,
              props?.customDependencyValue              
            );
            return filterDashboardData;
          };
          let filterSuperSetData = {};
          if (savedFilterSelection.length !== 0) {
            filterSuperSetData = await getFilterSuperSet();
          }
          filterDataSet = filterDataSet.map((item) => {
            if (
              item.display_type === "dropdown" &&
              item.dimension !== "custom" &&
              item.dimension !== "others"
            ) {
              Object.assign(item, {
                dropdownOpenCallback: async (dispatch, fieldData) =>
                  fetchOptionsOnDropdownOpen(item, dispatch, fieldData),
              });
            }

            const savedFilter = savedFilterSelection.find(
              (filter) => filter?.attribute_name === item.column_name
            );
            if (savedFilter && !props.preventFilterPreselection) {
              if (
                item.display_type !== "fiscalCalendar" &&
                item.type !== "non-cascaded"
              ) {
                item.initialData = Array.isArray(savedFilter?.values)
                  ? savedFilter?.values.map((item) => {
                      return mapDataToLabel(item);
                    })
                  : savedFilter?.values;
              }
            }
            return item;
          });

          /*
          Replicating the filterDataSet and assigning correct set of initial values to the initialData prop 
          InitialData prop contains all possible values for the current filter regardless whether the user has access to it or not
           */
          let filterData = cloneDeep(filterDataSet);
          const filterDataSetCopy = filterData?.map((item) => {
            const savedFilter = savedFilterSelection?.find(
              (filter) =>
                filter?.attribute_name === item.column_name &&
                filter?.dimension === item.dimension
            );
            if (savedFilter && !props.preventFilterPreselection) {
              if (
                item.display_type !== "fiscalCalendar" &&
                item.type !== "non-cascaded"
              ) {
                Object.assign(item, {
                  initialData: filterSuperSetData?.[item?.column_name]?.map(
                    (item) => {
                      return mapDataToLabel(item);
                    }
                  ),
                });
              }
            }
            return item;
          });
         
          const {
            isMappingInvalid,
            mappingErrorMessage,
          } = isFilterConfigurationMappingValid(
            filterDataSetCopy,
            savedFilterSelection
          );

          isMappingInvalidBool = isMappingInvalid;
          mappingErrorMessageStr = mappingErrorMessage;

          /**
           * if saved filter mapping is invalid filter dashboard
           * will be loaded with "empty" data set
           */
          if (isMappingInvalid) {
            filterDataSet = filterDataSet.map((item) => {
              if (
                item.display_type !== "fiscalCalendar" &&
                item.dimension !== "custom" &&
                item.dimension !== "others"
              ) {
                item.initialData = [];
              }
              return item;
            });
          }

          filterDataSet = disableNonMandatoryFieldsAction(
            filterDataSet,
            !isMappingInvalid ? savedFilterSelection : [],
            props.filterDashboardConfiguration[0].expectedFilterDimensions
          );
        } else {
          const {
            isMappingInvalid,
            mappingErrorMessage,
          } = isFilterConfigurationMappingValid(
            props.filterDashboardConfiguration[0].originalFilterDashboardData,
            savedFilterSelection
          );

          isMappingInvalidBool = isMappingInvalid;
          mappingErrorMessageStr = mappingErrorMessage;

          /**
           * if saved filter mapping is invalid filter dashboard
           * will be loaded with default data set
           */
          filterDataSet =
            (props.filterConfigType === "global" ||
              filterSelected == "" ||
              isMappingInvalid) &&
            (isNil(props.customFilterDependency) ||
              isEmpty(props.customFilterDependency))
              ? props.filterDashboardConfiguration[0]
                  .originalFilterDashboardData
              : await fetchFilterFieldData(
                  filterData,
                  filterDependencyPayload,
                  screen_name,
                  apiEndPoint,
                  props?.customDependencyValue
                );
        }

        if (
          isMappingInvalidBool &&
          !props.hideSavedFilterMsg &&
          inValidMappingWarning.current
        ) {
          inValidMappingWarning.current = false;
          displaySnackMessages(mappingErrorMessageStr, "info");
        }

        //---- if auto populate fields on load is true ----//

        if (
          !isEmpty(props.autoPopulateOnLoadFields) &&
          isEmpty(savedFilterSelection)
        ) {
          /**
           * generate a list of filter fields which can be auto populated
           * the field should be present in the filter dashboard, and
           * should not be part of saved filter selection
           * and the field should be single select
           */

          let autoPopulateFields = filterDataSet.filter((item) => {
            return (
              props.autoPopulateOnLoadFields.findIndex(
                (filter) => filter === item.column_name
              ) !== -1 &&
              savedFilterSelection.findIndex(
                (filter) => filter.attribute_name === item.column_name
              ) == -1 &&
              item.is_multiple_selection === false
            );
          });

          if (!isEmpty(autoPopulateFields)) {
            // if quick filter is true we need to fetch the required fields
            if (props.quickFilterLoad) {
              const screen_name =
                props.filterDashboardConfiguration[0].screen_name;
              const fieldsToFetch = autoPopulateFields.map((key) => {
                return {
                  column_name: key.column_name,
                  dimension: key.dimension,
                  type: key.type,
                };
              });
              // fetching filter data for fields to populate
              const updatedFilterData = await getCombinedFilterDashboardData(
                fieldsToFetch,
                [],
                screen_name,
                apiEndPoint,
                props?.customDependencyValue
              );
              // setting the fetched data in filter data list
              const updatedFilterDataSet = getFilterElements(
                filterDataSet,
                updatedFilterData
              );
              filterDataSet = updatedFilterDataSet;
            }
            /**
             * adding the pre selections to the saved filter selection list
             * only if we have single option in dropdown
             */
            autoPopulateFields.forEach((filterField) => {
              const filterValues = filterField?.initialData?.map((item) => {
                return item.value;
              });

              if (filterValues.length === 1) {
                const channelFieldValue = {
                  values: filterValues,
                  operator: "in",
                  dimension: filterField.dimension,
                  filter_type: filterField.type,
                  display_type: filterField.display_type,
                  attribute_name: filterField.column_name,
                  filter_id: filterField.column_name,
                };
                savedFilterSelection.push(channelFieldValue);
              }
            });

            /**
             * enabling the rest of the filter fields in case
             * a mandatory field was auto populated
             */
            if (props.quickFilterLoad) {
              filterDataSet = disableNonMandatoryFieldsAction(
                filterDataSet,
                savedFilterSelection,
                props.filterDashboardConfiguration[0].expectedFilterDimensions
              );
            }
          }
        }

        props.filterDashboardConfiguration?.[0]?.filterDashboardClassification.forEach(
          (item) => {
            let obj = {};

            // set saved filter selection based on dimension
            let filterSelection = savedFilterSelection.filter(
              (filter) => filter.dimension === item.dimension
            );

            const filterSelectionData = uniqBy(filterSelection, "filter_id");
            obj[item.screenName] = isMappingInvalidBool
              ? []
              : filterSelectionData;
            props.setSelectedFilters(obj);
          }
        );

        // set combined filter dependency of all dimensions and set filter data to original dataset
        updateFilterConfigurationData(filterDataSet);
        firstTimeRender.current = false;
        setFirstTimeRenderLoader(!firstTimeRenderLoader);
      }
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
    }
  }, [
    props.filterDashboardConfiguration,
    filterSelected,
    firstTimeRender.current,
    defaultFilterLoaded,
  ]);

  // dropdownOpenCallback for data fetch action
  const fetchOptionsOnDropdownOpen = async (key, dispatch, fieldData) => {
    // call api to fetch data only if data is not set and not disabled
    if (
      !fieldData.is_disabled &&
      (isNil(fieldData.initialData) || isEmpty(fieldData.initialData))
    ) {
      let dropDownOptions = [];
      const screen_name = props.filterDashboardConfiguration[0].screen_name;
      let filterData = cloneDeep(filterDashboardDataRef.current);
      //getting custom filter fetch dependency from config
      const filterFetchCustomDependency = cloneDeep(
        props.filterDashboardConfiguration[0]?.filterFetchCustomDependency
      );
      // set dropdown loader to true
      dispatch({
        type: "OPTION_INIT",
      });
      let combinedFilterDependency = updateFilterDimension(
        filterDependencyDataRef?.current,
        filterData,
        false,
        true
      )?.filter(
        (filter) =>
          filter.dimension !== "custom" &&
          filter.filter_type !== "non-cascaded" &&
          filter.dimension !== "others"
      );
      //setting custom filter fetch dependency
      combinedFilterDependency.push(
        ...getFilterFetchCustomDependency(
          filterFetchCustomDependency,
          key.dimension
        )
      );

      // fetch filter field data
      const filterDashboardData = await getCombinedFilterDashboardData(
        updateFilterDimension(
          [
            {
              column_name: key.column_name,
              dimension: key?.dimension,
              type: key.type,
            },
          ],
          filterData
        ),
        combinedFilterDependency,
        screen_name,
        apiEndPoint,
        // This prop is used to update the dependency manually (only) in the payload where required (use case)
        props?.customDependencyValue
      );

      // setting fetched filter data in filterDashboardData (filterconfig)
      filterData = filterData.map((item) => {
        if (item.column_name === key.column_name) {
          const options = filterDashboardData[key.column_name]
            ? filterDashboardData[key.column_name]
            : [];
          item.initialData = options.map((item) => {
            return mapDataToLabel(item);
          });
          item.mappedKey = getMappedKeyForFilter(
            filterDashboardData,
            key?.column_name
          );
          dropDownOptions = item.initialData;
        }
        return item;
      });

      // updating filter configuration
      updateFilterConfigurationData(filterData);

      // set dropdown loader to false, and update dropdown data
      // loading only 50 first, remaining would be loaded on scroll
      if (dropDownOptions.length > 50) {
        dropDownOptions = dropDownOptions.slice(0, 50);
      }
      dispatch({
        type: "OPTION_SUCCESS",
        payload: dropDownOptions,
      });
    }
  };

  const getFilterConfigurationData = () => {
    const copyFilterConfigurations = cloneDeep(
      props.filterDashboardConfiguration
    );
    let filterSectionData = {};
    copyFilterConfigurations?.forEach((item, index) => {
      if (
        index == filterSectionRadio ||
        copyFilterConfigurations?.length === 1
      ) {
        filterSectionData = item;
      }
    });

    const filterDependency = getFilterSelectionDependency();
    return {
      filterDependency: filterDependency,
      filterData: filterSectionData?.filterDashboardData,
      isCrossDimensionFilter: filterSectionData?.isCrossDimensionFilter,
      is_urm_filter: filterSectionData.is_urm_filter,
      screen_name: filterSectionData.screen_name,
      application_code: filterSectionData.application_code,
      saved_filter_screen_name: filterSectionData.saved_filter_screen_name,
    };
  };

  const updateFilterConfigurationData = (filterData) => {
    let updatedFilterConfigurations = cloneDeep(
      props.filterDashboardConfiguration
    );
    updatedFilterConfigurations = updatedFilterConfigurations.map(
      (item, index) => {
        if (
          index == filterSectionRadio ||
          updatedFilterConfigurations?.length === 1
        ) {
          return {
            ...item,
            filterDashboardData: filterData
              ? filterData
              : item.filterDashboardData,
          };
        } else return item;
      }
    );

    let obj = {};
    obj[props.filterConfigKey] = {
      filterConfig: updatedFilterConfigurations,
      appliedFilterData:
        firstTimeRender.current && !props.showChipsOnLoad
          ? {}
          : appliedFilterDataRef.current,
    };

    if (props.filterDashboardConfigurationObj?.isRedirectedFromDifferentPage) {
      obj[props.filterConfigKey].isRedirectedFromDifferentPage =
        props.filterDashboardConfigurationObj?.isRedirectedFromDifferentPage;
    }

    props.setFilterConfiguration(obj);
  };

  const setFilterSelectedData = (value, ignoreCheck = false) => {
    if (value !== filterSelected || ignoreCheck) {
      firstTimeRender.current = true;
      inValidMappingWarning.current = true;
    }
    setFilterSelected(value);
    // updating selected saved filter in redux to use for custom filters
    props.setSavedSelectedFilter(value);
  };

  useEffect(() => {
    return () => {
      // clearing the chips and closing the modal on unmount
      setFilterDependencyChips([]);
      setOpenModal(false);
      firstTimeRender.current = true;
      setFirstTimeRenderLoader(true);
      setDefaultFilterLoaded(false);
      props.setSavedFiltersList([]);
    };
  }, [
    props.filterConfigKey,
    props?.screenTabValue,
    props?.customFilterDependency,
    props?.preventFilterPreselection,
  ]);

  useEffect(() => {
    if (props.resetFilterChips) {
      setFilterDependencyChips([]);
      props.resetFilterConfiguration({});
    }
  }, [location.pathname]);

  useEffect(async () => {
    if (!isEmpty(props.appliedFilterData?.filterHeader)) {
      setFilterSectionRadio(props.appliedFilterData?.filterHeader);
    }
  }, []);

  useEffect(() => {
    if (!isEmpty(props.chipsDependency)) {
      setFilterDependencyChips(props.chipsDependency);
    }
  }, [props.chipsDependency]);

  useEffect(() => {
    if (
      !isEmpty(props.appliedFilterData?.dependencyData) &&
      !firstTimeRender.current
    ) {
      // setting filter dashboard chips of the filters applied
      let chipsDependencyData = cloneDeep(
        props.appliedFilterData?.dependencyData
      )?.map((item) => {
        //if filter_name is not coming for old saved filters
        if (!item.hasOwnProperty("filter_name")) {
          // Find corresponding item in filterDashboardConfiguration
          const foundFilter = props?.filterDashboardConfiguration?.[0]?.filterDashboardData.find(
            (filter) => item.attribute_name === filter.column_name
          );

          // If a matching item is found, add its label to the current item
          if (foundFilter) {
            item.filter_name = foundFilter.label;
          }
        }
        if (isArray(item.values)) {
          item.values = item.values.map((value) => {
            if (typeof value === "boolean")
              return mapDataToLabel(value.toString().toUpperCase());
            else return mapDataToLabel(value);
          });
        } else item.values = [mapDataToLabel(item.values)];

        // Find corresponding item in filterDashboardConfiguration
        const foundFilter = props?.filterDashboardConfiguration?.[0]?.filterDashboardData.find(
          (filter) => item.attribute_name === filter.column_name
        );

        if (foundFilter) {
          //if filter_name is not coming for old saved filters then add filter_name manually
          if (!item.hasOwnProperty("filter_name")) {
            item.filter_name = foundFilter.label;
          }

          //if label and value are not same in item
          const initialData = foundFilter?.initialData;
          item?.values?.map((valueObj) => {
            const matchingFilter =
              initialData?.length &&
              initialData?.find((filter) => valueObj?.value === filter?.value);
            if (matchingFilter && matchingFilter?.label != valueObj?.label) {
              valueObj.label = matchingFilter.label;
            }
          });
        }

        return item;
      });
      setFilterDependencyChips(chipsDependencyData);
    }
  }, [props.filterConfigKey, props.appliedFilterData, firstTimeRender]);

  useEffect(() => {
    if (!firstTimeRender.current && props?.savedFilterDashboard?.length > 0) {
      props.setSavedFiltersList(
        sortSavedFiltersUtility(
          props?.savedFilterDashboard,
          selectedSortByOptions.value
        )
      );
    }
  }, [selectedSortByOptions]);

  useEffect(() => {
    if (!isNil(props.appliedFilterData)) {
      appliedFilterDataRef.current = props.appliedFilterData;
    }
  }, [props.appliedFilterData]);

  const onDeleteFilterClick = async (filterName) => {
    let filterCode;
    setShowFilterLoader(true);
    const updatedList = props.savedFilterDashboard.filter((item) => {
      if (item.name !== filterName) {
        return true;
      } else {
        filterCode = item.fuc_code;
        return false;
      }
    });

    try {
      await deleteFilterUserConfiguration(filterCode);
      props.setSavedFiltersList(updatedList);
      if (updatedList?.length !== 0) {
        setFilterSelectedData(updatedList[0]?.name);
      } else {
        setFilterSelectedData("");
      }
      setShowFilterLoader(false);
      displaySnackMessages("Successfully deleted filter selection", "success");
    } catch (err) {
      setShowFilterLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const isOnlyIsDefaultChanged = (obj1, obj2) => {
    obj2 = cloneDeep(obj2);
    obj2["saved_filter_preference"] = obj2[
      "saved_filter_preference"
    ].map((obj) => omit(obj, "filter_id"));
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // Combine and deduplicate keys
    const allKeys = union(keys1, keys2);

    // Filter keys with different values using isEqual
    const changedKeys = allKeys.filter(
      (key) => !isEqual(cloneDeep(obj1[key]), cloneDeep(obj2[key]))
    );
    // Check if there is only one changed key and it is "is_default"
    return changedKeys.length === 1 && changedKeys[0] === "is_default";
  };

  const isDefaultChanged = (updatedConfig, currentConfig, screen_name) => {
    let oldConfig = cloneDeep(currentConfig);
    let newConfig = cloneDeep(updatedConfig);
    oldConfig["screen_name"] =
      oldConfig["screen_code"] === 3 ? "All" : screen_name;
    delete oldConfig["screen_code"];
    const keys1 = Object.keys(newConfig);

    // Pick only the keys present in obj1 from obj2
    oldConfig = pick(oldConfig, keys1);
    return isOnlyIsDefaultChanged(oldConfig, newConfig);
  };

  // edit icon click action on saved filter chip
  const onEditFilterClick = async (formData, isCloned = false) => {
    try {
      if (isEmpty(formData)) {
        displaySnackMessages("No updates found", "warning");
        return;
      }

      if (isCloned && filterSelected === formData.filter_name) {
        displaySnackMessages("Please provide a different config name", "error");
        return;
      }

      let copySavedFiltersList = cloneDeep(props.savedFilterDashboard);
      let filterDependency = getFilterSelectionDependency();
      let {
        screen_name,
        filterData,
        saved_filter_screen_name,
      } = getFilterConfigurationData();

      if (isEmpty(formData.filter_name)) {
        displaySnackMessages("Please provide a valid config name", "error");
        return;
      }

      if (!isTextInputValid(formData?.filter_name, 4, 15, props.addSnack)) {
        return false;
      }

      if (!requiredFieldCheck(filterData, filterDependency)) {
        return;
      }

      if (props.containsCustomFilterSection) {
        const {
          customFilterData,
          customFilterDependency,
        } = props.getCustomFilterDataAndDependency();
        filterData = [...filterData, ...customFilterData];
        filterDependency = [...filterDependency, ...customFilterDependency];
      }

      if (props.filterSaveLevel === "mandatory") {
        filterDependency = getRequiredFilterList(filterData, filterDependency);
      }

      setShowFilterLoader(true);
      setIsEditModalOpen(false);

      if (formData.is_default_filter) {
        copySavedFiltersList = copySavedFiltersList.map((filter) => {
          filter.is_default = false;
          return filter;
        });
      }
      if (filterSelected == "" || isCloned) {
        // new filter being created
        const newFilterDefault = {
          name: formData.filter_name,
          screen_name:
            formData?.applicable_to === "this_screen" ||
            formData?.applicable_to === "this_screen_all_users"
              ? saved_filter_screen_name
                ? saved_filter_screen_name
                : screen_name
              : "All",
          is_default: formData.is_default_filter ? true : false,
          saved_filter_preference: [...filterDependency],
          is_broadcast:
            formData?.applicable_to === "all_screen_all_users" ||
            formData?.applicable_to === "this_screen_all_users"
              ? true
              : false,
        };
        await saveFilterUserConfiguration(newFilterDefault);
        displaySnackMessages("Successfully saved filter selection", "success");
      } else {
        // selected filter being edited
        let updatedFilterConfig = {};
        let filterCode = null;
        let currentConfig = {};
        copySavedFiltersList = copySavedFiltersList.map((filter, idx) => {
          if (filter.name === filterSelected) {
            updatedFilterConfig = {
              name: formData.filter_name,
              screen_name:
                formData?.applicable_to === "this_screen" ||
                formData?.applicable_to === "this_screen_all_users"
                  ? saved_filter_screen_name
                    ? saved_filter_screen_name
                    : screen_name
                  : "All",
              is_default: formData.is_default_filter ? true : false,
              saved_filter_preference: [...filterDependency],
              is_broadcast:
                formData?.applicable_to === "all_screen_all_users" ||
                formData?.applicable_to === "this_screen_all_users"
                  ? true
                  : false,
            };
            filterCode = filter.fuc_code;
            currentConfig = cloneDeep(props.savedFilterDashboard[idx]);
            return updatedFilterConfig;
          }
          return filter;
        });
        updatedFilterConfig = {
          ...updatedFilterConfig,
          is_only_default_changed: isDefaultChanged(
            updatedFilterConfig,
            currentConfig,
            saved_filter_screen_name ? saved_filter_screen_name : screen_name
          ),
        };
        await updateFilterUserConfiguration(filterCode, updatedFilterConfig);
        displaySnackMessages(
          "Successfully updated filter selection",
          "success"
        );
      }

      setFilterSelectedData(formData.filter_name, true);
      setShowFilterLoader(false);
    } catch (err) {
      displayErrorMessage(err);
      setShowFilterLoader(false);
    }
  };

  // get filter dependency from selectedFilters object in redux
  const getFilterSelectionDependency = () => {
    return getSelectedFiltersFromConfig(
      props.filterDashboardConfiguration,
      filterSectionRadio,
      props.filterReducer
    );
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const search = debounce((nameVal) => {
    const matchingResults = originalList?.filter((obj) =>
      obj.name.toLowerCase().includes(nameVal.toLowerCase())
    );
    // Update search results
    props.setSavedFiltersList(
      sortSavedFiltersUtility(matchingResults, selectedSortByOptions.value)
    );
  }, 300);

  const renderFilterDashboard = () => {
    return (
      <LoadingOverlay
        loader={
          showFilterLoader ||
          firstTimeRender.current ||
          isEmpty(props.filterDashboardConfiguration)
        }
        minHeight={120}
      >
        {props.filterConfigType === "screen" && !props.hideSaveFilterSection && (
          <CustomAccordion
            label="Saved Filters"
            defaultExpanded={true}
            customClass={globalClasses.accordianWrapper}
          >
            <div
              className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.marginBottom}`}
            >
              <div
                className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${classes.filterSearchDivStyle}`}
              >
                <Input
                  placeholder="Search Filter"
                  helperText="Enter a valid filter config name"
                  onChange={(event) => {
                    setNameSearchVal(event.target.value);
                    search(event.target.value);
                  }}
                  value={nameSearchVal}
                />

                <Divider orientation="vertical" flexItem />
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${classes.defaultDivStyle}`}
                >
                  <div className={classes.defaultCircleStyle}></div>
                  <Typography>Default</Typography>
                </div>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${classes.activeDivStyle}`}
                >
                  <CheckCircleRoundedIcon color="success" />
                  <Typography>Active</Typography>
                </div>
              </div>

              <Select
                label={"Sort Saved Filters By"}
                placeholder={"Sort Saved Filters By"}
                initialOptions={savedFiltersSortOptions}
                isOpen={isSortOpen}
                setIsOpen={setIsSortOpen}
                currentOptions={currentSortByOptions}
                setCurrentOptions={setCurrentSortByOptions}
                selectedOptions={selectedSortByOptions}
                setSelectedOptions={setSelectedSortByOptions}
                labelOrientation="left"
              />
            </div>

            <SavedFiltersSection
              savedFilterData={props.savedFilterDashboard}
              setFilterSelected={setFilterSelectedData}
              filterSelected={filterSelected}
              setIsEditModalOpen={setIsEditModalOpen}
              isEditModalOpen={isEditModalOpen}
              onEditFilterClick={onEditFilterClick}
              onDeleteFilterClick={onDeleteFilterClick}
            />
          </CustomAccordion>
        )}

        {!firstTimeRender.current && (
          <FilterConfigurationMapping
            {...props}
            filterSelected={filterSelected}
            setFilterDependencyChips={setFilterDependencyChips}
            filterSectionRadio={filterSectionRadio}
            setFilterSectionRadio={setFilterSectionRadio}
            setOpenModal={setOpenModal}
            setIsEditModalOpen={setIsEditModalOpen}
          />
        )}
      </LoadingOverlay>
    );
  };

  return (
    <div id={"filter-container"}>
      {disableFilterModal ? (
        renderFilterDashboard()
      ) : (
        <>
          {(props.chipsDependency ||
            !firstTimeRender.current ||
            props.showChipsOnLoad) && (
            <div>
              {(!isEmpty(filterDependencyChips) ||
                !isEmpty(props.dateFilter)) && (
                <FilterChips
                  filterConfig={filterDependencyChips}
                  dateFilter={props.dateFilter}
                  isDateLabelDerivedFromDimension={
                    props.isDateLabelDerivedFromDimension
                  }
                ></FilterChips>
              )}
            </div>
          )}
          <FilterModal
            open={openModal}
            isModalFixedTop={true}
            closeOnOverlayClick={() => setOpenModal(false)}
          >
            {renderFilterDashboard()}
          </FilterModal>
        </>
      )}
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
    filterReducer: state.filterReducer,
    quickFilterLoad:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.quickFilterLoad,
    autoPopulateOnLoadFields:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .autoPopulateOnLoadFields,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setSelectedFilters: (data) => dispatch(setSelectedFilters(data)),
    setSavedSelectedFilter: (data) => dispatch(setSavedSelectedFilter(data)),
    resetFilterConfiguration: (data) =>
      dispatch(resetFilterConfiguration(data)),
    setSavedFiltersList: (data) => dispatch(setSavedFiltersList(data)),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FilterDashobardSection);
