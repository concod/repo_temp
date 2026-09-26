import React from "react";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Prompt } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
  formatSelectedFiltersData,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";

import {
  ADD_NEW_STORE,
  CONFIGURATION,
} from "../../../../constants-inventorysmart/routesConstants";
import {
  GO_TO_NEW_STORE_DASHBOARD_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  STORE_OPENING_FORM_CONSTANTS,
  NO_NEW_STORE_VALIDATION_MSG,
  USER_RESERVE_MANDATORY_FIELDS_MSG,
} from "../../../../constants-inventorysmart/stringConstants";
import {
  clearEditNewStoreData,
  setEditNewStoreData,
  setNewStoreModuleConfig,
} from "../../../../services-inventorysmart/New-Store/new-store-dashboard";
import {
  clearNewStoreDetails,
  fetchStoreAttributeList,
  getNewStoreListDetails,
  getStoreListDetails,
  saveStepOneFinalValues,
  setNewStoreDetailsForBackFlow,
  setNewStoreDetailsScreenLoader,
  setNewStoreFilterConfiguration,
  setNewStoreListItems,
} from "../../../../services-inventorysmart/New-Store/new-store-details";
import {
  configureAttributeOptions,
  isActionAllowedOnSubModule,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../../inventorysmart-utility";
import { getModuleBasedTenantConfig } from "../../../../services-inventorysmart/common/inventory-smart-common-services";
import { Divider } from "@mui/material";
import { saveNewStoreDetails } from "../../../../services-inventorysmart/New-Store/sister-store-mapping";
import { capitalize } from "core/Utils/formatter";

const useStyles = makeStyles(() => ({
  footer: {
    position: "fixed" /* Fix the container to the viewport */,
    bottom: "0" /* Align it to the bottom */,
    left: "60px" /* Align it to the left edge */,
    width: "calc(100% - 60px)" /* Make it span the full width */,
    backgroundColor: "white" /* Optional: Add a background color */,
    padding: "1rem" /* Optional: Add some padding */,
    display: "flex" /* Enable flexbox for button alignment */,
    justifyContent: "space-between" /* Place items with space between them */,
    alignItems: "center" /* Vertically align items in the center */,
    boxSizing: "border-box" /* Ensure padding is included in the width */,
  },
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
    margin: "1rem",
  },
  wrapper: {
    background: "white",
    borderRadius: "8px",
  },
}));

