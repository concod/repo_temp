import { cloneDeep, find, isEmpty, trim } from "lodash";
import { getSelectedFiltersFromConfig, requiredFieldCheck } from "../../utils";
import { getRequiredFilterList } from "core/commonComponents/coreComponentScreen/utils";
import {
  saveFilterUserConfiguration,
  updateFilterUserConfiguration,
} from "core/actions/filterAction";
import { isTextInputValid } from "core/Utils/form/form-helpers";
import { useTranslation } from "impact-ui-v3";

const UseSavedFilters = (props) => {
  const {
    displaySnackMessages,
    filterSectionRadio,
    setShowFilterLoader,
    setIsEditModalOpen,
    filterDashboardConfiguration,
    filterReducer,
    savedFilterData,
    savedFilterDashboard,
    getFilterConfigurationData,
    containsCustomFilterSection,
    getCustomFilterDataAndDependency,
    filterSaveLevel,
    setFilterSelectedData,
    addSnack,
    markDimensionErrors,
  } = props;
  const { t } = useTranslation();

  const saveFilterValidation = (formData) => {
    if (isEmpty(trim(formData?.filter_name))) {
      displaySnackMessages(t("filters.validFilterNameError"), "error");
      return false;
    }
     // String validation for user's input
    if (!isTextInputValid(formData?.filter_name, 4, 50, addSnack)) {
      return ;
    }
    return true;
  };

  const getFilterSelectionDependency = () => {
    return getSelectedFiltersFromConfig(
      filterDashboardConfiguration,
      filterSectionRadio,
      filterReducer
    );
  };

  const handleOnClickSave = (
    formData,
    isMakingClone = false,
    previousFilterName = "",
    copySavedFilter = false,
    isMakingDefault = false
  ) => {
    if (!saveFilterValidation(formData)) {
      return;
    }
    let currentSelectionConfig = find(savedFilterData, [
      "name",
      previousFilterName || formData.filter_name,
    ]);
    let isCloned = false;
    if (formData["screen_view_type"] || formData["users_view_type"]) {
      formData["applicable_to"] = `${formData["screen_view_type"]}${
        formData["users_view_type"] === "global" ? "_all_users" : ""
      }`;
    }
    if (
      (currentSelectionConfig?.is_broadcast &&
        formData?.users_view_type === "personal") ||
      isMakingClone
    ) {
      isCloned = true;
    }

    onEditFilterClick(
      formData,
      previousFilterName || formData.filter_name,
      isCloned,
      copySavedFilter,
      isMakingDefault
    );
  };

  // edit icon click action on saved filter chip
  const onEditFilterClick = async (
    formData,
    filterSelected,
    isCloned = false,
    copySavedFilter,
    isMakingDefault
  ) => {
    try {
      if (isEmpty(formData)) {
        displaySnackMessages(t("snackbarMessages.noUpdatesFound"), "warning");
        return;
      }

      // if (isCloned && filterSelected === formData.filter_name) {
      //   displaySnackMessages("Please provide a different config name", "error");
      //   return;
      // }

      let copySavedFiltersList = cloneDeep(savedFilterDashboard);
      let filterDependency = getFilterSelectionDependency();
      let currentCopySavedFilter = [];
      let {
        screen_name,
        filterData,
        saved_filter_screen_name,
      } = getFilterConfigurationData();

      if (isEmpty(formData.filter_name)) {
        displaySnackMessages(t("filters.validFilterNameError"), "error");
        return;
      }

      if (
        !requiredFieldCheck(filterData, filterDependency) &&
        !isMakingDefault
      ) {
        markDimensionErrors(filterData, filterDependency);
        // Triggered when user saves filter without selecting mandatory fields while editing a saved filter
        throw Error("Please select the required fields4");
      }

      if (containsCustomFilterSection) {
        const {
          customFilterData,
          customFilterDependency,
        } = getCustomFilterDataAndDependency();
        filterData = [...filterData, ...customFilterData];
        filterDependency = [...filterDependency, ...customFilterDependency];
      }

      if (filterSaveLevel === "mandatory") {
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
      if (copySavedFilter) {
        currentCopySavedFilter = copySavedFiltersList.filter(
          (filter) => filter.name === filterSelected
        );
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
          saved_filter_preference: copySavedFilter
            ? currentCopySavedFilter[0]?.saved_filter_preference || []
            : [...filterDependency],
          is_broadcast:
            formData?.applicable_to === "all_screen_all_users" ||
            formData?.applicable_to === "this_screen_all_users"
              ? true
              : false,
          description: formData.description || "",
        };
        await saveFilterUserConfiguration(newFilterDefault);
        displaySnackMessages(t("snackbarMessages.savedFilterSuccess"), "success");
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
              saved_filter_preference: isMakingDefault ? [...filter?.saved_filter_preference] : [...filterDependency],
              is_broadcast:
                formData?.applicable_to === "all_screen_all_users" ||
                formData?.applicable_to === "this_screen_all_users"
                  ? true
                  : false,
              description: formData.description || "",
            };
            filterCode = filter.fuc_code;
            return updatedFilterConfig;
          }
          return filter;
        });

        await updateFilterUserConfiguration(filterCode, updatedFilterConfig);
        displaySnackMessages(
          t("snackbarMessages.updatedFilterSuccess"),
          "success"
        );
      }

      setFilterSelectedData(formData.filter_name, true);
      setShowFilterLoader(false);
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : err?.message || t("snackbarMessages.somethingWentWrong");
      displaySnackMessages(errMsg, "error");
      setShowFilterLoader(false);
    }
  };

  return {
    handleOnClickSave,
  };
};

export default UseSavedFilters;
