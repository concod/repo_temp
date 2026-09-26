import { isEmpty, cloneDeep, isArray, uniqBy, isNil, find, trim } from "lodash";
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
  updateFilterDimension,
  getFilterFetchCustomDependency,
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

  const { openModal, setOpenModal, disableFilterModal } = props;
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

  //setting is defualt filters as selected on load before firstTimeRender is called
  useEffect(async () => {
    if (
      props.filterConfigType === "screen" &&
      !isEmpty(props.filterDashboardConfiguration) &&
      !defaultFilterLoaded
    ) {
      const { screen_name, saved_filter_screen_name } =
        getFilterConfigurationData();
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
        const { screen_name, filterData, saved_filter_screen_name } =
          getFilterConfigurationData();
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
          filterDataSet = filterDataSet.map((item) => {
            if (
              item.display_type === "dropdown" &&
              item.dimension !== "custom"
            ) {
              Object.assign(item, {
                dropdownOpenCallback: async (dispatch, fieldData) =>
                  fetchOptionsOnDropdownOpen(item, dispatch, fieldData),
              });
            }

            const savedFilter = savedFilterSelection.find(
              (filter) =>
                filter?.attribute_name === item.column_name &&
                filter?.dimension === item.dimension
            );
            if (savedFilter && !props.preventFilterPreselection) {
              if (item.display_type !== "fiscalCalendar") {
                item.initialData = Array.isArray(savedFilter?.values)
                  ? savedFilter?.values.map((item) => {
                      return mapDataToLabel(item);
                    })
                  : savedFilter?.values;
              }
            }
            return item;
          });
          const { isMappingInvalid, mappingErrorMessage } =
            isFilterConfigurationMappingValid(
              filterDataSet,
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
                item.dimension !== "custom"
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
          const { isMappingInvalid, mappingErrorMessage } =
            isFilterConfigurationMappingValid(
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
      const isCrossDimensionFilter = cloneDeep(
        props.filterDashboardConfiguration[0]?.isCrossDimensionFilter
      );
      // set dropdown loader to true
      dispatch({
        type: "OPTION_INIT",
      });

      let combinedFilterDependency = updateFilterDimension(
        isCrossDimensionFilter
          ? filterDependencyDataRef?.current
          : filterDependencyDataRef?.current.filter(
              (filter) => filter.dimension === key?.dimension
            ),
        filterData,
        false,
        true
      )?.filter(
        (filter) =>
          filter.dimension !== "custom" && filter.filter_type !== "non-cascaded"
      );

      //setting custom filter fetch dependency
      combinedFilterDependency.push(
        ...getFilterFetchCustomDependency(
          filterFetchCustomDependency,
          key.dimension
        )
      );

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
        // This prop is used to update the dependency manually (only) in the payload where required (use case)
        props?.customDependencyValue
      );

      // setting fetched filter data in filterDashboardData (filterconfig)
      filterData = filterData.map((item) => {
        if (
          item.column_name === key.column_name &&
          item.dimension === key.dimension
        ) {
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
          ? []
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
      let { screen_name, filterData, saved_filter_screen_name } =
        getFilterConfigurationData();

      if (isEmpty(formData.filter_name)) {
        displaySnackMessages("Please provide a valid config name", "error");
        return;
      }

      if (!requiredFieldCheck(filterData, filterDependency)) {
        throw Error("Please select required fields");
      }

      if (props.containsCustomFilterSection) {
        const { customFilterData, customFilterDependency } =
          props.getCustomFilterDataAndDependency();
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
          name: trim(formData.filter_name),
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
        copySavedFiltersList = copySavedFiltersList.map((filter) => {
          if (filter.name === filterSelected) {
            updatedFilterConfig = {
              name: trim(formData.filter_name),
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
            return updatedFilterConfig;
          }
          return filter;
        });

        await updateFilterUserConfiguration(filterCode, updatedFilterConfig);
        displaySnackMessages(
          "Successfully updated filter selection",
          "success"
        );
      }

      setFilterSelectedData(formData.filter_name, true);
      setShowFilterLoader(false);
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : err?.message || "Something went wrong";
      displaySnackMessages(errMsg, "error");
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
        {props.filterConfigType === "screen" &&
          !props.hideSaveFilterSection && (
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
