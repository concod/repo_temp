import { setTriggerFilterApply } from "core/actions/filterAction";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { groupBy, cloneDeep, isArray } from "lodash";
import { mapDataToLabel } from "../../utils";
import { useTranslation } from "impact-ui-v3";

const UseFilterPanelButton = (props) => {
  const {
    isSavedFilterActive,
    currentSelectedFilterName, // The current filter name if applied via filterpanel
    copySavedFilter,
    filterSelected, // The current filter name if applied via filterStrip
    handleOnClickSave,
    setActiveFilter,
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
    onApplyFilter,
    originalList,
    setFilterSelectedData,
    setCopySavedFilter,
    triggerFilterApply,
    firstTimeRender,
    setFirstTimeRenderLoader,
    setSelectedFilters,
    filterConfigKey,
    filterReducer,
  } = props;

  const [applyFilter, setApplyFilter] = useState(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (applyFilter && !firstTimeRender) {
      setApplyFilter(false);
      dispatch(setTriggerFilterApply(false));
      onFilterClickHandler(
        filtersData?.filters?.[0]?.filter?.filterDashboardData,
        onApplyFilter
      );
    } else {
      dispatch(setTriggerFilterApply(false));
    }
  }, [triggerFilterApply, firstTimeRender]);

  const primaryButtonClickHandler = (savedFilterAndApplyFilter = false) => {
    if (
      (isSavedFilterActive && currentSelectedFilterName) ||
      savedFilterAndApplyFilter
    ) {
      if (
        filterSelected !== currentSelectedFilterName &&
        filterSelected !== savedFilterAndApplyFilter
      ) {
        setFilterSelectedData(
          currentSelectedFilterName || savedFilterAndApplyFilter
        );
        setApplyFilter(true);
        setFirstTimeRenderLoader(true);
      } else {
        if (savedFilterAndApplyFilter && filterSelected !== savedFilterAndApplyFilter) {
          setFilterSelectedData(savedFilterAndApplyFilter);
        }
        const createSelectedFilters = (screenNames, data) => {
          let filters = {}
          screenNames.forEach((screenName) => {
            const key = Object.keys(data).find((k) =>
              screenName.includes(k)
            );
            if (key) {
              filters = {
                ...filters,
                [screenName]: data[key]?.map((item) => {
                  return {
                    ...item,
                    filter_id: item?.attribute_name,
                  };
                }),
              }
            }
          });
          return filters
        };
        const currentFilter = originalList?.filter(
          (item) => item?.name === currentSelectedFilterName ||
            item?.name === filterSelected ||
            item?.name === savedFilterAndApplyFilter
        );
        const groupedFilterData = groupBy(
          currentFilter?.[0]?.saved_filter_preference,
          "dimension"
        );
        const screenNames =
          filtersData?.filters?.map(
            (item) => item?.item.screenName
          ) || [];
        const selectedFitlers = createSelectedFilters(screenNames, groupedFilterData);
        setSelectedFilters(selectedFitlers)
        const callbackMap = (filterReducer?.filterDashboardConfiguration?.[filterConfigKey]?.filterConfig?.[0]?.filterDashboardData || [])
          .reduce((map, item) => {
            if (item?.dropdownOpenCallback) {
              map[item.column_name] = item.dropdownOpenCallback;
            }
            return map;
          }, {});
        const config = filterReducer?.filterDashboardConfiguration?.[filterConfigKey]?.filterConfig?.[0]?.originalFilterDashboardData?.map(
          (item) => {
            const newItem = { ...item };
            if (newItem?.initialData?.length === 0) {
              let filterWithInitialData = currentFilter?.[0]?.saved_filter_preference?.filter(
                (ele) => {
                  return ele?.attribute_name === newItem?.column_name;
                }
              );
              if (filterWithInitialData?.length > 0) {
                if (isArray(filterWithInitialData?.[0]?.values)) {
                  let options = filterWithInitialData?.[0]?.values?.map((item) =>
                    mapDataToLabel(item)
                  );
                  newItem.initialData = options || [];
                }
                else {
                  newItem.initialData = [];
                }
              }
            }
            // Preserve dropdownOpenCallback using lookup map
            if (callbackMap[newItem?.column_name]) {
              newItem.dropdownOpenCallback = callbackMap[newItem.column_name];
            }
            return newItem;
          }
        );
        const updatedFilterConfig = cloneDeep(
          filterReducer?.filterDashboardConfiguration?.[filterConfigKey]
        );
        updatedFilterConfig.filterConfig[0].filterDashboardData = config;
        updatedFilterConfig.appliedFilterData.dependencyData = currentFilter?.[0]?.saved_filter_preference
          .filter(filterItem => 
            filterReducer?.filterDashboardConfiguration?.[filterConfigKey]?.filterConfig?.[0]?.filterDashboardData?.some(
              item => item?.column_name === filterItem?.attribute_name
            )
          )
          .map(filterItem => ({ ...filterItem, filter_id: filterItem?.attribute_name }))
        setActiveFilter(props?.filtersData?.filters?.[0]?.id)
        onFilterClickHandler(
          updatedFilterConfig.filterConfig[0].filterDashboardData,
          onApplyFilter,
          [],
          {
            [filterConfigKey]: updatedFilterConfig,
          },
          updatedFilterConfig.appliedFilterData.dependencyData
        );
      }
    } else if (isSavedFilterActive && copySavedFilter) {
      const filterDataNew =
        originalList.filter((item) => item.name === filterSelected)?.[0] || {};
      const data = {
        filter_name:
          savedFilterSectionRef.current?.copyFilterData?.filter_name || "",
        is_default_filter: savedFilterSectionRef.current?.copyFilterData?.is_default ?? true,
        users_view_type: filterDataNew.is_broadcast ? "global" : "personal",
        screen_view_type:
          filterDataNew.screen_code === 3 ? "all_screen" : "this_screen",
      };
      handleOnClickSave(data, true, copySavedFilter, true);
      setActiveFilter("saved-filters");
      setCopySavedFilter("");
    } else if (isSavedFilterActive) {
    } else if (isEditModalOpen && !filterSelected) {
      savedFilterRef?.current(true);
    } else if (
      (isEditModalOpen &&
        filterSelected &&
        activeFilter === "saved-filters" &&
        saveAs) ||
      (isEditModalOpen && filterSelected && activeFilter === "saved-filters")
    ) {
      if (saveAs) {
        handleOnClickSave(
          savedFilterSectionRef.current.newSavedFilterData,
          saveAs
        );
      } else {
        const filterDataNew =
          originalList.filter((item) => item.name === filterSelected)?.[0] ||
          {};
        const data = {
          filter_name: filterDataNew.name,
          is_default_filter: true,
          users_view_type: filterDataNew.is_broadcast ? "global" : "personal",
          screen_view_type:
            filterDataNew.screen_code === 3 ? "all_screen" : "this_screen",
        };
        savedFilterRef.current(
          false,
          activeFilter === "saved-filters" ? null : data,
          filterDataNew.name
        );
        setActiveFilter("saved-filters");
        setIsEditModalOpen(false);
      }
    } else if (isEditModalOpen && filterSelected) {
      onFilterClickHandler(
        filtersData?.filters?.[0]?.filter?.filterDashboardData,
        onApplyFilter
      );
    } else {
      onFilterClickHandler(
        filtersData?.filters?.[0]?.filter?.filterDashboardData,
        onApplyFilter
      );
    }
  };

  const secondaryButtonClickHandler = () => {
    if (
      (isEditModalOpen && !filterSelected) ||
      (isEditModalOpen && filterSelected && activeFilter === "saved-filters")
    ) {
      setSaveAs(false);
      setActiveFilter("saved-filters");
      setIsEditModalOpen(false);
    } else if (isSavedFilterActive && currentSelectedFilterName) {
      setIsEditModalOpen(false);
      setCurrentSelectedFilterName("");
      setFilterSelectedData(
        savedFilterSectionRef.current?.previousFilterSelected || ""
      );
      savedFilterSectionRef.current = {
        ...savedFilterSectionRef.current,
        previousFilterSelected: "",
      };
    } else if (isEditModalOpen && filterSelected) {
      const filterDataNew =
        originalList.filter((item) => item.name === filterSelected)?.[0] || {};
      const data = {
        filter_name: filterDataNew.name,
        is_default_filter: filterDataNew?.is_default ?? true,
        users_view_type: filterDataNew.is_broadcast ? "global" : "personal",
        screen_view_type:
          filterDataNew.screen_code === 3 ? "all_screen" : "this_screen",
      };

      handleOnClickSave(
        activeFilter === "saved-filters" ? null : data,
        false,
        filterDataNew.name
      );
      setActiveFilter("saved-filters");
      setIsEditModalOpen(false);
    } else if (isSavedFilterActive) {
    } else {
      onSaveFilterClickHandler(
        filtersData?.filters?.[0]?.filter?.filterDashboardData
      );
    }
  };

  const ternaryButtonClickHandler = () => {
    if (isSavedFilterActive && copySavedFilter) {
      setActiveFilter("saved-filters");
      setIsEditModalOpen(false);
      setCopySavedFilter("");
    } else if (isSavedFilterActive || (isEditModalOpen && !filterSelected)) {
    } else if (
      isEditModalOpen &&
      filterSelected &&
      activeFilter != "saved-filters"
    ) {
      setIsEditModalOpen(false);
      setCurrentSelectedFilterName("");
      setFilterSelectedData(
        savedFilterSectionRef.current?.previousFilterSelected || ""
      );
      savedFilterSectionRef.current = {
        ...savedFilterSectionRef.current,
        previousFilterSelected: "",
      };
    } else {
      setOpenModal(false);
    }
  };

  const quaternaryButtonClickHandler = () => {
    if (isEditModalOpen && filterSelected && activeFilter != "saved-filters") {
      setActiveFilter("saved-filters");
      setSaveAs(true);
    }
  };

  const primaryButtonLabelHandler = () => {
    let label = "";
    if (isSavedFilterActive && currentSelectedFilterName) {
      label = t("filters.applyFilter");
    } else if (isSavedFilterActive && copySavedFilter) {
      label = t("filters.saveFilter");
    } else if (isSavedFilterActive) {
    } else if (isEditModalOpen && !filterSelected) {
      label = t("filters.saveFilter");
    } else if (
      (isEditModalOpen &&
        filterSelected &&
        activeFilter === "saved-filters" &&
        saveAs) ||
      (isEditModalOpen && filterSelected && activeFilter === "saved-filters")
    ) {
      label = t("button.save");
    } else if (isEditModalOpen && filterSelected) {
      label = t("buttons.apply");
    } else if (isEditModalOpen) {
    } else {
      label = t("filters.applyFilter");
    }
    return label;
  };

  const secondaryButtonLabelHandler = () => {
    let label = "";

    if (
      (isEditModalOpen && !filterSelected) ||
      (isEditModalOpen && filterSelected && activeFilter === "saved-filters")
    ) {
      label = t("button.back");
    } else if (isSavedFilterActive && currentSelectedFilterName) {
      label = t("buttons.cancel");
    } else if (isEditModalOpen && filterSelected) {
      label = t("buttons.save");
    } else if (isSavedFilterActive) {
    } else {
      label = t("filters.saveFilter");
    }
    return label;
  };

  const ternaryButtonLabelHandler = () => {
    let label = "";
    if (isSavedFilterActive && copySavedFilter) {
      label = t("button.back");
    } else if (
      isSavedFilterActive ||
      (isEditModalOpen && !filterSelected) ||
      (isEditModalOpen && filterSelected && activeFilter == "saved-filters")
    ) {
    } else if (
      isEditModalOpen &&
      filterSelected &&
      activeFilter != "saved-filters"
    ) {
      label = t("buttons.cancel");
    } else {
      label = t("buttons.cancel");
    }
    return label;
  };

  const quaternaryButtonLabelHandler = () => {
    let label = "";
    if (isEditModalOpen && filterSelected && activeFilter != "saved-filters") {
      label = t("filters.saveAs");
    }
    return label;
  };

  return {
    primaryButtonClickHandler,
    secondaryButtonClickHandler,
    ternaryButtonClickHandler,
    primaryButtonLabelHandler,
    secondaryButtonLabelHandler,
    ternaryButtonLabelHandler,
    quaternaryButtonLabelHandler,
    quaternaryButtonClickHandler,
  };
};

export default UseFilterPanelButton;
