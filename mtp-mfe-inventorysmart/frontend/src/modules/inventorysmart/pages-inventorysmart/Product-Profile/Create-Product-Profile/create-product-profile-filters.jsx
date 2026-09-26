import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { Typography, Divider, Grid, Container } from "@mui/material";
import { isEmpty, cloneDeep } from "lodash";
import moment from "moment";
import { Button, Breadcrumbs, RadioButtonGroup, Slider, Stepper, Chips } from "impact-ui-v3";

import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";
import {
  getAllFilters,
  setFilterConfiguration,
} from "core/actions/filterAction";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { checkForSpecialCharacters } from "core/Utils/functions/utils";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import colours from "core/Styles/colours";
import NotFound from "core/commonComponents/notFound/NotFound";
import {
  formattedFilterConfiguration,
  formatSelectedFiltersData,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { getPSMItineraryConfig } from "core/actions/tenantConfigActions";

import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
  getModuleBasedTenantConfig,
} from "../../../services-inventorysmart/common/inventory-smart-common-services";
import {
  CREATE_PRODUCT_PROFILE_FORM,
  CREATE_PRODUCT_PROFILE_TIME_PERIOD_DROP_DOWN,
  CREATE_PRODUCT_PROFILE_TIME_PERIOD_DATE_PICKER,
  CREATE_PRODUCT_PROFILE_PRODUCT_ATTRIBUTE,
  ERROR_MESSAGE,
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  PRODUCT_PROFILE_CACHE,
  MIN_MAX_VALIDATION,
  MAX_VALIDATION_MESSAGE,
  FILL_MANDATORY_FIELDS,
  PRODUCT_PROFILE_NAME_VALIDATION,
  NO_CHANGES_SAVED,
} from "../../../constants-inventorysmart/stringConstants";
import { PRODUCT_PROFILE } from "../../../constants-inventorysmart/routesConstants";
import {
  setNewProductProfileFilterConfiguration,
  setNewProductProfileLoader,
  setProductsToSelectForProductProfile,
  getProductsToSelectForProductProfile,
  setProductsStoreSizePenetration,
  getProductsStoreSizePenetration,
  saveProductProfile,
  resetCreateProductProfile,
  saveEditedProductProfile,
  setCreatePPFilterDependency,
  setCreateProductProfileModuleConfig,
} from "../../../services-inventorysmart/Product-Profile/create-product-profile-service";
import SelectProductTableComponent from "./select-product-table";
import StorePriceContributionComponent from "./store-price-contribution-table";
import {
  isActionAllowedOnSubModule,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import { DEFAULT_DATE_FORMAT } from "config/constants";
import {
  setKeyValueInCache,
  clearActiveModuleCache,
} from "../../../services-inventorysmart/active-module-common-service";
import { getTenantTimeZoneDetails } from "../../../../../core/commonComponents/coreComponentScreen/utils";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const customStyles = makeStyles((theme) => ({
  contentPadding: {
    padding: "24px 16px 0px 16px",
    width: "30%",
  },
  sliderInputCss:{
    "& .impact_slider_layout .input_layout_style .MuiFormControl-root .MuiInputBase-root":{
      marginRight:"8px !important"
    }
  },
  timePeriodFormStyle: {
    padding: "1rem",
    display: "flex",
    alignItems: "center",
  },
  timePeriodFormContainer: {
    marginRight: "1rem",
  },
  setMarginForButtons: {
    marginRight: "1rem",
  },
  marginRightText: {
    marginRight: "2rem",
  },
  warningText: {
    color: theme.palette.error.main,
    marginTop: "0.5rem",
  },
  priceAttributeLayout: {
    display: "flex",
    alignItems: "center",
  },
  bottomRightBorder: {
    borderBottom: `1px solid #D4D4D4`,
    borderRight: "1px solid #D4D4D4",
    borderRadius: "4px",
  },
  marginTopSwitch: {
    marginTop: "16px",
  },
  wrapper: {
    background: "white",
    borderRadius: "8px",
  },
  timeWrapper: {
    background: "#f8f9fb",
    borderRadius: "8px",
  },
  breadCrumbStyle: {
    padding: "1.5rem 1.5rem 0 1.5rem",
    "& .ia-styles.ia-breadcrumb.ia-breadcrumb-noLink": {
      fontWeight: 700,
    },
  },
  attributesContainer: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "2rem",
    padding: "16px",
  },
  flexEqual: {
    flex: 1,
  },
  chipHorizontalContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "nowrap",
  },
  chipSubtitle: {
    whiteSpace: "nowrap",
  },
  chipsWrapper: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  verticalDivider: {
    margin: "0 2rem",
  },
  paddingBottom2: {
    paddingBottom: "1.5rem",
  },
  stepOneContent: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
}));

