import { isEmpty, cloneDeep, isArray, uniqBy, isNil } from "lodash";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import {
  mapDataToLabel,
  getSelectedFiltersFromConfig,
  fetchFilterFieldData,
  getRequiredFilterList,
  isFilterConfigurationMappingValid,
  getSelectionDependency,
  getCombinedFilterDashboardData,
  disableNonMandatoryFieldsAction,
  sortSavedFiltersUtility,
  getMappedKeyForFilter,
  updateFilterDimension,
  getFilterFetchCustomDependency,
  requiredFieldCheck,
  findCorrectSavedFilterDataifNotChangeSavedFilters,
} from "./utils";
import {
  setFilterConfiguration,
  setSelectedFilters,
  resetFilterConfiguration,
  getFilterUserConfiguration,
  setSavedSelectedFilter,
  setIsFilterApplied
} from "core/actions/filterAction";
import { setSavedFiltersList } from "core/actions/filterAction";
import FilterConfigurationMapping from "./FilterConfigurationMapping";
import { addSnack } from "core/actions/snackbarActions";
import { savedFiltersSortOptions } from "./constants";
import { useLocation } from "react-router-dom-v5-compat";
import { flushSync } from "react-dom";


const FilterPanelDashboard = (props) => {
  const {
    setFilterDependencyChips,
    openModal,
    setOpenModal,
    savedFilterDataRef,
    savedFilterClickRef,
    selectedFilterValueRef,
    applyFilterHandlerRef,
    activeFilterDimensionRef,
    savedRecentFiltersListRef,
    setDefaultFilterLoader,
    setDefaultFilterLoadingMsg,
  } = props;
  let location = useLocation();
  const firstTimeRender = useRef(true);
  const [defaultFilterLoaded, setDefaultFilterLoaded] = useState(false);
  const [showFilterLoader, setShowFilterLoader] = useState(false);
  const inValidMappingWarning = useRef(true);
  const filterDashboardDataRef = useRef([]);
  const filterDependencyDataRef = useRef([]);
  const appliedFilterDataRef = useRef({});
  const isActionOnFilterChip = useRef(false);
  const firstTimeRenderForAutoApplyFilters = useRef(true);
  const autoAppyTimerRef = useRef(null);
  const isAutoApplyFilterRef = useRef(false);
  const openModalRef = useRef(false);
  const initialFilterLoadDoneRef = useRef(false);

  // Filter Variables
  const [filterSectionRadio, setFilterSectionRadio] = useState(0);
  const [filterSelected, setFilterSelected] = useState("");
  // const [openModal, setOpenModal] = useState(false);

  const [firstTimeRenderLoader, setFirstTimeRenderLoader] = useState(true);

  const [selectedSortByOptions, setSelectedSortByOptions] = useState(
    savedFiltersSortOptions[0]
  );

  const [isSuccessFullyAppliedFilter, setIsSuccessFullyApplied] = useState(
    false
  );

  const [originalList, setOriginalList] = useState([]);

  const closeAutoApply = () => {
    if (
      props.isAutoApplyEnabled &&
      firstTimeRenderForAutoApplyFilters.current &&
      !props.hideSaveFilterSection &&
      !props.disableFilterModal
    ) {
      clearInterval(autoAppyTimerRef.current);
      firstTimeRenderForAutoApplyFilters.current = false;
      isAutoApplyFilterRef.current = false;
      setDefaultFilterLoader(false);
      setDefaultFilterLoadingMsg("Fetching the filters for current screen");
      // if (!props?.suppressInfoMessages) {
      //   displaySnackMessages("No Filter Applied", "info");
      // }
    }
  };

  const autoApplyFilter = () => {
    if (firstTimeRenderForAutoApplyFilters.current) {
      let dependencyData = getFilterSelectionDependency();
      if (
        requiredFieldCheck(
          props.filterDashboardConfiguration[0]?.filterDashboardData,
          dependencyData,
          true
        )
      ) {
        setDefaultFilterLoadingMsg("Applying the default saved filters");
        clearInterval(autoAppyTimerRef.current);
        if (openModalRef.current) isAutoApplyFilterRef.current = true;
        setTimeout(() => {
          applyFilterHandlerRef.current?.();
          if (openModalRef.current) isAutoApplyFilterRef.current = true;
          setTimeout(() => {
            setDefaultFilterLoader(false);
          }, 1000);
        }, 1000);
        firstTimeRenderForAutoApplyFilters.current = false;
      }
    }
  };

  useEffect(() => {
    if (
      !showFilterLoader &&
      !firstTimeRenderLoader &&
      firstTimeRenderForAutoApplyFilters.current &&
      !isEmpty(props.filterDashboardConfiguration) &&
      !props.hideSaveFilterSection &&
      !props.disableFilterModal &&
      props.isAutoApplyEnabled &&
      defaultFilterLoaded &&
      !props.hideSavedFilterSection
    ) {
      autoApplyFilter();
    }
  }, [
    showFilterLoader,
    firstTimeRenderLoader,
    props.filterDashboardConfiguration,
    defaultFilterLoaded,
  ]);

  useEffect(() => {
    return () => {
      clearInterval(autoAppyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    openModalRef.current = openModal;
  }, [openModal]);

  useEffect(() => {
    savedFilterDataRef.current = originalList;
  }, [originalList]);

  //setting is defualt filters as selected on load before firstTimeRender is called
  useEffect(() => {
    const fetchData = async () => {
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
        let defaultFilter = savedFilterUserConfig.find(
          (filter) => filter.is_default === true
        );
        setOriginalList(savedFilterUserConfig);
        props.setSavedFiltersList(
          sortSavedFiltersUtility(
            savedFilterUserConfig,
            selectedSortByOptions.value
          )
        );

        if (!isNil(props.customFilterDependency)) {
          defaultFilter = findCorrectSavedFilterDataifNotChangeSavedFilters(
            props.filterDashboardConfiguration,
            props.customFilterDependency,
            defaultFilter,
            savedFilterUserConfig
          );
        }

        if (!isNil(defaultFilter) && !props.hideSavedFilterSection) {
          setDefaultFilterLoadingMsg("Setting the Default Filter");
          setFilterSelectedData(defaultFilter.name);
        } else if (!props.disableFilterModal && !props.hideSavedFilterSection) {
          setDefaultFilterLoader(false);
          // if (!props?.suppressInfoMessages) {
          //   displaySnackMessages("No Default Filter Found", "info");
          // }
        }

        setDefaultFilterLoaded(true);
      } else if (props.filterConfigType !== "screen" && !defaultFilterLoaded) {
        setDefaultFilterLoaded(true);
      }
    };
    fetchData();
  }, [
    props.filterDashboardConfiguration,
    props.customFilterDependency,
    props.filterConfigKey,
    props.hideSavedFilterSection,
  ]);

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

  useEffect(() => {
    const initialFilterDataLoad = async () => {
      try {
        // saved filter selection is set only when filter dashboard is first rendered
        if (
          !isEmpty(props.filterDashboardConfiguration) &&
          firstTimeRender.current &&
          defaultFilterLoaded
        ) {
          setFirstTimeRenderLoader(true);
          const {
            screen_name,
            filterData,
            saved_filter_screen_name,
          } = getFilterConfigurationData();
          let savedFilterSelection = [];

          if (
            !isNil(props.customFilterDependency) &&
            !isEmpty(props.customFilterDependency) &&
            !props.preventFilterPreselection &&
            !(props.skipCustomFilterOnReapply && initialFilterLoadDoneRef.current)
          ) {
            savedFilterSelection = getCombinedCustomFilterDependency(
              props.customFilterDependency
            );
            if (props.filterConfigType === "screen" && filterSelected !== "") {
              const savedFilterUserConfig = await getFilterUserConfiguration(
                saved_filter_screen_name
                  ? saved_filter_screen_name
                  : screen_name
              );
              setOriginalList(savedFilterUserConfig);
              props.setSavedFiltersList(
                sortSavedFiltersUtility(
                  savedFilterUserConfig,
                  selectedSortByOptions.value
                )
              );
            }
          } else if (!props.preventFilterPreselection) {
            if (props.filterConfigType === "screen" && filterSelected !== "") {
              let selectedFilterConfig = [];
              const savedFilterUserConfig = await getFilterUserConfiguration(
                saved_filter_screen_name
                  ? saved_filter_screen_name
                  : screen_name
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
                props.filterDashboardConfiguration[0]
                  ?.filterFetchCustomDependency, //passing custom dependency
                screen_name,
                props?.customDependencyValue,
                props?.customAttributeList,
                filterSelected
              );
              return filterDashboardData;
            };
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
                if (
                  item.display_type !== "fiscalCalendar" &&
                  item.dimension !== "custom"
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
            let filterSuperSetData = {};
            if (savedFilterSelection.length !== 0) {
              filterSuperSetData = await getFilterSuperSet();
            }
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
                  item.dimension !== "custom"
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
              showFilterStrip
            } = isFilterConfigurationMappingValid(
              filterDataSetCopy,
              savedFilterSelection
            );
            if(!showFilterStrip){
              props.setIsFilterApplied(false)
              props.setShowFilters(false)
            }
            isMappingInvalidBool = isMappingInvalid;
            mappingErrorMessageStr = mappingErrorMessage;

            const isValid = requiredFieldCheck(
              filterDataSetCopy,
              savedFilterSelection,
              true
            );

            if (!isValid || isMappingInvalid) closeAutoApply();

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
            const filterDataSetCopy =
              props.filterDashboardConfiguration[0].originalFilterDashboardData;
            const {
              isMappingInvalid,
              mappingErrorMessage,
              showFilterStrip
            } = isFilterConfigurationMappingValid(
              filterDataSetCopy,
              savedFilterSelection
            );
            if (!showFilterStrip) {
              props.setIsFilterApplied(false)
              props.setShowFilters(false)
            }
            isMappingInvalidBool = isMappingInvalid;
            mappingErrorMessageStr = mappingErrorMessage;

            const isValid = requiredFieldCheck(
              filterDataSetCopy,
              savedFilterSelection,
              true
            );

            if (!isValid || isMappingInvalid) closeAutoApply();

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
          initialFilterLoadDoneRef.current = true;
          firstTimeRender.current = false;
          setFirstTimeRenderLoader(false);
        }
      } catch (err) {
        displaySnackMessages("Something went wrong", "error");
      }
    };
    initialFilterDataLoad();
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
        firstTimeRender.current &&
        !props.showChipsOnLoad &&
        !isActionOnFilterChip.current
          ? []
          : appliedFilterDataRef.current,
    };

    if (props.filterDashboardConfigurationObj?.isRedirectedFromDifferentPage) {
      obj[props.filterConfigKey].isRedirectedFromDifferentPage =
        props.filterDashboardConfigurationObj?.isRedirectedFromDifferentPage;
    }

    props.setFilterConfiguration(obj);
    if (isActionOnFilterChip.current) {
      isActionOnFilterChip.current = false;
    }
  };

  const setFilterSelectedData = (value, ignoreCheck = false) => {
    if (value !== filterSelected || ignoreCheck) {
      firstTimeRender.current = true;
      inValidMappingWarning.current = true;
    }
    isActionOnFilterChip.current = true;
    flushSync(() => {
      setFilterSelected(value);
    });
    // updating selected saved filter in redux to use for custom filters
    props.setSavedSelectedFilter(value);
  };

  useEffect(() => {
    savedFilterClickRef.current = (filter) => {
      setFilterSelectedData(filter === filterSelected ? "" : filter);
    };
    if (isSuccessFullyAppliedFilter) {
      selectedFilterValueRef.current = {
        selectedFilter: filterSelected,
        selectedFilterHandler: setFilterSelectedData,
      };
      setIsSuccessFullyApplied(false);
    }
  }, [filterSelected, isSuccessFullyAppliedFilter]);

  useEffect(() => {
    return () => {
      // clearing the chips and closing the modal on unmount
      // setFilterDependencyChips([]);
      setOpenModal(false);
      firstTimeRender.current = true;
      setFirstTimeRenderLoader(true);
      setDefaultFilterLoaded(false);
      appliedFilterDataRef.current = {};
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

  useEffect(() => {
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
      // const selectionMap = new Map(
      //   getFilterSelectionDependency()?.map((item) => [item?.attribute_name, item])
      // );
      // let appliedFilterData = props?.appliedFilterData?.dependencyData?.map((appliedItem) => {
      //   const matchingItem = selectionMap?.get(appliedItem?.attribute_name);
      //   return matchingItem
      //     ? { ...appliedItem, values: matchingItem.values }
      //     : appliedItem;
      // });
      let chipsDependencyData = cloneDeep(
        props?.appliedFilterData?.dependencyData
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
              Array.isArray(initialData) &&
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
    } else if (!firstTimeRender.current) {
      setFilterDependencyChips([]);
    }
  }, [props.filterConfigKey, props.appliedFilterData, firstTimeRender.current]);

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
    if ((!isNil(props.appliedFilterData) && (!firstTimeRender.current || props?.skipFirstRenderCheck))) {
      appliedFilterDataRef.current = props.appliedFilterData;
    }
  }, [props.appliedFilterData]);

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

  return (
    <div
      id={"filter-container"}
      className={`${props?.disableFilterModal && "flat-filter-container"}`}
    >
      <FilterConfigurationMapping
        {...props}
        alignClearButton={props.alignClearButton}
        openModal={openModal}
        filterSelected={filterSelected}
        setFilterDependencyChips={setFilterDependencyChips}
        filterSectionRadio={filterSectionRadio}
        setFilterSectionRadio={setFilterSectionRadio}
        setOpenModal={setOpenModal}
        originalList={originalList}
        setOriginalList={setOriginalList}
        setFilterSelectedData={setFilterSelectedData}
        getFilterConfigurationData={getFilterConfigurationData}
        filterConfigType={props.filterConfigType}
        hideSaveFilterSection={props.hideSaveFilterSection}
        filterDashboardConfiguration={props.filterDashboardConfiguration}
        filterReducer={props.filterReducer}
        savedFilterDashboard={props.savedFilterDashboard}
        setSavedFiltersList={props.setSavedFiltersList}
        containsCustomFilterSection={props.containsCustomFilterSection}
        getCustomFilterDataAndDependency={
          props.getCustomFilterDataAndDependency
        }
        filterSaveLevel={props.filterSaveLevel}
        firstTimeRenderLoader={firstTimeRenderLoader}
        applyFilterHandlerRef={applyFilterHandlerRef}
        activeFilterDimensionRef={activeFilterDimensionRef}
        savedRecentFiltersListRef={savedRecentFiltersListRef}
        showFilterLoader={showFilterLoader}
        setShowFilterLoader={setShowFilterLoader}
        isAutoApplyFilterRef={isAutoApplyFilterRef}
        firstTimeRender={firstTimeRender.current}
        setFirstTimeRenderLoader={setFirstTimeRenderLoader}
        setIsSuccessFullyApplied={setIsSuccessFullyApplied}
      />
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
    setIsFilterApplied: (data) => dispatch(setIsFilterApplied(data)),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FilterPanelDashboard);
