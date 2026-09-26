import { isEmpty, cloneDeep, uniqBy, isNil, isArray } from "lodash";
import { FilterPanel, ButtonGroup, Button } from "impact-ui-v3";
import { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
  generateUploadedFilterDependency,
  getApplicationCode,
  getfilterAttributeList,
  getSelectedFiltersFromConfig,
  requiredFieldCheck,
  updateDependencyData,
  getDimensionErrors,
  getUpdatedConfigWithErrors,
} from "./utils";
import {
  getUamFilterDependency,
  getRequiredFilterList,
  updateFilterDimension,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  getCombinedCrossDimensionFiltersData,
  setIsFilterApplied,
  setSavedFiltersList,
} from "core/actions/filterAction";
import FilterGroupSection from "./FilterGroupSection";
import {
  setFilterConfiguration,
  setSavedFilterData,
  resetFilterConfiguration,
  saveFilterUserConfiguration,
  setSelectedFilters,
} from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import SavedFilters from "./NewCoreComponentScreen/SavedFilters";
import UseSavedFilters from "./NewCoreComponentScreen/hooks/useSavedFilters";
import UseFilterPanelButton from "./NewCoreComponentScreen/hooks/useFilterPanelButton";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useDispatch } from "react-redux";
import { RESET_UPLOADED_FILTERS } from "core/actions/types";
import { MAX_SELECTION_SIZE } from "core/commonComponents/filters/Select/constants";
import StackedFiltersPanel from "./StackedFiltersPanel";
import { useTranslation } from "impact-ui-v3";

const iconMapping = {
  product: <CategoryOutlinedIcon />,
  custom: <TodayOutlinedIcon />,
  store: <StorefrontOutlinedIcon />,
  dc: <StorefrontOutlinedIcon />,
};