const CreateProductProfileFilters = (props) => {
  const [productProfileForm, setProductProfileForm] = useState({
    profileName: "",
    profileDescription: "",
  });
  const [
    productProfileSaleAttribute,
    setProductProfileSaleAttribute,
  ] = useState({});
  const [
    productProfileProductAttribute,
    setProductProfileProductAttribute,
  ] = useState({
    price: { value: [0, 0], range_min: 0, range_max: "" },
  });
  const [productProfileTimePeriod, setProductProfileTimePeriod] = useState({});
  const [productProfileRangePeriod, setProductProfileRangePeriod] = useState(
    {}
  );
  const [timePeriodToggle, setTimePeriodToggle] = useState(true);
  const [displaySelectProductsTable, setDisplaySelectProductsTable] = useState(
    false
  );
  const [
    displayStorePriceContributionTable,
    setDisplayStorePriceContributionTable,
  ] = useState(false);
  const [productStoreFilterConfig, setProductStoreFilterConfig] = useState([]);
  const [showFiltersErrorMessage, setShowFiltersErrorMessage] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const [timePeriodDropDownOptions, setTimePerioDropDownOptions] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [psmItineraryConfig, setPsmItineraryConfig] = useState({});
  const [stepperSteps, setStepperSteps] = useState([
    {
      label: "Basic information",
      isEditable: true,
      isCompleted: false,
    },
    {
      label: "Product and store",
      isEditable: true,
      isCompleted: false,
    },
  ]);

  const classes = customStyles();
  const invClasses = useStyles()
  const globalClasses = globalStyles();
  const selectedArticleListRef = useRef([]);
  const uniqueArticleKey = props.createPPTenantAttrs?.pp_unique_id || "article";

  const { tenantDateFormat } = getTenantTimeZoneDetails();

  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: `${dynamicLabelsBasedOnTenant("article")} Profile`,
      to: PRODUCT_PROFILE,
    },
    {
      label: `Create ${dynamicLabelsBasedOnTenant("article")} Profile`,
      to: "#",
    },
  ];

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setNewProductProfileLoader(false);
  };

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        props.setNewProductProfileLoader(true);
        let response = await props.getModuleBasedTenantConfig({
          module_name: "Create Product Profile Form",
          screen_name: props.screenName,
        });
        props.setCreateProductProfileModuleConfig(response);
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setNewProductProfileLoader(false);
      }
    };
    fetchModuleConfigs();

    getPSMItineraryConfig().then(config => {
      setPsmItineraryConfig(config || {});
      const useItineraryValue = config?.[0]?.attribute_value?.use_itinerary;
      if (useItineraryValue === true) {
        setStepperSteps(prev => prev.map((step, index) => 
          index === 1 ? { ...step, label: "Product and ship" } : step
        ));
      }
    }).catch(error => {
      console.error('Error fetching PSM Itinerary Config:', error);
    });
  }, []);

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = await getModuleLevelAccessUtility({
              app: APP_NAME,
              module: subModules,
            })();
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }

          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (e) {
          handleErrorMessage(e);
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
    }
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setNewProductProfileLoader(true);
        let response = await getAllFilters("create product profile")();
        props.setNewProductProfileFilterConfiguration(response.data.data);
        props.setNewProductProfileLoader(false);
      } catch (e) {
        props.setNewProductProfileLoader(false);
        handleErrorMessage(e);
      }
    };
    getInitialFilterConfiguration();
    return () => {
      props.location.state = {};
      props.resetCreateProductProfile();
      props.clearActiveModuleCache(PRODUCT_PROFILE_CACHE);
    };
  }, []);

  useEffect(() => {
    if (
      (isEmpty(props.filterDashboardConfiguration) ||
        props.createPPFilterDependency?.length) &&
      !isEmpty(props.newProductProfileFilterConfiguration)
    ) {
      props.setNewProductProfileLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          const isRedirectedFromDifferentPage =
            props.createPPFilterDependency?.length > 0;
          const selectedFilters = isRedirectedFromDifferentPage
            ? cloneDeep(props.createPPFilterDependency)
            : selected;
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.newProductProfileFilterConfiguration),
            appliedFilters: selectedFilters,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterConfigData = [
            {
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "createProductProfileFilterConfiguration",
            filterConfigData,
            "Create Product Profile Screen",
            selectedFilters
          );
          setProductStoreFilterConfig(selectedFilters);
          if (isRedirectedFromDifferentPage) {
            // on edit
            const formattedSelectedFilters = formatSelectedFiltersData(
              filterConfigData,
              "Create Product Profile Screen",
              selectedFilters
            );
            setFilterDependency(formattedSelectedFilters);
          }
          props.setFilterConfiguration(filterConfig);
          props.setNewProductProfileLoader(false);
          setShowFiltersErrorMessage(false);
        } catch (e) {
          setShowFiltersErrorMessage(true);
          props.setNewProductProfileLoader(false);
          handleErrorMessage(e);
        }
      };
      getFilterValues(props.savedFilterSelection);
    } else {
      // to pre-populate store and prod filters from saved filters when user has already visited this screen once i.e when props.filterDashboardConfiguration is not empty
      setProductStoreFilterConfig(props.savedFilterSelection);
    }
  }, [
    props.newProductProfileFilterConfiguration,
    props.savedFilterSelection,
    props.createPPFilterDependency,
  ]);

  useEffect(() => {
    if (props.createPPTenantAttrs) {
      // removing the additional sales attribute on basis of tenant
      if (props.createPPTenantAttrs?.salesAttributes?.length) {
        setInitialSalesAttrValue();
      }
      // Set range_max and value for slider
      setProductProfileProductAttribute((prev) => {
        const updated = {
          ...prev,
          price: {
            ...prev.price,
            range_max: props.createPPTenantAttrs?.maxPriceAttribute,
            value: [
              prev.price?.value?.[0],
              prev.price?.value?.[1]
                ? prev.price?.value?.[1]
                : props.createPPTenantAttrs?.maxPriceAttribute,
            ],
          },
        };
        return updated;
      });
    }
  }, [props.createPPTenantAttrs]);

  useEffect(() => {
    const onLoad = async () => {
      if (!isEmpty(props.location.state) && isEmpty(filterDependency)) {
        let name = props.location.state.name;
        let desc = props.location.state.description;
        setDateTypeValeOnEdit(props.location.state);
        // setting filters
        setPreSelectedFilters(props.location.state);
        setProductProfileForm({
          ...productProfileForm,
          profileName: name,
          profileDescription: desc,
        });
        let salesAttributes = {};
        if (props.createPPTenantAttrs?.salesAttributes?.length) {
          let parseData = props.location.state?.sales_attribute?.map((item) => {
            return {
              [item]: true,
            };
          });
          salesAttributes = Object.assign({}, ...parseData);
        }
        setProductProfileSaleAttribute(salesAttributes);
        // Set slider value from edit state
        setProductProfileProductAttribute((prev) => ({
          price: {
            ...prev.price,
            value: [
              Number(props.location.state.min_price),
              Number(props.location.state.max_price),
            ],
          },
        }));
      }
    };
    onLoad();
  }, [props.location.state, filterDependency]);

  useEffect(() => {
    let dynamicDropDownConfig = [
      ...CREATE_PRODUCT_PROFILE_TIME_PERIOD_DROP_DOWN,
    ];
    if (props.productProfileTimePeriodOptions?.length) {
      dynamicDropDownConfig[0].options = props.productProfileTimePeriodOptions.map(
        (item) => {
          return mapDataToLabel(item);
        }
      );
    }
    setTimePerioDropDownOptions(dynamicDropDownConfig);
  }, [props.productProfileTimePeriodOptions]);

  const updateStepperSteps = (currentStep) => {
    setStepperSteps((prevSteps) => {
      return prevSteps.map((step, index) => {
        if (currentStep > index) {
          return {
            ...step,
            isCompleted: true,
          };
        } else {
          return {
            ...step,
            isCompleted: false,
          };
        }
      });
    });
  };

  const setDateTypeValeOnEdit = (editState) => {
    let dateType = {};
    if (editState?.date_type === "dynamic") {
      dateType = {
        productProfileTimePeriod: editState?.date_value,
      };
      setTimePeriodToggle(true);
      setProductProfileTimePeriod(dateType);
    } else {
      let splitDate = editState.date_value.split(" to ");
      // Parse the date strings using moment with the correct format
      // Get the format from tenant date format or default to DD-MM-YYYY
      const format = tenantDateFormat || "DD-MM-YYYY";
      let start = moment(splitDate[0], format);
      let end = moment(splitDate[1], format);

      // Check if dates are valid
      if (start.isValid() && end.isValid()) {
        // Convert to week boundaries if needed
        const startOfWeek = start.clone().startOf("week");
        const endOfWeek = end.clone().endOf("week");

        dateType = {
          productProfileRangePeriod: [startOfWeek, endOfWeek],
        };
        setTimePeriodToggle(false);
        setProductProfileRangePeriod(dateType);
      }
    }
  };

  const setPreSelectedFilters = (editState) => {
    let product_hierarchy_filters = editState.product_hierarchy_filters.filter(
      (item) => item.attribute_name !== "product_codes"
    );
    let preSelectedDependency = [
      ...product_hierarchy_filters,
      ...editState.store_hierarchy_filters,
    ];
    preSelectedDependency = preSelectedDependency.map((item) => {
      return {
        ...item,
        filter_id: item.attribute_name,
        filter_type: "cascaded",
        display_type: "dropdown",
      };
    });
    setProductStoreFilterConfig(preSelectedDependency);
    props.setCreatePPFilterDependency(preSelectedDependency);
  };

  const handleChange = (updatedFormData) => {
    setProductProfileForm(updatedFormData);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };

  const handleChangeProductAttributes = (updatedFormData) => {
    setProductProfileProductAttribute((prev) => {
      // Merge with previous state while preserving all price properties
      const merged = { ...prev };

      if (updatedFormData.price) {
        // Preserve range_min and range_max from previous state, update value
        merged.price = {
          range_min: prev.price?.range_min !== undefined ? prev.price.range_min : updatedFormData.price.range_min,
          range_max: prev.price?.range_max !== undefined ? prev.price.range_max : updatedFormData.price.range_max,
          value: updatedFormData.price.value,
        };
      }
      return merged;
    });
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };

  const handleChipClick = (attribute) => {
    const currentSelected = productProfileSaleAttribute;
    const isSelected = currentSelected[attribute];
    
    let updatedSelection;
    if (isSelected) {
      const { [attribute]: removed, ...rest } = currentSelected;
      updatedSelection = rest;
    } else {
      updatedSelection = {
        ...currentSelected,
        [attribute]: true
      };
    }
    
    setProductProfileSaleAttribute(updatedSelection);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };

  const handleChangeProductProfileTimePeriod = (updatedFormData) => {
    setProductProfileTimePeriod(updatedFormData);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };
  const handleChangeProductProfileRangePeriod = (updatedFormData) => {
    if (displaySelectProductsTable) {
      flushTableValues();
    }

    // Validate input structure
    if (!updatedFormData || !updatedFormData.productProfileRangePeriod) {
      setProductProfileRangePeriod({});
      return;
    }

    const rangePeriod = updatedFormData.productProfileRangePeriod;

    // Validate array structure
    if (!Array.isArray(rangePeriod) || rangePeriod.length !== 2) {
      setProductProfileRangePeriod({});
      return;
    }

    // Check for null/undefined values
    if (rangePeriod.some((item) => item === null || item === undefined)) {
      setProductProfileRangePeriod({});
      return;
    }

    // Convert to moment objects and validate
    const startDate = moment(rangePeriod[0]);
    const endDate = moment(rangePeriod[1]);

    if (!startDate.isValid() || !endDate.isValid()) {
      setProductProfileRangePeriod({});
      return;
    }

    // Set the dates with week boundaries
    const startOfWeek = startDate.startOf("week");
    const endOfWeek = endDate.endOf("week");

    setProductProfileRangePeriod({
      productProfileRangePeriod: [startOfWeek, endOfWeek],
    });
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const flushTableValues = () => {
    setDisplayStorePriceContributionTable(false);
    setDisplaySelectProductsTable(false);
    selectedArticleListRef.current = [];
  };

  const onProceed = async () => {
    let mandatoryFieldsFilled = checkForMandatoryFields();
    if (mandatoryFieldsFilled.mandatoryCheck) {
      displaySnackMessages(FILL_MANDATORY_FIELDS, "error");
    } else if (mandatoryFieldsFilled.expressionCheck) {
      displaySnackMessages(PRODUCT_PROFILE_NAME_VALIDATION, "warning");
    } else if (mandatoryFieldsFilled.minMaxValueCheck) {
      displaySnackMessages(MIN_MAX_VALIDATION, "warning");
    } else if (mandatoryFieldsFilled.maxValueCheck) {
      displaySnackMessages(
        MAX_VALIDATION_MESSAGE + props.createPPTenantAttrs?.maxPriceAttribute,
        "warning"
      );
    } else if (
      !timePeriodToggle &&
      productProfileRangePeriod?.productProfileRangePeriod[1].isAfter(moment())
    ) {
      displaySnackMessages("End date cannot be in the future", "warning");
    } else {
      if (isEmpty(selectedArticleListRef.current)) {
        if (!displaySelectProductsTable) {
          setActiveStep(1);
          updateStepperSteps(1);
          callOnProceed();
        }
        else displaySnackMessages("Select at-least one product", "error");
      }
      // call store size contribution api once table has some selections
      else {
        fetchStoreSizeContribution();
      }
    }
  };

  const fetchDateValues = () => {
    let startDate = "",
      endDate = "";
    if (timePeriodToggle) {
      let today = new Date();
      let dd = String(today.getDate()).padStart(2, "0");
      let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      let yyyy = today.getFullYear();
      // will use this once we have data for the selected range
      endDate = yyyy + "-" + mm + "-" + dd;

      // to fetch the value, i.e number of days based on the string.
      // fetch 30 from Last 30 days

      let numOfDays = productProfileTimePeriod.productProfileTimePeriod.match(
        /\d+/
      );
      numOfDays = parseInt(numOfDays[0], 10);
      numOfDays = props.convertToDays ? numOfDays * 7 : numOfDays;
      today.setDate(today.getDate() - numOfDays);
      let dateBackDD = String(today.getDate()).padStart(2, "0");
      let dateBackMM = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      let dateBackYYYY = today.getFullYear();
      // will use this once we have data for the selected range
      startDate = dateBackYYYY + "-" + dateBackMM + "-" + dateBackDD;
    } else {
      let formattedDate = productProfileRangePeriod.productProfileRangePeriod?.map(
        (item) => moment(item).format("YYYY-MM-DD")
      );
      // will use this once we have data for the selected range
      startDate = formattedDate[0];
      endDate = formattedDate[1];
    }
    return { startDateValue: startDate, endDateValue: endDate };
  };

  const callOnProceed = async () => {
    props.setNewProductProfileLoader(true);
    // call select prod table after all mandatory fields are selected
    let startEndDates = fetchDateValues();
    try {
      let postBody = generateRequestBody("select_products", startEndDates);
      let response = await props.getProductsToSelectForProductProfile(postBody);
      // Condition to check for duplicate product profile name
      if (
        response.data?.message &&
        response.data?.message?.toLowerCase() !== "successful"
      ) {
        displaySnackMessages(response.data.message, "warning");
      } else {
        props.setProductsToSelectForProductProfile(response.data?.data);
        setDisplaySelectProductsTable(response.data.status);
      }
      props.setNewProductProfileLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const convertStateToBodyFormat = (state) => {
    const filters = [];
    // Process product_hierarchy_filters
    if (state.product_hierarchy_filters) {
      state.product_hierarchy_filters.forEach((filter) => {
        if (filter.attribute_name !== "product_codes") {
          filters.push({
            attribute_name: filter.attribute_name,
            values: filter.values || [],
            operator: filter.operator || "in",
            dimension: filter.dimension || "product",
            filter_id: filter.attribute_name,
            filter_type: "cascaded",
            display_type: "dropdown",
          });
        }
      });
    }

    // Process store_hierarchy_filters
    if (state.store_hierarchy_filters) {
      state.store_hierarchy_filters.forEach((filter) => {
        filters.push({
          attribute_name: filter.attribute_name,
          values: filter.values || [],
          operator: filter.operator || "in",
          dimension: filter.dimension || "store",
          filter_id: filter.attribute_name,
          filter_type: "cascaded",
          display_type: "dropdown",
        });
      });
    }

    // Add article filter/ unique key identifier
    filters.push({
      attribute_name: uniqueArticleKey,
      values: state[uniqueArticleKey] || [],
      operator: "in",
      dimension: "product",
      filter_id: uniqueArticleKey,
      filter_type: "cascaded",
    });
    const other_attributes = [
      {
        attribute_name: "start_date",
        attribute_value: state.start_date,
      },
      {
        attribute_name: "end_date",
        attribute_value: state.end_date,
      },
      {
        attribute_name: "sales_attribute",
        attribute_value: !state.sales_attribute?.length
          ? {}
          : state.sales_attribute,
      },
      {
        attribute_name: "date_type",
        attribute_value: state.date_type,
      },
      {
        attribute_name: "date_value",
        attribute_value: state.date_value,
      },
      {
        attribute_name: "min_price",
        attribute_value: productProfileProductAttribute.price.value[0],
      },
      {
        attribute_name: "max_price",
        attribute_value: productProfileProductAttribute.price.value[1],
      },
      {
        attribute_name: "name",
        attribute_value: state.name,
      },
      {
        attribute_name: "description",
        attribute_value: state.description,
      },
    ];

    return {
      filters,
      other_attributes,
    };
  };

  const fetchStoreSizeContribution = async () => {
    props.setNewProductProfileLoader(true);
    let startEndDates = fetchDateValues();
    try {
      let postBodyOnProceed = generateRequestBody(
        "store_size_contribution",
        startEndDates
      );
      let response = await props.getProductsStoreSizePenetration(
        postBodyOnProceed
      );
      props.setProductsStoreSizePenetration(response.data.data);
      setDisplayStorePriceContributionTable(response.data.status);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      props.setNewProductProfileLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const compareAllAttributes = (editDataFilters, recentChangeFilters) => {
    // Helper function to find an object by attribute_name
    const findByAttribute = (arr, attributeName) =>
      arr.find((item) => item.attribute_name === attributeName);

    // Helper function to compare two arrays (ignoring order)
    const arraysEqualIgnoreOrder = (editDataFilters, recentChangeFilters) => {
      if (editDataFilters.length !== recentChangeFilters.length) return false;
      const sortedArr1 = [...editDataFilters].sort();
      const sortedArr2 = [...recentChangeFilters].sort();
      return sortedArr1.every((value, index) => value === sortedArr2[index]);
    };

    for (let i = 0; i < editDataFilters.length; i++) {
      const obj1 = editDataFilters[i];
      const obj2 = findByAttribute(recentChangeFilters, obj1.attribute_name);

      // If the attribute is not found in the second array, return false
      if (!obj2) return false;

      // Compare the values array for each attribute
      if (!arraysEqualIgnoreOrder(obj1.values, obj2.values)) return false;
    }

    return true;
  };

  const deepEqual = (editDataAttributes, recentChangeAttributes) => {
    if (editDataAttributes === recentChangeAttributes) return true;

    if (
      typeof editDataAttributes !== "object" ||
      editDataAttributes === null ||
      typeof recentChangeAttributes !== "object" ||
      recentChangeAttributes === null
    ) {
      return false;
    }

    const keys1 = Object.keys(editDataAttributes);
    const keys2 = Object.keys(recentChangeAttributes);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
      if (
        !keys2.includes(key) ||
        !deepEqual(editDataAttributes[key], recentChangeAttributes[key])
      ) {
        return false;
      }
    }
    return true;
  };

  // post body creation
  const generateRequestBody = (requestType, dateValues, action) => {
    let body = {
      filters:
        requestType === "store_size_contribution"
          ? [
              ...productStoreFilterConfig,
              {
                attribute_name: uniqueArticleKey,
                operator: "in",
                values: selectedArticleListRef.current,
                filter_type: "cascaded",
              },
            ]
          : productStoreFilterConfig,
      other_attributes: [
        {
          attribute_name: "start_date",
          attribute_value: dateValues?.startDateValue
            ? dateValues?.startDateValue
            : "2021-03-23",
        },
        {
          attribute_name: "end_date",
          attribute_value: dateValues?.endDateValue
            ? dateValues?.endDateValue
            : "2022-03-23",
        },
        {
          attribute_name: "sales_attribute",
          attribute_value: props.createPPTenantAttrs?.salesAttributes?.length
            ? productProfileSaleAttribute
            : {},
        },
        {
          attribute_name: "date_type",
          attribute_value: timePeriodToggle ? "dynamic" : "static",
        },
        {
          attribute_name: "date_value",
          attribute_value: timePeriodToggle
            ? productProfileTimePeriod.productProfileTimePeriod
            : productProfileRangePeriod.productProfileRangePeriod
                ?.map((item) => moment(item).format(tenantDateFormat))
                ?.join(" to "),
        },
        {
          attribute_name: "min_price",
          attribute_value: productProfileProductAttribute.price.value[0],
        },
        {
          attribute_name: "max_price",
          attribute_value: productProfileProductAttribute.price.value[1],
        },
        {
          attribute_name: "name",
          attribute_value: productProfileForm.profileName,
        },
        {
          attribute_name: "description",
          attribute_value: productProfileForm.profileDescription,
        },
      ],
    };
    if (requestType === "select_products" && !isEmpty(props.location.state)) {
      return {
        ...body,
        pp_code: props.location.state?.pp_code, // to check for duplicate product profile name presence
      };
    } else {
      // Apply this check only for update action during edit flow when the user clicks on save
      if (!isEmpty(props.location.state) && action === "update") {
        let editPayloadFormatted = convertStateToBodyFormat(
          props.location.state
        );
        const filtersCheck = compareAllAttributes(
          editPayloadFormatted.filters,
          body.filters
        );
        const attributesCheck = deepEqual(
          editPayloadFormatted.other_attributes,
          body.other_attributes
        );
        if (filtersCheck && attributesCheck) {
          return {};
        } else return body;
      } else return body;
    }
  };

  const checkForMandatoryFields = () => {
    let filterDashboardData =
      props.filterDashboardConfiguration?.filterConfig[0]?.filterDashboardData;
    let productProfileDetailsEmptyCondition =
      isEmpty(productProfileForm.profileName) ||
      isEmpty(productProfileForm.profileDescription);
    let filterConfigEmptyCondition = isEmpty(productStoreFilterConfig);
    let mandatoryProductFiltersConfig = productStoreFilterConfig.filter(
      (item) =>
        filterDashboardData.some(
          (obj) =>
            obj.dimension === "product" &&
            obj.is_mandatory &&
            obj.column_name === item.attribute_name
        )
    );
    let mandatoryStoreFiltersConfig = productStoreFilterConfig.filter((item) =>
      filterDashboardData.some(
        (obj) =>
          obj.dimension === "store" &&
          obj.is_mandatory &&
          obj.column_name === item.attribute_name
      )
    );
    let mandatoryFilterCount = filterDashboardData.filter(
      (item) => item.is_mandatory
    )?.length;
    let salesAttributeEmptyCondition =
      !isEmpty(productProfileSaleAttribute) &&
      Object.values(productProfileSaleAttribute).every((val) => !val); // if all are false(unselected)
    let productAttributeEmptyCondition =
      !productProfileProductAttribute.price?.value ||
      productProfileProductAttribute.price.value.some((item) =>
        isEmpty(item?.toString())
      );
    let productProfileTimePeriodEmptyCondition = timePeriodToggle
      ? isEmpty(productProfileTimePeriod.productProfileTimePeriod)
      : isEmpty(productProfileRangePeriod.productProfileRangePeriod);
    let mandatoryCheck = false,
      expressionCheck = false,
      minMaxValueCheck = false,
      maxValueCheck = false;
    if (
      productProfileDetailsEmptyCondition ||
      filterConfigEmptyCondition ||
      salesAttributeEmptyCondition ||
      productAttributeEmptyCondition ||
      productProfileTimePeriodEmptyCondition ||
      mandatoryFilterCount !==
        mandatoryProductFiltersConfig.length +
          mandatoryStoreFiltersConfig.length // to check if all mandatory filters are filled
    ) {
      mandatoryCheck = true;
    }
    if (
      !checkForSpecialCharacters(productProfileForm.profileName) ||
      !checkForSpecialCharacters(productProfileForm.profileDescription)
    ) {
      expressionCheck = true;
    }
    if (
      productProfileProductAttribute.price.value[1] <=
      productProfileProductAttribute.price.value[0]
    ) {
      minMaxValueCheck = true;
    }
    if (
      productProfileProductAttribute.price.value[1] >
      +props.createPPTenantAttrs?.maxPriceAttribute
    ) {
      maxValueCheck = true;
    }
    return {
      mandatoryCheck: mandatoryCheck,
      expressionCheck: expressionCheck,
      minMaxValueCheck: minMaxValueCheck,
      maxValueCheck: maxValueCheck,
    };
  };

  const createProductProfile = async () => {
    props.setNewProductProfileLoader(true);
    let startEndDates = fetchDateValues();
    try {
      let reqBodyOnSave = {};
      if (!isEmpty(props.location.state)) {
        reqBodyOnSave = generateRequestBody(
          "store_size_contribution",
          startEndDates,
          "update"
        );
        if (isEmpty(reqBodyOnSave)) {
          displaySnackMessages(NO_CHANGES_SAVED, "warning");
          props.setNewProductProfileLoader(false);
          return;
        } else {
          reqBodyOnSave.entity = "product profile";
          reqBodyOnSave.entity_id = props.location.state.pp_code.toString();
        }
      } else {
        reqBodyOnSave = generateRequestBody(
          "store_size_contribution",
          startEndDates
        );
      }
      if (isEmpty(props.location.state)) {
        let response = await props.saveProductProfile(reqBodyOnSave);
        let savedMessage = `${dynamicLabelsBasedOnTenant("article")} Profile saved`;
        if (response.data?.show_message) {
          const dynamicLabel = `${dynamicLabelsBasedOnTenant("article")} Profile`;
          savedMessage = response.data?.message.replace(/Product profile/i, dynamicLabel);
        }
        displaySnackMessages(savedMessage, "success", () => {
          props.setNewProductProfileLoader(false);
          props.history.push({
            pathname: PRODUCT_PROFILE,
            state: { showSuccessAlert: true, isCreated: true }
          });
        });
      } else {
        let response = await props.saveEditedProductProfile(reqBodyOnSave);
        let updatedMessage = `${dynamicLabelsBasedOnTenant("article")} Profile updated`;
        if (response.data?.show_message) {
          const dynamicLabel = `${dynamicLabelsBasedOnTenant("article")} Profile`;
          updatedMessage = response.data?.message.replace(/Product profile/i, dynamicLabel);
        }
        displaySnackMessages(updatedMessage, "success", () => {
          props.setNewProductProfileLoader(false);
          props.history.push({
            pathname: PRODUCT_PROFILE,
            state: { showSuccessAlert: true, isUpdated: true }
          });
        });
      }
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const setSelectedProducts = (val) => {
    selectedArticleListRef.current = val;
    // to flush out the pen% table on selection or deselection of values
    setDisplayStorePriceContributionTable(false);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const updateDependencyHandler = async (
    _dependency,
    _dimension,
    _filters,
    _filterList,
    _selectionDependency,
    allDependencies
  ) => {
    setProductStoreFilterConfig(allDependencies);
    props.setCreatePPFilterDependency(allDependencies);
    setFilterDependency(allDependencies);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };

  const setInitialSalesAttrValue = () => {
    let salesAttrsKeys = props.createPPTenantAttrs?.salesAttributes?.map(
      (item) => {
        return {
          [item]: true,
        };
      }
    );
    let salesAttrsKeysFormatted = Object.assign({}, ...salesAttrsKeys);
    setProductProfileSaleAttribute(salesAttrsKeysFormatted);
  };

  const isLoadingProductsInStep2 =
    activeStep === 1 &&
    props.newProductProfileLoader &&
    !displaySelectProductsTable &&
    !displayStorePriceContributionTable;

  return (
    <div className={globalClasses.paddingAroundNew}>
      <div className={globalClasses.breadcrumbPadding}>
        <Breadcrumbs list={paths} />
      </div>
      <Container
        maxWidth={false}
        sx={{ 
          display: "flex", 
          justifyContent: "center", 
          marginBottom: "24px",
          width: "70%",
          marginTop: "12px"
        }}
      >
        <Stepper
          steps={stepperSteps}
          activeStep={activeStep}
          setActiveIndex={(index) => {
            if (index === 0) {
              setActiveStep(0);
              updateStepperSteps(0);
              if (displaySelectProductsTable) {
                setDisplaySelectProductsTable(false);
                setDisplayStorePriceContributionTable(false);
                selectedArticleListRef.current = [];
              }
              if (!isEmpty(productStoreFilterConfig)) {
                props.setCreatePPFilterDependency(productStoreFilterConfig);
                setFilterDependency(productStoreFilterConfig);
              }
            }
          }}
        />
      </Container>
      <Loader
        loader={
          props.newProductProfileLoader || props.inventorySmartPermissionLoader
        }
      >
        {!isEmpty(props.inventorysmartModulesPermission) &&
        props.inventorysmartModulesPermission.hasOwnProperty(
          "inventorysmart_create_product_profile"
        ) &&
        !canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_PRODUCT_PROFILE_FORM,
          "create"
        ) ? (
          <NotFound />
        ) : (
          <div>
            <div className={classes.paddingBottom2}>
              {activeStep === 0 && (
                <div className={classes.stepOneContent}>
                  <div className={classes.wrapper}>
                    <div className={`${classes.contentPadding}`}>
                      <b>Basic Details</b>
                    </div>
                    {/* <Divider className={`${globalClasses.marginBottom24}`}></Divider> */}
                    <div className={`${globalClasses.flexRow}`}>
                      <div
                        className={`${globalClasses.evenPaddingAround} ${globalClasses.marginBottom24}`}
                      >
                        <Form
                          layout={"vertical"}
                          maxFieldsInRow={5}
                          handleChange={handleChange}
                          fields={CREATE_PRODUCT_PROFILE_FORM}
                          updateDefaultValue={false}
                          defaultValues={productProfileForm}
                        ></Form>
                      </div>

                      <div
                        className={`${globalClasses.marginBottom24} ${classes.timeWrapper}`}
                      >
                        <div className={globalClasses.paddingAround}>
                          <div className={classes.timePeriodFormContainer}>
                            {timePeriodToggle ? (
                              <Form
                                layout={"vertical"}
                                maxFieldsInRow={1}
                                handleChange={handleChangeProductProfileTimePeriod}
                                fields={timePeriodDropDownOptions}
                                updateDefaultValue={false}
                                defaultValues={productProfileTimePeriod}
                                labelWidthSpan={2}
                                fieldTypeWidthSpan={2}
                              ></Form>
                            ) : (
                              <Form
                                layout={"vertical"}
                                maxFieldsInRow={1}
                                handleChange={handleChangeProductProfileRangePeriod}
                                fields={
                                  CREATE_PRODUCT_PROFILE_TIME_PERIOD_DATE_PICKER
                                }
                                updateDefaultValue={false}
                                defaultValues={productProfileRangePeriod}
                                labelWidthSpan={2}
                                fieldTypeWidthSpan={2}
                                isOutsideRange={true}
                                disableFutureWeeks={true}
                                customOutsideRange={(day) => {
                                  return Boolean(
                                    moment(day.format(DEFAULT_DATE_FORMAT)).isAfter(
                                      moment(
                                        moment().subtract(1, "weeks").endOf("week")
                                      ).format(DEFAULT_DATE_FORMAT)
                                    )
                                  );
                                }}
                              ></Form>
                            )}
                          </div>
                          <div
                            className={`${classes.marginTopSwitch} ${globalClasses.layoutAlignEnd}`}
                          >
                            <RadioButtonGroup
                              name="pp-time-period-radio-group"
                              onChange={(event) => {
                                if (event.target.value === "static") {
                                  setTimePeriodToggle(false);
                                } else {
                                  setTimePeriodToggle(true);
                                }
                              }}
                              options={[
                                {
                                  label: "Static",
                                  value: "static",
                                },
                                {
                                  label: "Dynamic",
                                  value: "dynamic",
                                },
                              ]}
                              orientation="row"
                              selectedOption={
                                timePeriodToggle ? "dynamic" : "static"
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={classes.wrapper}>
                    <div className={globalClasses.paddingAround}>
                      {showFiltersErrorMessage ? (
                        <Typography variant="h5" color={colours.valencia}>
                          {" "}
                          Filters failed to load - Cannot proceed further
                        </Typography>
                      ) : (
                        <>
                          {props.createPPFilterDependency?.length > 0 &&
                            !isEmpty(filterDependency) && (
                              <CoreComponentScreen
                                hideNoDataFound
                                showFilterDashboard={true}
                                filterConfigKey={
                                  "createProductProfileFilterConfiguration"
                                }
                                disableFilterModal={true} // props used to render flat structure of filter hierarchy directly on screen
                                removeFilterAccordian={true}
                                hideFilterActions={true}
                                hideSaveFilterSection={true}
                                updateDependencyHandler={updateDependencyHandler}
                                filterDependency={filterDependency} // to prepopulate filters on edit
                                isFormComponent={true}
                              />
                            )}
                          {/* Create flow */}
                          {!props.createPPFilterDependency?.length &&
                            isEmpty(filterDependency) && (
                              <CoreComponentScreen
                                hideNoDataFound
                                showFilterDashboard={true}
                                filterConfigKey={
                                  "createProductProfileFilterConfiguration"
                                }
                                disableFilterModal={true} // props used to render flat structure of filter hierarchy directly on screen
                                removeFilterAccordian={true}
                                hideFilterActions={true}
                                hideSaveFilterSection={true}
                                updateDependencyHandler={updateDependencyHandler}
                                preventFilterPreselection={true}
                                isFormComponent={true}
                              />
                            )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={classes.wrapper}>
                    <div className={`${classes.contentPadding}`}>
                      <b> Set Attributes</b>
                    </div>
                    {/* <Divider /> */}
                    {/* Hiding sales attributes for signet and puma */}
                    <div className={`${classes.attributesContainer}`}>
                      {props.createPPTenantAttrs?.salesAttributes?.length > 0 && (
                        <div className={`${classes.contentPadding} ${classes.flexEqual}`}>
                          <div className={globalClasses.flexRow}>
                            <Typography
                              variant="h6"
                              className={globalClasses.marginVertical}
                            >
                              Sale Attributes
                            </Typography>
                            <Typography variant="h5" color={colours.valencia}>
                              *
                            </Typography>
                          </div>
                          <div className={classes.chipHorizontalContainer}>
                            <Typography
                              variant="subtitle1"
                              className={`${globalClasses.extraButtonStyle} ${classes.chipSubtitle}`}
                            >
                              Click to set the sales attributes below
                            </Typography>
                            <div className={classes.chipsWrapper}>
                              {props.createPPTenantAttrs?.salesAttributes?.map((attribute) => {
                                const isSelected = productProfileSaleAttribute[attribute] || false;
                                return (
                                  <Chips
                                    key={attribute}
                                    label={attribute.toUpperCase()}
                                    isActive={isSelected}
                                    onClick={() => handleChipClick(attribute)}
                                    type="multi"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      {props.createPPTenantAttrs?.salesAttributes?.length > 0 && (
                        <Divider orientation="vertical" flexItem className={classes.verticalDivider} />
                      )}
                      <div className={`${globalClasses.centerAlign} ${classes.flexEqual}`} style={!(props.createPPTenantAttrs?.salesAttributes?.length > 0) ? { justifyContent: "flex-start", gap: "32px" } : {}}>
                        <div
                          className={`${globalClasses.flexColumn}`}
                        >
                          <b className={globalClasses.marginVertical}>
                            {`${dynamicLabelsBasedOnTenant(
                              "product",
                              "core"
                            )} Attributes`}
                          </b>
                          <Typography
                            variant="subtitle1"
                            className={`${globalClasses.extraButtonStyle} ${globalClasses.marginTop}`}
                          >
                            Enter the attributes value as per need
                          </Typography>
                        </div>
                        <div className={classes.sliderInputCss}> 
                          <Form
                          fields={CREATE_PRODUCT_PROFILE_PRODUCT_ATTRIBUTE}
                          defaultValues={productProfileProductAttribute}
                          handleChange={handleChangeProductAttributes}
                        />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <>
                  <Loader loader={props.newProductProfileLoader} minHeight="300px">
                    {isLoadingProductsInStep2 && (
                      <div className={globalClasses.paddingAround}>
                        <Typography variant="subtitle1">
                          Loading products...
                        </Typography>
                      </div>
                    )}
                    {displaySelectProductsTable && (
                      <SelectProductTableComponent
                        selectedArticles={setSelectedProducts}
                        preSelectedArticles={
                          props.location.state &&
                          props.location.state?.[uniqueArticleKey]
                        }
                        displaySnackMessages={displaySnackMessages}
                        uniqueArticleKey={uniqueArticleKey}
                        setKeyValueInCache={props?.setKeyValueInCache}
                        cache={props.cache}
                      />
                    )}
                    {displayStorePriceContributionTable && (
                      <StorePriceContributionComponent
                        productStoreFilterConfig={productStoreFilterConfig}
                      />
                    )}
                  </Loader>
                </>
              )}
            </div>
             <div className={invClasses.bottomButtonsWrapper}>
              <div className={invClasses.bottomButtonsGreyBar}></div>
              <Grid
                className={`${invClasses.bottomButtonsContainer24} ${globalClasses.flexAlignBetweenCenter}`}
              >
                <Button
                  size="large"
                  type="default"
                  variant="tertiary"
                  onClick={() => {
                    if (activeStep === 0) {
                      props.history.push(PRODUCT_PROFILE);
                    } else {
                      setActiveStep(0);
                      updateStepperSteps(0);
                      if (displaySelectProductsTable) {
                        setDisplaySelectProductsTable(false);
                        setDisplayStorePriceContributionTable(false);
                        selectedArticleListRef.current = [];
                      }
                      if (!isEmpty(productStoreFilterConfig)) {
                        props.setCreatePPFilterDependency(productStoreFilterConfig);
                        setFilterDependency(productStoreFilterConfig);
                      }
                    }
                  }}
                >
                  {activeStep === 0
                    ? `< Back to ${dynamicLabelsBasedOnTenant("article")} Profile`
                    : "< Back to Basic Information"}
                </Button>
                {activeStep === 0 ? (
                  <Button
                    size="large"
                    type="default"
                    variant="primary"
                    onClick={onProceed}
                  >
                    {psmItineraryConfig?.[0]?.attribute_value?.use_itinerary === true ? " Go to Product and Ship >" : " Go to Product and Store >"}
                  </Button>
                ) : !displayStorePriceContributionTable ? (
                  <Button
                    size="large"
                    type="default"
                    variant="primary"
                    onClick={onProceed}
                  >
                    Proceed
                  </Button>
                ) : (
                  <Button
                    size="large"
                    type="default"
                    variant="primary"
                    onClick={createProductProfile}
                  >
                    {`Create ${dynamicLabelsBasedOnTenant("article")} Profile`}
                  </Button>
                )}
              </Grid>
            </div>
          </div>
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    newProductProfileLoader:
      inventorysmartReducer.createProductProfileReducer.newProductProfileLoader,
    newProductProfileFilterConfiguration:
      inventorysmartReducer.createProductProfileReducer
        .newProductProfileFilterConfiguration,
    dynamicLabels:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    createPPTenantAttrs:
      inventorysmartReducer.createProductProfileReducer
        ?.createProductProfileModuleConfig,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    inventorySmartPermissionLoader:
      inventorysmartReducer.inventorySmartCommonService
        .inventorySmartPermissionLoader,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "createProductProfileFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    createPPFilterDependency:
      inventorysmartReducer.createProductProfileReducer
        .createPPFilterDependency,
    displayToggleForTimePeriod:
      inventorysmartReducer.createProductProfileReducer
        ?.createProductProfileModuleConfig
        ?.displayToggleForTimePeriod,
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
    productProfileTimePeriodOptions:
      inventorysmartReducer.createProductProfileReducer
        ?.createProductProfileModuleConfig
        ?.productProfileTimePeriodOptions,
    convertToDays:
      inventorysmartReducer.createProductProfileReducer
        ?.createProductProfileModuleConfig
        ?.convertToDays,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewProductProfileLoader: (body) =>
      dispatch(setNewProductProfileLoader(body)),
    setNewProductProfileFilterConfiguration: (body) =>
      dispatch(setNewProductProfileFilterConfiguration(body)),
    setProductsToSelectForProductProfile: (body) =>
      dispatch(setProductsToSelectForProductProfile(body)),
    getProductsToSelectForProductProfile: (body) =>
      dispatch(getProductsToSelectForProductProfile(body)),
    setProductsStoreSizePenetration: (body) =>
      dispatch(setProductsStoreSizePenetration(body)),
    getProductsStoreSizePenetration: (body) =>
      dispatch(getProductsStoreSizePenetration(body)),
    saveProductProfile: (body) => dispatch(saveProductProfile(body)),
    saveEditedProductProfile: (body) =>
      dispatch(saveEditedProductProfile(body)),
    resetCreateProductProfile: () => dispatch(resetCreateProductProfile()),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setCreatePPFilterDependency: (payload) =>
      dispatch(setCreatePPFilterDependency(payload)),
    setCreateProductProfileModuleConfig: (payload) =>
      dispatch(setCreateProductProfileModuleConfig(payload)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
    clearActiveModuleCache: (module) =>
      dispatch(clearActiveModuleCache(module)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateProductProfileFilters);