const StoreDetailsComponent = (props) => {
  const [openingDates, setOpeningDates] = useState({
    store_opening_date: "",
    reservation_date: "",
  });
  const [listOfNewStores, setListOfNewStores] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [storeDetailsFormConfig, setStoreDetailsFormConfig] = useState([]);
  const [storeDetailsFormValues, setStoreDetailsFormValues] = useState({});
  const [storeOpeningDateFormConfig, setStoreOpeningDateFormConfig] = useState(
    STORE_OPENING_FORM_CONSTANTS
  );
  const [enableValues, setEnableValues] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState([]);
  const [displayStoreDetails, setDisplayStoreDetails] = useState(false);
  const [loadFilters, setLoadFilters] = useState(false);
  const [filterDependency, setFilterDependency] = useState({});

  const navigate = useNavigate();
  let location = useLocation();

  const globalClasses = globalStyles();
  const classes = useStyles();

  const edit_store_id = location.state?.newStoreEditId;

  const isRedirectedFromDifferentPage =
    props.saveNewStoreDetailsForBackFlow?.filterConfig?.length > 0;

  /**
   * Calculate reservation date based on the store opening date and number of weeks
   * @param {string|Date} storeOpeningDate - The store opening date
   * @param {number} weeksOffset - Number of weeks before opening date (defaults to 2)
   * @param {boolean} enforceMinimumCurrentDate - Whether to enforce minimum current date
   * @returns {Date|string} The calculated reservation date
   */
  const calculateReservationDate = (
    storeOpeningDate,
    weeksOffset = 2,
    enforceMinimumCurrentDate = false
  ) => {
    const numberOfWeeks = props.reservationDateInWeeks || weeksOffset;
    const openDate = new Date(storeOpeningDate);
    const reservationDate = new Date(openDate);
    reservationDate.setDate(openDate.getDate() - numberOfWeeks * 7);

    if (enforceMinimumCurrentDate) {
      const currentDate = new Date();
      const formattedReservationDate = reservationDate
        .toISOString()
        .split("T")[0];
      const formattedCurrentDate = currentDate.toISOString().split("T")[0];
      const isReservationDateBeforeCurrent =
        formattedReservationDate < formattedCurrentDate;

      return isReservationDateBeforeCurrent
        ? formattedCurrentDate
        : formattedReservationDate;
    }

    return reservationDate;
  };

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        let reqBody = {
          module_name: "New Store",
          screen_name: "Inventorysmart Configurations New Store",
        };
        let response = await props.getModuleBasedTenantConfig(reqBody);
        props.setNewStoreModuleConfig(response);
      } catch (e) {
        props.handleErrorMessage(e);
      } finally {
        props.setNewStoreDetailsScreenLoader(false);
      }
    };
    fetchModuleConfigs();
  }, []);

  useEffect(() => {
    // Call the filter configuration and the cross filter API when its not in an edit state and only when we have to display the filter component
    const getInitialFilterConfiguration = async () => {
      try {
        setLoadFilters(true);
        if (
          props.filterDashboardConfiguration &&
          props?.filterDashboardConfiguration?.filterConfig?.[0]
            ?.originalFilterDashboardData?.length > 0
        ) {
          props.setNewStoreFilterConfiguration(
            props?.filterDashboardConfiguration?.filterConfig?.[0]
              ?.originalFilterDashboardData
          );
        } else {
          let response = await fetchFilterConfig(
            "Inventorysmart Configurations New Store"
          );
          props.setNewStoreFilterConfiguration(response);
        }
        setLoadFilters(false);
      } catch (e) {
        setLoadFilters(false);
        props.handleErrorMessage(e);
      }
    };
    !props.editNewStoreData &&
      props?.displayCrossFilters &&
      getInitialFilterConfiguration();
  }, [props.editNewStoreData, props?.displayCrossFilters]);

  useEffect(() => {
    if (
      (isEmpty(props.filterDashboardConfiguration) ||
        props.saveNewStoreDetailsForBackFlow?.filterConfig?.length) &&
      !isEmpty(props.newStoreFilterConfiguration)
    ) {
      props.setNewStoreDetailsScreenLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          const selectedFilters = isRedirectedFromDifferentPage
            ? cloneDeep(props.saveNewStoreDetailsForBackFlow?.filterConfig)
            : selected;
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.newStoreFilterConfiguration),
            appliedFilters: selectedFilters,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            customDependency: [getActiveEntityFilter("store")],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterConfigData = [
            {
              filterDashboardData: [...response],
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "createNewStoreFilterConfig",
            filterConfigData,
            "New Store Screen"
          );
          if (isRedirectedFromDifferentPage) {
            // on edit
            const formattedSelectedFilters = formatSelectedFiltersData(
              filterConfigData,
              "New Store Screen",
              selectedFilters
            );
            setFilterDependency(formattedSelectedFilters);
          }
          props.setFilterConfiguration(filterConfig);
          props.setNewStoreDetailsScreenLoader(false);
        } catch (e) {
          props.handleErrorMessage(e);
          props.setNewStoreDetailsScreenLoader(false);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.newStoreFilterConfiguration,
    props.savedFilterSelection,
    props.saveNewStoreDetailsForBackFlow,
  ]);

  useEffect(() => {
    (async () => {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        // create flow
        if (!props.editNewStoreData && !edit_store_id) {
          let listOfStores = await props.getNewStoreListDetails();
          props.setNewStoreListItems(listOfStores.data.data);
          if (
            props.displayCrossFilters !== undefined &&
            !props.displayCrossFilters
          )
            setDisplayStoreDetails(true); // Display store attributes in create flow for VS
        }
        // edit flow
        else {
          setDisplayStoreDetails(true);
          let listOfStores = await props.getStoreListDetails(edit_store_id);
          props.setNewStoreListItems(listOfStores.data.data);
        }
        props.setNewStoreDetailsScreenLoader(false);
      } catch (e) {
        props.handleErrorMessage(e);
        props.setNewStoreDetailsScreenLoader(false);
      }
    })();
  }, [
    props.editNewStoreData,
    edit_store_id,
    enableValues,
    props.displayCrossFilters,
  ]);

  useEffect(() => {
    // map labels based on tenant
    if (props.storeOpeningLabels?.length) {
      let storeOpeningConstants = props.storeOpeningLabels.map((obj) => {
        return {
          required: true,
          label: obj?.label,
          field_type: "DateTimeField",
          accessor: obj?.value,
          isDisabled: false,
          disablePast: true,
          extra: { disableOnlyPast: true },
          disableFuture: false,
        };
      });
      setStoreOpeningDateFormConfig(storeOpeningConstants);
    }
  }, [props.storeOpeningLabels]);

  useEffect(() => {
    if (!isEmpty(props.newStoreListItems)) {
      let listNewStores = [...props.newStoreListItems?.new_store_details];
      setListOfNewStores(listNewStores);
      let newStoreFormConfiguration = props.newStoreListItems?.new_store_form_config?.map(
        (config) => {
          if (config.accessor === props.storeCodeKeyName) {
            return {
              ...config,
              options: configureAttributeOptions(
                listNewStores.map((store) => store[props.storeCodeKeyName])
              ),
              isMulti: false,
              isSearchable: true,
              isClearable: false,
            };
          } else {
            return config;
          }
        }
      );
      if (enableValues) {
        newStoreFormConfiguration = newStoreFormConfiguration?.map((config) => {
          return {
            ...config,
            isDisabled: enableValues, //here it is not needed as we show only one store in edit flow
          };
        });
      }
      setStoreDetailsFormConfig(newStoreFormConfiguration);
      let storeDetailsStateValues = {};
      if (props.newStoreListItems?.new_store_details?.length) {
        Object.keys(props.newStoreListItems?.new_store_details[0]).forEach(
          (key) => {
            storeDetailsStateValues[key] = "";
          }
        );
        setStoreDetailsFormValues(storeDetailsStateValues);
      } else {
        props.displaySnackMessages(NO_NEW_STORE_VALIDATION_MSG, "error");
      }
    }
  }, [props.newStoreListItems, enableValues]);

  useEffect(() => {
    // Wait for all initial calls to be done and then pre populate the fields
    if (
      listOfNewStores?.length &&
      storeDetailsFormConfig?.length // check edit flow later
    ) {
      // to pre populate step 1, when user clicks on go back button in step 2
      if (
        props.screenNameNavigatedFrom &&
        props.screenNameNavigatedFrom === "sister-store-mapping" &&
        !isEmpty(props.saveNewStoreDetailsForBackFlow)
      ) {
        // to prepopulate attribute list filters when user is in edit state and clicks on go back button (restricting from selecting a new store code)
        if (
          !isEmpty(props.finalStoreDetailsStateValues) &&
          props.editNewStoreData
        ) {
          prepopulateStepOneValues(
            props.saveNewStoreDetailsForBackFlow,
            "edit"
          );
        }
        // not restricting the user from selecting a new store code as he is not in edit state
        else {
          prepopulateStepOneValues(
            props.saveNewStoreDetailsForBackFlow,
            "backFlow"
          );
        }
      }
      // edit flow
      if (
        isEmpty(props.screenNameNavigatedFrom) &&
        props.editNewStoreData &&
        !isEmpty(props.finalStoreDetailsStateValues) &&
        props.inventorysmartModulesPermission?.inventorysmart_configuration &&
        Object.keys(
          props.inventorysmartModulesPermission?.inventorysmart_configuration
        ).includes("New Store")
      ) {
        let saveStoreCodeToEdit = {
          ...props.finalStoreDetailsStateValues,
          form_attributes: listOfNewStores[0],
        };
        prepopulateStepOneValues(saveStoreCodeToEdit, "edit");
      }
    }
  }, [
    props.screenNameNavigatedFrom, // back flow
    props.saveNewStoreDetailsForBackFlow, // back flow
    listOfNewStores,
    storeDetailsFormConfig,
    props.editNewStoreData, // editflow
    props.finalStoreDetailsStateValues, // editflow
    props.inventorysmartModulesPermission,
  ]);

  useEffect(() => {
    if (
      props.inventorysmartModulesPermission?.inventorysmart_configuration &&
      Object.keys(
        props.inventorysmartModulesPermission?.inventorysmart_configuration
      ).includes("New Store")
    ) {
      let enableValues = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
        "edit"
      );
      setEnableValues(!enableValues);
    }
  }, [props.inventorysmartModulesPermission]);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };

  const prepopulateStepOneValues = (objectToPopulate, flowType) => {
    // Pre populate all the state values present
    // in case of backflow, reset the selected store details if the filters selected are different from what is present in props.saveNewStoreDetailsForBackFlow?.filterConfig
    if (!isEmpty(objectToPopulate?.filterConfig) && flowType === "backFlow") {
      setSelectedDependency(objectToPopulate?.filterConfig);
      const sortedFilers = objectToPopulate?.filterConfig
        ?.slice()
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      const sortedSelectedDependency = selectedDependency
        .slice()
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      if (
        sortedFilers.every(
          (obj, index) =>
            JSON.stringify(obj) ===
            JSON.stringify(sortedSelectedDependency[index])
        )
      ) {
        prepopulateStoreDetailsValues(objectToPopulate, flowType);
      } else {
        resetStoreDetailsData();
      }
    } else {
      prepopulateStoreDetailsValues(objectToPopulate, flowType);
    }
  };

  const prepopulateStoreDetailsValues = (objectToPopulate, flowType) => {
    let storeAttrsTimePeriod = objectToPopulate.other_attributes;
    const formAttrs = objectToPopulate.form_attributes;
    let storeDataAttrs = {
      ...Object.fromEntries(
        Object.entries(formAttrs).map(([key, value]) => [
          key,
          replaceSpecialCharacter(value),
        ])
      ),
    };
    setOpeningDates({
      store_opening_date: storeAttrsTimePeriod?.store_opening_date,
      reservation_date: storeAttrsTimePeriod?.reservation_date,
    });
    if (flowType === "edit") {
      if (props.disableEditStoreDetails) {
        storeOpeningDateFormConfig[0].isDisabled = true;
      } else storeOpeningDateFormConfig[0].isDisabled = enableValues;
      setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
    }
    setStoreDetailsFormValues(storeDataAttrs);
  };

  const handleChangeStoreDetails = async (updatedFormData, fieldType) => {
    if (fieldType === props.storeCodeKeyName) {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        let selectedStoreData = props.newStoreListItems?.new_store_details?.filter(
          (store) =>
            store[props.storeCodeKeyName] ===
            updatedFormData[props.storeCodeKeyName]
        )[0];
        if (
          props.setStoreOpening &&
          props.storeOpeningLabels.some(
            (item) => item.value === "reservation_date"
          )
        ) {
          const reservationDate = calculateReservationDate(
            selectedStoreData?.store_opening_date,
            2,
            true
          );
          setOpeningDates((prevState) => ({
            ...prevState,
            store_opening_date: selectedStoreData?.store_opening_date,
            reservation_date: reservationDate,
          }));
          storeOpeningDateFormConfig[1].minDate = new Date(
            selectedStoreData?.store_opening_date
          ); // reset to null when a new store code is selected
          setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
        } else {
          setOpeningDates((prevState) => ({
            ...prevState,
            store_opening_date: selectedStoreData?.store_opening_date,
          }));
        }
        let cloneStoreDetailsFormValues = cloneDeep(storeDetailsFormValues);
        Object.keys(cloneStoreDetailsFormValues).forEach((key) => {
          if (key === props.storeCodeKeyName) {
            cloneStoreDetailsFormValues[props.storeCodeKeyName] =
              updatedFormData[props.storeCodeKeyName];
          }
          // replace special characters with proper values
          else {
            cloneStoreDetailsFormValues[key] = replaceSpecialCharacter(
              selectedStoreData[key]
            );
          }
        });
        setStoreDetailsFormValues(cloneStoreDetailsFormValues);
        props.setNewStoreDetailsScreenLoader(false);
      } catch (e) {
        props.setNewStoreDetailsScreenLoader(false);
        props.handleErrorMessage(e);
      }
    } else setStoreDetailsFormValues(updatedFormData);
  };

  const handleChangeStoreOpeningDates = (updatedFormData, fieldType) => {
    if (fieldType === "reservation_date") {
      // store opening date should be greater than reservation date, hence we pass min starting date to Store opening date
      let reservationDateFormatted = new Date(updatedFormData.reservation_date);
      storeOpeningDateFormConfig[1].minDate = reservationDateFormatted;
      setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
      // resetting it as we set a new min Date for store_opening_date in the above line
      if (
        updatedFormData.store_opening_date &&
        moment(updatedFormData.store_opening_date).isBefore(
          reservationDateFormatted
        )
      ) {
        updatedFormData.store_opening_date = "";
        props.displaySnackMessages(
          `${capitalize(
            props.reservationDateLabel
          )} cannot be greater than or equal to store opening date`,
          "warning"
        );
      }
    }
    if (fieldType === "store_opening_date") {
      const reservationDate = calculateReservationDate(
        updatedFormData.store_opening_date,
        2,
        true
      );
      updatedFormData.reservation_date = reservationDate;
    }
    setOpeningDates(updatedFormData);
  };

  const validateStoreDetails = () => {
    let storeDetailsValidation = false;
    let openingDateValidation = false;
    storeDetailsValidation = !isEmpty(storeDetailsFormValues)
      ? Object.values(storeDetailsFormValues).some((val) => !val)
      : true;
    openingDateValidation =
      props.storeOpeningLabels?.length === 2
        ? isEmpty(openingDates.store_opening_date) ||
          isEmpty(openingDates.reservation_date)
        : isEmpty(openingDates.store_opening_date);
    if (storeDetailsValidation || openingDateValidation) {
      return { valid: false, message: USER_RESERVE_MANDATORY_FIELDS_MSG };
    } else if (props.storeOpeningLabels?.length === 2) {
      const reservationDate = new Date(openingDates.reservation_date);
      const storeOpeningDate = new Date(openingDates.store_opening_date);
      const timeDifference = storeOpeningDate - reservationDate;
      // Convert the difference from milliseconds to days
      const dayDifference = timeDifference / (1000 * 60 * 60 * 24);
      if (reservationDate >= storeOpeningDate) {
        return {
          valid: false,
          message: `${capitalize(
            props.reservationDateLabel
          )} cannot be greater than or equal to store opening date`,
        };
      } else if (dayDifference > 90) {
        return {
          valid: false,
          message: `The maximum gap between ${props.reservationDateLabel} and the store opening date cannot exceed 90 days`,
        };
      } else return { valid: true };
    } else return { valid: true };
  };

  const handleSaveChanges = async () => {
    const validation = validateStoreDetails();
    if (!validation.valid) {
      props.displaySnackMessages(validation.message, "warning");
      return;
    }
    try {
      props.setNewStoreDetailsScreenLoader(true);
      let reqBody = {
        table_row_attributes: [],
        other_attributes: {
          store_code: storeDetailsFormValues[props.storeCodeKeyName],
          store_opening_date: moment(openingDates.store_opening_date).format(
            "YYYY-MM-DD"
          ),
          sister_store_mapping_date: null,
          store_groups: [],
          store_group_mapping_date: null,
          status: 1,
        },
        store_code: storeDetailsFormValues[props.storeCodeKeyName],
      };
      let response = await props.saveNewStoreDetails(reqBody);
      if (response.data?.status || response.data?.show_message) {
        // navigate to configuration screen
        props.displaySnackMessages(response.data?.message, "info", () => {
          navigate(CONFIGURATION, {
            state: ADD_NEW_STORE,
          });
        });
        props.clearEditNewStoreData();
        props.clearNewStoreDetails();
      }
      props.setNewStoreDetailsScreenLoader(false);
    } catch (e) {
      props.handleErrorMessage(e);
      props.setNewStoreDetailsScreenLoader(false);
    }
  };

  const goToNextStep = () => {
    const validation = validateStoreDetails();
    if (!validation.valid) {
      props.displaySnackMessages(validation.message, "warning");
      return;
    }
    goToNextStepPayload();
  };

  const goToNextStepPayload = () => {
    let editableStoreAttr = props.newStoreListItems?.new_store_form_config
      ?.filter(
        (config) =>
          !config.isDisabled && config.accessor !== props.storeCodeKeyName
      )
      ?.map((attr) => attr.accessor);
    let storeAttrsList = [];
    Object.keys(storeDetailsFormValues)?.forEach((key) => {
      if (editableStoreAttr.includes(key)) {
        storeAttrsList.push({
          attribute_name: key,
          attribute_value: storeDetailsFormValues[key],
        });
      }
    });

    let body = {
      form_attributes: storeDetailsFormValues,
      other_attributes: {
        store_opening_date: moment(openingDates.store_opening_date).format(
          "YYYY-MM-DD"
        ),
        reservation_date: isEmpty(openingDates.reservation_date)
          ? ""
          : moment(openingDates.reservation_date).format("YYYY-MM-DD"),
      },
      // Editable attributes from store details form
      store_attributes: storeAttrsList,
    };
    if (
      props.editNewStoreData &&
      !isEmpty(props.finalStoreDetailsStateValues)
    ) {
      // Updating stepper payload with edit data & with changes made on current screen to carry forward the updated values to next step
      let sister_store_mapping_date = "",
        otherAttrsEdit = props.finalStoreDetailsStateValues?.other_attributes;
      sister_store_mapping_date =
        body.other_attributes.store_opening_date ===
        otherAttrsEdit?.store_opening_date // to add reservation date here in the payload
          ? otherAttrsEdit?.sister_store_mapping_date
          : "";
      body = {
        ...body,
        other_attributes: {
          ...props.finalStoreDetailsStateValues?.other_attributes,
          ...body.other_attributes,
          store_group_mapping_date: body.other_attributes.store_opening_date,
          sister_store_mapping_date: sister_store_mapping_date,
        },
        table_row_attributes:
          props.finalStoreDetailsStateValues?.table_row_attributes,
        store_code: props.finalStoreDetailsStateValues?.store_code,
      };
    }
    props.saveStepOneFinalValues(body);
    let reqBodyForBackFlow = {
      store_code: storeDetailsFormValues[props.storeCodeKeyName],
      filterConfig: selectedDependency,
      ...body,
    };
    props.setNewStoreDetailsForBackFlow(reqBodyForBackFlow);
    props.mapSisterStores();
  };

  const resetStoreDetailsData = () => {
    let storeDetailsStateValues = {};
    if (props.newStoreListItems?.new_store_details?.length) {
      Object.keys(props.newStoreListItems?.new_store_details[0]).forEach(
        (key) => {
          storeDetailsStateValues[key] = "";
        }
      );
    }
    setStoreDetailsFormValues(storeDetailsStateValues);
    setOpeningDates({ store_opening_date: "", reservation_date: "" });
  };

  const getNewStoresBasedOnFilters = (
    newStoreDetails,
    storeFilters,
    selectedDependency
  ) => {
    let selectedDependencies = {};
    selectedDependency.forEach((item) => {
      selectedDependencies[item.filter_id] = item.values;
    });
    let newStoresBasedOnFilters = newStoreDetails.filter((item) => {
      let isStoreValid = true;
      storeFilters.forEach((filter) => {
        if (typeof item[filter] === 'string') {
          if (item[filter] !== selectedDependencies[filter][0]) {
            isStoreValid = false;
          }
        } else if (Array.isArray(item[filter])) {
          const intersection = item[filter].filter(val => selectedDependencies[filter].includes(val));
          if (intersection.length === 0) {
            isStoreValid = false;
          }
        }
      });
      return isStoreValid;
    });
    return newStoresBasedOnFilters;
  };

  const setNewStoresBasedOnFilters = (filterDepValue) => {
    const storeFilters = filterDepValue.map((item) => item.filter_id);
    const newStoresBasedOnFilters = getNewStoresBasedOnFilters(
      props.newStoreListItems?.new_store_details || [],
      storeFilters,
      filterDepValue
    );
    if (newStoresBasedOnFilters?.length) {
      setListOfNewStores(newStoresBasedOnFilters);
      let newStoreFormConfiguration = storeDetailsFormConfig?.map((config) => {
        if (config.accessor === props.storeCodeKeyName) {
          return {
            ...config,
            options: configureAttributeOptions(
              newStoresBasedOnFilters?.map(
                (store) => store[props.storeCodeKeyName]
              )
            ),
            isMulti: false,
            isSearchable: true,
            isClearable: false,
          };
        } else return config;
      });
      setStoreDetailsFormConfig(newStoreFormConfiguration);
      setDisplayStoreDetails(true);
    } else {
      props.displaySnackMessages(NO_NEW_STORE_VALIDATION_MSG, "warning");
      let newStoreFormConfiguration = storeDetailsFormConfig?.map((config) => {
        if (config.accessor === props.storeCodeKeyName) {
          return {
            ...config,
            options: [],
          };
        } else return config;
      });
      setStoreDetailsFormConfig(newStoreFormConfiguration);
      setDisplayStoreDetails(false);
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    setSelectedDependency(dependencyData);
    setNewStoresBasedOnFilters(dependencyData);
  };

  return (
    <Loader loader={props.newStoreDetailsScreenLoader || loadFilters}>
      {!props.editNewStoreData && props?.displayCrossFilters && (
        <>
          <CoreComponentScreen
            showFilterDashboard={true}
            filterConfigKey={"createNewStoreFilterConfig"}
            onApplyFilter={onFilterDashboardClick}
            showChipsOnLoad={isRedirectedFromDifferentPage}
            chipsDependency={props.saveNewStoreDetailsForBackFlow?.filterConfig}
            filterDependency={filterDependency}
            contained={true}
          />
        </>
      )}
      {displayStoreDetails && (
        <>
          <div
            className={`${classes.wrapper} ${globalClasses.evenPaddingAround}`}
          >
            <b>Store Attributes</b>
            <div className={globalClasses.marginVertical1rem}>
              <Form
                layout={"vertical"}
                maxFieldsInRow={5}
                handleChange={handleChangeStoreDetails}
                fields={storeDetailsFormConfig}
                updateDefaultValue={false}
                defaultValues={storeDetailsFormValues}
                labelWidthSpan={2}
                fieldTypeWidthSpan={6}
              />
            </div>
            <Divider className={globalClasses.marginVertical2rem} />
            <b>Attributes</b>
            <div className={globalClasses.marginVertical1rem}>
              <Form
                layout={"vertical"}
                maxFieldsInRow={5}
                handleChange={handleChangeStoreOpeningDates}
                fields={storeOpeningDateFormConfig}
                updateDefaultValue={false}
                defaultValues={openingDates}
                labelWidthSpan={2}
                fieldTypeWidthSpan={6}
              ></Form>
            </div>
          </div>
          <div className={classes.footer}>
            <Button
              size="large"
              type="default"
              variant="secondary"
              id="store-details-back-button"
              onClick={() => setShowGoBackDialog(true)}
            >
              {"< Back to configuration"}
            </Button>
            <div style={{ display: "flex", gap: "1rem" }}>
              {props.showAdminAccess && (
                <Button
                  size="large"
                  type="default"
                  variant="primary"
                  id="store-details-save-button"
                  onClick={handleSaveChanges}
                  disabled={enableValues}
                >
                  Save
                </Button>
              )}
              <Button
                size="large"
                type="default"
                variant="primary"
                id="store-details-next-button"
                onClick={() => goToNextStep()}
              >
                {"Go to DC Config & Sister Stores Mapping >"}
              </Button>
            </div>
          </div>
        </>
      )}
      <Prompt
        isOpen={showGoBackDialog}
        title={"Go back"}
        onPrimaryButtonClick={() => {
          navigate(CONFIGURATION, {
            state: ADD_NEW_STORE,
          });
          props.clearEditNewStoreData();
          props.clearNewStoreDetails();
          setShowGoBackDialog(false);
        }}
        onSecondaryButtonClick={() => setShowGoBackDialog(false)}
        variant="warning"
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
      >
        {GO_TO_NEW_STORE_DASHBOARD_MESSAGE}
      </Prompt>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    newStoreDetailsScreenLoader:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .newStoreDetailsScreenLoader,
    newStoreListItems:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .newStoreListItems,
    newStoreFilterConfiguration:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .newStoreFilterConfiguration,
    saveNewStoreDetailsForBackFlow:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .saveNewStoreDetailsForBackFlow,
    editNewStoreData:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .editNewStoreData,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    storeOpeningLabels:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.storeOpeningLabelConstants,
    reservationDateInWeeks:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.reservationDateInWeeks,
    finalStoreDetailsStateValues:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .finalStoreDetailsStateValues,
    setStoreOpening:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.setStoreOpening,
    newStoreModuleConfig:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration["createNewStoreFilterConfig"],
    displayCrossFilters:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.displayCrossFilters,
    showAdminAccess:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.showAdminAccess,
    disableEditStoreDetails:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.disableEditStoreDetails,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setNewStoreDetailsScreenLoader: (body) =>
      dispatch(setNewStoreDetailsScreenLoader(body)),
    getNewStoreListDetails: (body) => dispatch(getNewStoreListDetails()),
    setNewStoreListItems: (body) => dispatch(setNewStoreListItems(body)),
    saveStepOneFinalValues: (body) => dispatch(saveStepOneFinalValues(body)),
    fetchStoreAttributeList: (body) => dispatch(fetchStoreAttributeList(body)),
    setNewStoreFilterConfiguration: (body) =>
      dispatch(setNewStoreFilterConfiguration(body)),
    clearNewStoreDetails: (body) => dispatch(clearNewStoreDetails(body)),
    clearEditNewStoreData: (body) => dispatch(clearEditNewStoreData(body)),
    setNewStoreDetailsForBackFlow: (body) =>
      dispatch(setNewStoreDetailsForBackFlow(body)),
    setEditNewStoreData: (body) => dispatch(setEditNewStoreData(body)),
    getStoreListDetails: (body) => dispatch(getStoreListDetails(body)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setNewStoreModuleConfig: (body) => dispatch(setNewStoreModuleConfig(body)),
    setFilterConfiguration: (body) => dispatch(setFilterConfiguration(body)),
    saveNewStoreDetails: (body) => dispatch(saveNewStoreDetails(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreDetailsComponent);