const FilterConfigurationMapping = (props) => {
  const {
    filterSelected,
    setFilterDependencyChips,
    filterSectionRadio,
    openModal,
    setOpenModal,
    keyboardShortcuts,
    disableFilterModal,
    stackedFiltersPanelConfigs,
    applyFilterHandlerRef,
    activeFilterDimensionRef,
    savedRecentFiltersListRef,
    showFilterLoader,
    setShowFilterLoader,
    isAutoApplyFilterRef,
    hideSavedFilterSection = false,
    firstTimeRender,
    setFirstTimeRenderLoader,
    setIsSuccessFullyApplied,
    setOriginalList,
  } = props;
  const dispatch = useDispatch();
  // Filter Variables

  const [mappingKeys, setMappingKeys] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveAs, setSaveAs] = useState(false);
  const [currentSelectedFilterName, setCurrentSelectedFilterName] = useState(
    ""
  );
  const [copySavedFilter, setCopySavedFilter] = useState("");
  const [filtersData, setFiltersData] = useState({
    filters: [],
    dimensionRequired: {},
    dimensionErrors: {},
  });
  const dimensionErrorsRef = useRef({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [activeTab, setActiveTab] = useState(filtersData.filters?.[0]?.value);

  const savedFilterSectionRef = useRef({});
  const savedFilterRef = useRef(() => {});
  const filterButtonRef = useRef(null);
  const copyFilterDetailsRef = useRef({});
  const manuallyChangesTabRef = useRef(false);
  const { t } = useTranslation();

  const isSavedFilterActive =
    activeFilter === "saved-filters" && !isEditModalOpen;

  useEffect(() => {
    if (disableFilterModal) {
      setActiveTab(filtersData.filters?.[0]?.value);
    }
  }, [filtersData?.filters?.length]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        anchorOrigin: {
          vertical: "top",
          horizontal: "right",
        },
      },
    });
  };
  const markDimensionErrors = (filterData, filterDependency) => {
    const dimensionErrors = getDimensionErrors(filterData, filterDependency);
    dimensionErrorsRef.current = dimensionErrors;
    setFiltersData(prev => ({ ...prev, dimensionErrors }));

    const updatedConfig = getUpdatedConfigWithErrors(props.filterDashboardConfiguration, dimensionErrors);
    let obj = {};
    obj[props.filterConfigKey] = {
      filterConfig: updatedConfig,
      appliedFilterData: props.appliedFilterData,
    };
    props.setFilterConfiguration(obj);
  };

  const clearDimensionErrors = () => {
    dimensionErrorsRef.current = {};
    setFiltersData(prev => ({ ...prev, dimensionErrors: {} }));
  };
  const onSaveFilterClickHandler = async (filterData) => {
    try {
      let filterDependency = getFilterSelectionDependency();

      // required check is ignoted if config type is global and no filter is selected- saved filter reset
      if (!(props.filterConfigType === "global" && isEmpty(filterDependency))) {
        // mandatory fields filled check
        if (!requiredFieldCheck(filterData, filterDependency)) {
          markDimensionErrors(filterData, filterDependency);
          // Triggered when user saves filter without selecting mandatory fields
          throw Error("Please select the required fields");
        }
      }

      if (props.filterSaveLevel === "mandatory") {
        filterDependency = getRequiredFilterList(filterData, filterDependency);
      }

      if (props.containsCustomFilterSection) {
        const {
          customFilterData,
          customFilterDependency,
        } = props.getCustomFilterDataAndDependency();
        filterData = [...filterData, ...customFilterData];
        filterDependency = [...filterDependency, ...customFilterDependency];
      }
      const allSavedFilterSelection = uniqBy(
        [...filterDependency],
        (obj) => obj.attribute_name + obj.dimension
      );

      if (props.filterConfigType === "global") {
        await saveFilterUserConfiguration({
          saved_filter_preference: allSavedFilterSelection,
        });
        displaySnackMessages(t("snackbarMessages.savedFilterSuccess"), "success");

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
      } else {
        if (props.savedFilterDashboard?.length === props.filterSaveLimit) {
          displaySnackMessages(
            t("snackbarMessages.filterSaveLimit", { limit: props.filterSaveLimit }),
            "warning"
          );
        } else {
          setIsEditModalOpen(true);
          manuallyChangesTabRef.current = true;
          setActiveFilter("saved-filters");
        }
        return;
      }
    } catch (err) {
      displaySnackMessages(err.message || t("snackbarMessages.somethingWentWrong"), "error");
    }
  };

  const recentFilterAddition = () => {
    if (
      savedRecentFiltersListRef?.current?.[0] &&
      savedRecentFiltersListRef?.current?.[0] != filterSelected
    ) {
      savedRecentFiltersListRef.current = [
        filterSelected,
        savedRecentFiltersListRef.current[0],
      ];
    } else {
      savedRecentFiltersListRef.current = [filterSelected];
    }
  };

  const onFilterClickHandler = async (
    filterData,
    customOnFilterFunc,
    customFilterDependency = [],
    updatedFilterConfig = {},
    savedFilterDependency = []
  ) => {
    try {
      if (filterSelected != "") recentFilterAddition();
      const shouldUpdateDimension =
        props.filterDashboardConfiguration[0].update_filter_dimension_on_apply;
      let dependencyData
      if(!isEmpty(savedFilterDependency)){
        dependencyData = savedFilterDependency
      } else {
        dependencyData = getFilterSelectionDependency();
      }
      if (
        props.enableFilterUpload &&
        !isEmpty(
          props?.filterReducer?.uploadedFilters?.[props?.filterConfigKey]
        )
      ) {
        const originalFilterData =
          props.filterDashboardConfiguration[0]?.originalFilterDashboardData;
        const uploadedFilters =
          props?.filterReducer?.uploadedFilters?.[props?.filterConfigKey];
        dependencyData = generateUploadedFilterDependency(
          originalFilterData,
          uploadedFilters
        );
      }
      if (!requiredFieldCheck(filterData, dependencyData)) {
        setIsSuccessFullyApplied(false);
        markDimensionErrors(filterData, dependencyData);
        throw Error("Please select the required fields"); // Triggered when user applied filter without selecting mandatory fields
      }

      // updating applied filters data in filter configuration
      clearDimensionErrors();
      setIsSuccessFullyApplied(true);
      updateFilterAppliedData(updatedFilterConfig);
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
      setShowFilterLoader(true);
      let filtersToFetchValues = [];
      let makeCallFor = false;
      // Checking if there is a need to make an cross-filter call for values of a filter
      dependencyData.forEach((depFilter) => {
        if (
          depFilter?.check_configuration?.length > 0 &&
          depFilter?.values?.length === MAX_SELECTION_SIZE
        ) {
          makeCallFor = depFilter?.attribute_name;
        }
      });
      // Updating payload for the separate cross-fitler api call
      dependencyData.forEach((depFilter) => {
        if (
          depFilter?.check_configuration?.length > 0 &&
          depFilter?.values?.length === MAX_SELECTION_SIZE
        ) {
          filtersToFetchValues.push({
            ...depFilter,
            column_name: depFilter?.attribute_name,
            values: [],
          });
        } else {
          filtersToFetchValues.push({
            ...depFilter,
            column_name: depFilter?.attribute_name,
            values: !isArray(depFilter?.values) ? [depFilter?.values] : depFilter?.values
          });
        }
      });
      let updatedData = dependencyData;
      // Cross-filter call for additional cases
      if (!!makeCallFor) {
        let payloads = {
          application_code: getApplicationCode(
            localStorage.getItem("currentScreenName")
          ),
          attributes: getfilterAttributeList(filtersToFetchValues),
          filter_type: "cascaded",
          filters: filtersToFetchValues,
          is_urm_filter: true,
          screen_name: localStorage.getItem("currentScreenName"),
        };
        let response = await getCombinedCrossDimensionFiltersData(payloads)();
        // Updated payload for the table data call
        if (response?.data?.status) {
          updatedData = dependencyData.map((item) => {
            if (item?.attribute_name === makeCallFor) {
              return {
                ...item,
                values: response?.data?.data?.[makeCallFor],
              };
            }
            return item;
          });
        }
      }
      setShowFilterLoader(false);
      //Pass the selected filters to filter function
      if (!isNil(shouldUpdateDimension) && !shouldUpdateDimension) {
        customOnFilterFunc(updatedData, filterData, filterSectionRadio);
      } else {
        //Pass the selected filters to filter function
        customOnFilterFunc(
          updateFilterDimension(updatedData, filterData, false, true),
          updateFilterDimension(filterData, filterData, true),
          filterSectionRadio
        );
      }
      if (!isAutoApplyFilterRef?.current) {
        setOpenModal(false);
      } else {
        isAutoApplyFilterRef.current = false;
      }
    } catch (err) {
      displaySnackMessages(err.message || t("snackbarMessages.somethingWentWrong"), "error");
    } finally {
      setShowFilterLoader(false);
      dispatch({
        type: RESET_UPLOADED_FILTERS,
      });
    }
  };

  const { handleOnClickSave } = UseSavedFilters({
    filterSelected,
    displaySnackMessages,
    filterSectionRadio,
    setShowFilterLoader,
    setIsEditModalOpen,
    savedFilterSectionRef,
    filterDashboardConfiguration: props.filterDashboardConfiguration,
    filterReducer: props.filterReducer,
    savedFilterData: props.savedFilterData,
    savedFilterDashboard: props.savedFilterDashboard,
    getFilterConfigurationData: props.getFilterConfigurationData,
    containsCustomFilterSection: props.containsCustomFilterSection,
    getCustomFilterDataAndDependency: props.getCustomFilterDataAndDependency,
    filterSaveLevel: props.filterSaveLevel,
    setFilterSelectedData: props.setFilterSelectedData,
    addSnack: props.addSnack,
    markDimensionErrors,
  });

  const {
    primaryButtonClickHandler,
    secondaryButtonClickHandler,
    ternaryButtonClickHandler,
    primaryButtonLabelHandler,
    secondaryButtonLabelHandler,
    ternaryButtonLabelHandler,
    quaternaryButtonLabelHandler,
    quaternaryButtonClickHandler,
  } = UseFilterPanelButton({
    isSavedFilterActive,
    currentSelectedFilterName,
    copySavedFilter,
    filterSelected,
    handleOnClickSave,
    setShowFilterLoader,
    setActiveFilter,
    setCopySavedFilter,
    isEditModalOpen,
    savedFilterRef,
    filtersData,
    setSaveAs,
    setIsEditModalOpen,
    activeFilter,
    setOpenModal,
    saveAs,
    savedFilterSectionRef,
    onFilterClickHandler,
    setCurrentSelectedFilterName,
    onSaveFilterClickHandler,
    onApplyFilter: props.onApplyFilter,
    originalList: props.originalList,
    setFilterSelectedData: props.setFilterSelectedData,
    triggerFilterApply: props.triggerFilterApply,
    firstTimeRender,
    setFirstTimeRenderLoader,
    setSelectedFilters: props.setSelectedFilters,
    filterConfigKey: props.filterConfigKey,
    filterReducer: props.filterReducer,
  });

  useEffect(() => {
    applyFilterHandlerRef.current = primaryButtonClickHandler;
  }, [primaryButtonClickHandler]);

  useEffect(() => {
    if (!manuallyChangesTabRef.current) {
      setIsEditModalOpen(false);
      setSaveAs(false);
      setCurrentSelectedFilterName("");
      setCopySavedFilter("");
      // props.setFilterSelectedData(
      //   savedFilterSectionRef.current?.previousFilterSelected || ""
      // );
    }
  }, [activeFilter]);

  const updateFilterAppliedData = (updatedFilterConfig) => {
    let updatedFilterConfigurations = cloneDeep(
      props.filterDashboardConfiguration
    );
    let updatedAppliedFilter = cloneDeep(props.appliedFilterData);
    updatedFilterConfigurations.forEach((item, index) => {
      if (
        index == filterSectionRadio ||
        updatedFilterConfigurations?.length === 1
      ) {
        if (
          props.enableFilterUpload &&
          !isEmpty(
            props?.filterReducer?.uploadedFilters?.[props?.filterConfigKey]
          )
        ) {
          const originalFilterData =
            props.filterDashboardConfiguration[0]?.originalFilterDashboardData;
          const uploadedFilters =
            props?.filterReducer?.uploadedFilters?.[props?.filterConfigKey];
          updatedAppliedFilter.dependencyData = generateUploadedFilterDependency(
            originalFilterData,
            uploadedFilters
          );
        } else {
          updatedAppliedFilter.dependencyData = getFilterSelectionDependency();
        }
        updatedAppliedFilter.filterHeader = filterSectionRadio;
      }
    });

    let obj = {};
    obj[props.filterConfigKey] = {
      filterConfig: updatedFilterConfigurations,
      appliedFilterData: updatedAppliedFilter,
    };
    props.setFilterConfiguration(isEmpty(updatedFilterConfig)? obj: updatedFilterConfig);
  };

  const getFilterSelectionDependency = () => {
    return getSelectedFiltersFromConfig(
      props.filterDashboardConfiguration,
      filterSectionRadio,
      props.filterReducer
    );
  };

  useEffect(() => {
    const newData = [];
    const dimensionRequired = {};

    if (props.filterDashboardConfiguration?.length) {
      props.filterDashboardConfiguration.forEach((filter, index) => {
        if (filter.filterDashboardClassification?.length) {
          filter.filterDashboardClassification.forEach((item) => {
            if (item.type === "separator") {
              newData.push({ type: "separator" });
              return;
            }
            newData.push({
              title: item.filterLabel,
              value: item.dimension,
              numberOfFilter: 0,
              id: item.dimension,
              required: false,
              item,
              filter,
            });
            filter.filterDashboardData.forEach((item) => {
              if (
                (item.is_required || item.is_mandatory || item.required) &&
                !dimensionRequired[item.dimension]
              ) {
                dimensionRequired[item.dimension] = true;
              }
            });
          });
        }
      });
    }

    const hasAnyFilterError = props.filterDashboardConfiguration?.some(
      (config) => config.filterDashboardData?.some((f) => f.isError)
    );
    if (!hasAnyFilterError) {
      dimensionErrorsRef.current = {};
    }

    const filtersNewData = {
      filters: newData,
      dimensionRequired,
      dimensionErrors: dimensionErrorsRef.current,
    };

    setFiltersData(filtersNewData);
    if (!activeFilter) {
      manuallyChangesTabRef.current = true;
      setActiveFilter(isEditModalOpen ? "saved-filters" : newData[0]?.value);
    }
  }, [props]);

  useEffect(() => {
    if (activeFilterDimensionRef?.current?.dimension) {
      setActiveFilter(activeFilterDimensionRef?.current?.dimension);
      activeFilterDimensionRef.current.dimension = "";
    }
  }, [activeFilterDimensionRef?.current?.dimension]);

  const allSelectedFiltersCount = {};
  filtersData.filters.forEach((filter) => {
    filter.filter.filterDashboardClassification.forEach((item) => {
      allSelectedFiltersCount[item.dimension] =
        props.selectedFilters?.[item.screenName]?.length || 0;
    });
  });

  if (disableFilterModal) {
    if (stackedFiltersPanelConfigs) {
      return (
        <StackedFiltersPanel
          {...props}
          alignClearButton={props.alignClearButton}
          filtersData={filtersData}
          firstTimeRender={firstTimeRender}
          setMappingKeys={setMappingKeys}
          setFilterDependencyChips={setFilterDependencyChips}
          setShowFilterLoader={setShowFilterLoader}
          showFilterLoader={showFilterLoader}
          filterSectionRadio={filterSectionRadio}
          isEditModalOpen={isEditModalOpen}
          disableFilterModal={disableFilterModal}
        />
      );
    } else {
      let tabPanels = {};
      let tabNames = [];
      filtersData?.filters?.map((filter) => {
        const tabName = { value: filter.value, label: filter.title };
        tabPanels[filter.value] = (
          <LoadingOverlay loader={props.firstTimeRenderLoader}>
            <FilterGroupSection
              {...props}
              alignClearButton={props.alignClearButton}
              item={filter.item}
              filter={filter.filter}
              setMappingKeys={setMappingKeys}
              setFilterDependencyChips={setFilterDependencyChips}
              setShowFilterLoader={setShowFilterLoader}
              showFilterLoader={showFilterLoader}
              filterSectionRadio={filterSectionRadio}
              isEditModalOpen={isEditModalOpen}
              disableFilterModal={disableFilterModal}
              formGroupHeader={filtersData?.filters?.length === 1 && props?.isFormComponent ? filtersData?.filters?.[0]?.title : false}
            />
          </LoadingOverlay>
        );
        tabNames.push(tabName);
      });
      return (
        <>
          {
            !(props?.isFormComponent === true && tabNames?.length === 1) &&
            <div className="filter-button-group">
              <ButtonGroup
              options={tabNames}
              selectedOption={activeTab}
              onChange={(_, val) => {
                setActiveTab(val);
              }}
            />
            </div>
          }
          {tabPanels[activeTab]}
          {props.onApplyFilter && (
            <Button
              onClick={() => primaryButtonClickHandler()}
              style={{
                marginTop: "28px",
              }}
            >
              {t("buttons.apply")}
            </Button>
          )}
        </>
      );
    }
  }

  // Filters Component
  const filtersComponentData = filtersData?.filters?.map((filter, index) => {
    if (filter.type === "separator") {
      return { type: "separator" };
    }
    return {
      children: (
        <div>
          <LoadingOverlay loader={props.firstTimeRenderLoader}>
            <FilterGroupSection
              {...props}
              alignClearButton={props.alignClearButton}
              item={filter.item}
              filter={filter.filter}
              setMappingKeys={setMappingKeys}
              setFilterDependencyChips={setFilterDependencyChips}
              setShowFilterLoader={setShowFilterLoader}
              showFilterLoader={showFilterLoader}
              filterSectionRadio={filterSectionRadio}
              isEditModalOpen={isEditModalOpen}
              disableFilterModal={disableFilterModal}
            />
          </LoadingOverlay>
        </div>
      ),
      id: filter.id,
      numberOfFilter: allSelectedFiltersCount?.[filter.value] || 0,
      required: filtersData.dimensionRequired?.[filter.value] || false,
      title: filter.title,
      value: filter.value,
      icon: iconMapping[filter.value] ?? iconMapping["custom"],
      error: !!filtersData.dimensionErrors?.[filter.value],
    };
  });

  if (props.customTopComponent) {
    filtersComponentData?.unshift({
      children: <div>{props.customTopComponent}</div>,
      id: props.topComponentLabel,
      numberOfFilter: props.topComponentNumberOfFilter || 0,
      required: props.topComponentRequired || false,
      title: props.topComponentLabel || "Top Filter",
      value: props.topComponentLabel || "top-filter",
      icon: props.topComponentIcon || iconMapping["custom"],
    });
  }

  if (props.customBottomComponent) {
    filtersComponentData?.push({
      children: <div>{props.customBottomComponent}</div>,
      id: props.bottomComponentLabel,
      numberOfFilter: props.bottomComponentNumberOfFilter || 0,
      required: props.bottomComponentRequired || false,
      title: props.bottomComponentLabel || "Bottom Filter",
      value: props.bottomComponentLabel || "bottom-filter",
      icon: props.bottomComponentIcon || iconMapping["custom"],
    });
  }

  if (!hideSavedFilterSection) {
    filtersComponentData?.push({ type: "separator" });
    filtersComponentData?.push({
      children: (
        <LoadingOverlay loader={props.firstTimeRenderLoader}>
          <SavedFilters
            addSnack={props.addSnack}
            originalList={props.originalList}
            isEditModalOpen={isEditModalOpen}
            filterDashboardData={
              props.filterDashboardConfiguration?.[0]?.filterDashboardData || []
            }
            setIsEditModalOpen={setIsEditModalOpen}
            showFilterLoader={showFilterLoader}
            manuallyChangesTabRef={manuallyChangesTabRef}
            handleOnClickSave={handleOnClickSave}
            setActiveFilter={setActiveFilter}
            savedFilterRef={savedFilterRef}
            setFilterSelectedData={props.setFilterSelectedData}
            filterSelected={props.filterSelected}
            filterSectionRadio={props.filterSectionRadio}
            getFilterConfigurationData={props.getFilterConfigurationData}
            filterConfigType={props.filterConfigType}
            hideSaveFilterSection={props.hideSaveFilterSection}
            filterDashboardConfiguration={props.filterDashboardConfiguration}
            filterReducer={props.filterReducer}
            savedFilterDashboard={props.savedFilterDashboard}
            setSavedFiltersList={props.setSavedFiltersList}
            containsCustomFilterSection={props.containsCustomFilterSection}
            filterSaveLevel={props.filterSaveLevel}
            getCustomFilterDataAndDependency={
              props.getCustomFilterDataAndDependency
            }
            currentSelectedFilterName={currentSelectedFilterName}
            setCurrentSelectedFilterName={setCurrentSelectedFilterName}
            copySavedFilter={copySavedFilter}
            setCopySavedFilter={setCopySavedFilter}
            copyFilterDetailsRef={copyFilterDetailsRef}
            savedFilterSectionRef={savedFilterSectionRef}
            saveAs={saveAs}
            filtersData={filtersData?.filters || []}
            setOriginalList={setOriginalList}
          />
        </LoadingOverlay>
      ),
      id: 6,
      numberOfFilter: props.originalList?.length || 0,
      required: false,
      title: t("filters.savedFilters"),
      value: "saved-filters",
      icon: <SaveOutlinedIcon />,
    });
  }

  if (openModal && filtersData.filters?.length) {
    return (
      <FilterPanel
        active={activeFilter}
        anchor="right"
        className=""
        isOpen={openModal}
        filters={filtersComponentData}
        handleClose={setOpenModal}
        onPrimaryButtonClick={() => primaryButtonClickHandler()}
        onSecondaryButtonClick={() => secondaryButtonClickHandler()}
        onTertiaryButtonClick={() => ternaryButtonClickHandler()}
        primaryButtonLabel={primaryButtonLabelHandler()}
        secondaryButtonLabel={
          props.hideSavedFilterSection ? null : secondaryButtonLabelHandler()
        }
        quaternaryButtonLabel={
          props.hideSavedFilterSection ? null : quaternaryButtonLabelHandler()
        }
        onQuaternaryButtonClick={() => quaternaryButtonClickHandler()}
        primaryButtonProps={{
          disabled: props.disableFilters || showFilterLoader,
          id: "filter-panel-primary-btn",
        }}
        secondaryButtonProps={{
          disabled: props.disableFilters || showFilterLoader,
        }}
        setActive={(select) => {
          manuallyChangesTabRef.current = false;
          setActiveFilter(select);
        }}
        size="large"
        tertiaryButtonLabel={ternaryButtonLabelHandler()}
        title={`${t("filters.filterPanel")}`}
        screenName={props?.screenName}
      />
    );
  }

  return null;
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
    triggerFilterApply: state.filterReducer.triggerFilterApply,
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
    setSelectedFilters: (data) => dispatch(setSelectedFilters(data)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FilterConfigurationMapping);
