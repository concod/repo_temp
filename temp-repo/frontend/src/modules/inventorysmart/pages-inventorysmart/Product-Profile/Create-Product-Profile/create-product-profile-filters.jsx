import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { Paper, Typography, Button } from "@mui/material";
import moment from "moment";
import { isEmpty, cloneDeep } from "lodash";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import Form from "core/Utils/form";
import { Switch } from "impact-ui";
import { addSnack } from "core/actions/snackbarActions";
import { getAllFilters } from "core/actions/filterAction";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { checkForSpecialCharacters } from "core/Utils/functions/utils";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import colours from "core/Styles/colours";
import {
  getModuleLevelAccess,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import NotFound from "core/commonComponents/notFound/NotFound";

import {
  CREATE_PRODUCT_PROFILE_FORM,
  CREATE_PRODUCT_PROFILE_TIME_PERIOD_DROP_DOWN,
  CREATE_PRODUCT_PROFILE_TIME_PERIOD_DATE_PICKER,
  CREATE_PRODUCT_PROFILE_SALE_ATTRIBUTE,
  CREATE_PRODUCT_PROFILE_PRODUCT_ATTRIBUTE,
  ERROR_MESSAGE,
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
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
} from "../../../services-inventorysmart/Product-Profile/create-product-profile-service";
import SelectProductTableComponent from "./select-product-table";
import StorePriceContributionComponent from "./store-price-contribution-table";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import {
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  formatSelectedFiltersData,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";

const useStyles = makeStyles((theme) => ({
  contentPadding: {
    padding: "1rem",
    width: "30%",
  },
  contentPaddingProductAttributes: {
    padding: "1rem",
    width: "30%",
  },
  timePeriodFormStyle: {
    padding: "1rem",
    display: "flex",
    alignItems: "center",
  },
  timePeriodFormContainer: {
    width: "20%",
    marginRight: "1rem",
  },
  setMarginForButtons: {
    marginRight: "1rem",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    margin: "1rem",
  },
  marginRightText: {
    marginRight: "0.5rem",
  },
  warningText: {
    color: theme.palette.error.main,
    marginTop: "0.5rem",
  },
  priceAttributeLayout: {
    display: "flex",
    alignItems: "baseline",
  },
}));

const CreateProductProfileFilters = (props) => {
  const [productProfileForm, setProductProfileForm] = useState({
    profileName: "",
    profileDescription: "",
  });
  const [productProfileSaleAttribute, setProductProfileSaleAttribute] =
    useState({});
  const [productProfileProductAttribute, setProductProfileProductAttribute] =
    useState({
      min: "1",
      max: "",
    });
  const [productProfileTimePeriod, setProductProfileTimePeriod] = useState({});
  const [productProfileRangePeriod, setProductProfileRangePeriod] = useState(
    {}
  );
  const [timePeriodToggle, setTimePeriodToggle] = useState(true);
  const [displaySelectProductsTable, setDisplaySelectProductsTable] =
    useState(false);
  const [
    displayStorePriceContributionTable,
    setDisplayStorePriceContributionTable,
  ] = useState(false);

  const [productFilterConfig, setProductFilterConfig] = useState([]);
  const [storeFilterConfig, setStoreFilterConfig] = useState([]);
  const [
    displaySaleAttributesDynamically,
    setDisplaySaleAttributesDynamically,
  ] = useState();
  const [showFiltersErrorMessage, setShowFiltersErrorMessage] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const [disableCreatePPSwitch, setDisableCreatePPSwitch] = useState(false);

  const classes = useStyles();
  const globalClasses = globalStyles();
  const selectedArticleListRef = useRef([]);

  const homeIcon = [
    {
      label: `Create ${dynamicLabelsBasedOnTenant("article")} Profile`,
      id: 1,
    },
  ];

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
            await Promise.all(
              subModules.map(async (module) => {
                const accessDataResponse = await props?.getModuleLevelAccess({
                  app: APP_NAME,
                  module,
                });

                rolesBasedModulesPermission[module] = Object.keys(
                  accessDataResponse.data.data
                );
              })
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[subModule] =
                FULL_ACCESS_PERMISSIONS_LIST;
            });
          }

          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
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
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => {
      props.location.state = {};
      props.resetCreateProductProfile();
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
          let productFilters = selectedFilters.filter(
            (item) => item.dimension === "product"
          );
          let storeFilters = selectedFilters.filter(
            (item) => item.dimension === "store"
          );
          setProductFilterConfig(productFilters);
          setStoreFilterConfig(storeFilters);
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
        } catch (err) {
          setShowFiltersErrorMessage(true);
          props.setNewProductProfileLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    } else {
      // to pre-populate store and prod filters from saved filters when user has already visited this screen once i.e when props.filterDashboardConfiguration is not empty
      let productFilters = props.savedFilterSelection.filter(
        (item) => item.dimension === "product"
      );
      let storeFilters = props.savedFilterSelection.filter(
        (item) => item.dimension === "store"
      );
      setProductFilterConfig(productFilters);
      setStoreFilterConfig(storeFilters);
    }
  }, [
    props.newProductProfileFilterConfiguration,
    props.savedFilterSelection,
    props.createPPFilterDependency,
  ]);

  useEffect(() => {
    // removing the additional sales attribute on basis of tenant
    if (props.createPPTenantAttrs?.salesAttributes?.length) {
      setInitialSalesAttrValue();
    } else {
      // signet
      setDisplaySaleAttributesDynamically({});
    }
    setProductProfileProductAttribute({
      ...productProfileProductAttribute,
      max: props.createPPTenantAttrs?.maxPriceAttribute?.toString(),
    });
  }, [props.createPPTenantAttrs]);

  useEffect(() => {
    // to set the sales attr values dynamically on initial page render for vb based on channel filter value
    if (
      props.createPPTenantAttrs?.salesAttributes?.length &&
      props.createPPTenantAttrs?.salesAttributes.includes("retirement")
    ) {
      if (storeFilterConfig?.length) {
        let channelDependency = storeFilterConfig.filter(
          (item) => item.attribute_name === "channel"
        );
        if (channelDependency?.length) {
          renderSalesAttributesBasedOnChannel(channelDependency);
        } else return;
      }
    }
  }, [storeFilterConfig, props.createPPTenantAttrs]);

  useEffect(async () => {
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
      let minMaxValOnEdit = {
        min: props.location.state.min_price,
        max: props.location.state.max_price,
      };
      setProductProfileProductAttribute(minMaxValOnEdit);
    }
  }, [props.location.state, filterDependency]);

  const setDateTypeValeOnEdit = (editState) => {
    let dateType = "";
    if (editState.date_type === "dynamic") {
      let start = moment(editState?.start_date);
      let end = moment(editState?.end_date);
      dateType = {
        productProfileRangePeriod: [start, end],
      };
    } else {
      let splitDate = editState.date_value.split(" to ");
      let start = moment(splitDate[0]);
      let end = moment(splitDate[1]);
      dateType = {
        productProfileRangePeriod: [start, end],
      };
    }
    // In edit flow set it always to false (static)
    setProductProfileRangePeriod(dateType);
    setTimePeriodToggle(false);
    setDisableCreatePPSwitch(true);
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
    let editProductHierarchies = preSelectedDependency.filter(
      (item) => item.dimension === "product"
    );
    let editStoreHierarchies = preSelectedDependency.filter(
      (item) => item.dimension === "store"
    );
    setStoreFilterConfig(editStoreHierarchies);
    setProductFilterConfig(editProductHierarchies);
    props.setCreatePPFilterDependency(preSelectedDependency);
    // for vb
    if (props.createPPTenantAttrs?.salesAttributes?.length) {
      let storeTypeFilterConfig = preSelectedDependency.filter(
        (item) => item.filter_id === "channel"
      );
      renderSalesAttributesBasedOnChannel(storeTypeFilterConfig);
    }
  };

  const handleChange = (updatedFormData) => {
    setProductProfileForm(updatedFormData);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };

  const handleChangeProductAttributes = (updatedFormData) => {
    setProductProfileProductAttribute(updatedFormData);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };

  const handleChangeSaleAttributes = (updatedFormData) => {
    setProductProfileSaleAttribute(updatedFormData);
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
    setProductProfileRangePeriod(updatedFormData);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
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

  const renderSalesAttributesBasedOnChannel = (selectionValueDependency) => {
    let channelValue = selectionValueDependency.filter(
      (item) => item.attribute_name === "channel"
    )[0]?.values[0];
    let saleAttributes = props.createPPTenantAttrs?.salesAttributes?.map(
      (obj) => {
        return {
          ...CREATE_PRODUCT_PROFILE_SALE_ATTRIBUTE,
          accessor: obj,
          label: obj.toUpperCase(),
        };
      }
    );
    let filteredSaleAttributes = [];
    if (channelValue === "Factory Line Retail") {
      filteredSaleAttributes = saleAttributes.filter(
        (item) => item.accessor !== "promo" && item.accessor !== "retirement"
      );
      // to avoid sending this sale attribute value that is hidden
      setProductProfileSaleAttribute({
        ...productProfileSaleAttribute,
        retirement: false,
      });
    } else if (channelValue === "Full Line Retail") {
      filteredSaleAttributes = saleAttributes.filter(
        (item) => item.accessor !== "promo" && item.accessor !== "clearance"
      );
      setProductProfileSaleAttribute({
        ...productProfileSaleAttribute,
        clearance: false,
      });
    } else return; // incase of puma
    setDisplaySaleAttributesDynamically(filteredSaleAttributes);
  };

  const flushTableValues = () => {
    setDisplayStorePriceContributionTable(false);
    setDisplaySelectProductsTable(false);
    selectedArticleListRef.current = [];
  };

  const onProceed = async () => {
    let mandatoryFieldsFilled = checkForMandatoryFields();
    if (mandatoryFieldsFilled.mandatoryCheck) {
      displaySnackMessages(
        "Please enter/select mandatory field values",
        "error"
      );
    } else if (mandatoryFieldsFilled.expressionCheck) {
      displaySnackMessages(
        "Profile name and profile description cannot have special characters",
        "warning"
      );
    } else if (mandatoryFieldsFilled.minMaxValueCheck) {
      displaySnackMessages(
        "Max attribute value cannot be less than min",
        "warning"
      );
    } else {
      if (isEmpty(selectedArticleListRef.current)) {
        if (!displaySelectProductsTable) callOnProceed();
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

      let numOfDays = productProfileTimePeriod.productProfileTimePeriod
        .slice(5, 8)
        .trim();
      today.setDate(today.getDate() - numOfDays);
      let dateBackDD = String(today.getDate()).padStart(2, "0");
      let dateBackMM = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      let dateBackYYYY = today.getFullYear();
      // will use this once we have data for the selected range
      startDate = dateBackYYYY + "-" + dateBackMM + "-" + dateBackDD;
    } else {
      let formattedDate =
        productProfileRangePeriod.productProfileRangePeriod?.map((item) =>
          moment(item).format("YYYY-MM-DD")
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
      props.setProductsToSelectForProductProfile(response.data?.data);
      setDisplaySelectProductsTable(response.data.status);
      props.setNewProductProfileLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setNewProductProfileLoader(false);
    }
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
      props.setNewProductProfileLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setNewProductProfileLoader(false);
    }
  };

  // post body creation
  const generateRequestBody = (requestType, dateValues) => {
    return {
      product_attributes:
        requestType === "store_size_contribution"
          ? [
              ...productFilterConfig,
              {
                attribute_name: "article",
                operator: "in",
                values: selectedArticleListRef.current,
                filter_type: "cascaded",
              },
            ]
          : productFilterConfig,
      store_attributes: storeFilterConfig,
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
                ?.map((item) => moment(item).format("YYYY-MM-DD"))
                ?.join(" to "),
        },
        {
          attribute_name: "min_price",
          attribute_value: productProfileProductAttribute.min,
        },
        {
          attribute_name: "max_price",
          attribute_value: productProfileProductAttribute.max,
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
  };

  const checkForMandatoryFields = () => {
    let filterDashboardData =
      props.filterDashboardConfiguration?.filterConfig[0]?.filterDashboardData;
    let productProfileDetailsEmptyCondition =
      isEmpty(productProfileForm.profileName) ||
      isEmpty(productProfileForm.profileDescription);
    let filterConfigEmptyCondition =
      isEmpty(productFilterConfig) || isEmpty(storeFilterConfig);
    let mandatoryProductFiltersConfig = productFilterConfig.filter((item) =>
      filterDashboardData.some(
        (obj) =>
          obj.dimension === "product" &&
          obj.is_mandatory &&
          obj.column_name === item.attribute_name
      )
    );
    let mandatoryStoreFiltersConfig = storeFilterConfig.filter((item) =>
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
    let productAttributeEmptyCondition = Object.values(
      productProfileProductAttribute
    ).some((item) => isEmpty(item));
    let productProfileTimePeriodEmptyCondition = timePeriodToggle
      ? isEmpty(productProfileTimePeriod.productProfileTimePeriod)
      : isEmpty(productProfileRangePeriod.productProfileRangePeriod);

    let mandatoryCheck = false,
      expressionCheck = false,
      minMaxValueCheck = false;
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
      +productProfileProductAttribute.max <= +productProfileProductAttribute.min
    ) {
      minMaxValueCheck = true;
    }
    return {
      mandatoryCheck: mandatoryCheck,
      expressionCheck: expressionCheck,
      minMaxValueCheck: minMaxValueCheck,
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
          startEndDates
        );
        reqBodyOnSave.entity = "product profile";
        reqBodyOnSave.entity_id = props.location.state.pp_code.toString();
      } else {
        reqBodyOnSave = generateRequestBody(
          "store_size_contribution",
          startEndDates
        );
      }
      if (isEmpty(props.location.state)) {
        await props.saveProductProfile(reqBodyOnSave);
        displaySnackMessages("Product profile saved", "success", () =>
          props.history.push(PRODUCT_PROFILE)
        );
      } else {
        await props.saveEditedProductProfile(reqBodyOnSave);
        displaySnackMessages("Product profile updated", "success", () =>
          props.history.push(PRODUCT_PROFILE)
        );
      }
      // to make the loader visible
      window.scroll({
        top: 100,
        left: 100,
        behavior: "smooth",
      });
      props.setNewProductProfileLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setNewProductProfileLoader(false);
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
    dependency,
    _dimension,
    _filters,
    _filterList,
    selectionDependency
  ) => {
    let productFilters = selectionDependency.filter(
      (item) => item.dimension === "product"
    );
    let storeFilters = selectionDependency.filter(
      (item) => item.dimension === "store"
    );
    // Call this only for vb based on salesAttr value
    if (
      props.createPPTenantAttrs?.salesAttributes?.length &&
      props.createPPTenantAttrs?.salesAttributes.includes("retirement")
    ) {
      let channelDependency = selectionDependency.filter(
        (item) => item.filter_id === "channel"
      );
      if (channelDependency?.length) {
        renderSalesAttributesBasedOnChannel(channelDependency);
      } else {
        setInitialSalesAttrValue();
      }
    }
    setProductFilterConfig(productFilters);
    setStoreFilterConfig(storeFilters);
    if (displaySelectProductsTable) {
      flushTableValues();
    }
  };

  const setInitialSalesAttrValue = () => {
    let filteredSaleAttributes =
      props.createPPTenantAttrs?.salesAttributes?.map((obj) => {
        return {
          ...CREATE_PRODUCT_PROFILE_SALE_ATTRIBUTE, // to modify here to remove sales attr based on savedfilter selection
          accessor: obj,
          label: obj.toUpperCase(),
        };
      });
    setDisplaySaleAttributesDynamically(filteredSaleAttributes);
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

  return (
    // Display not found page if user has only view access and tries to navigate via the URL
    <Loader
      loader={
        props.newProductProfileLoader || props.inventorySmartPermissionLoader
      }
    >
      {!canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_PRODUCT_PROFILE_FORM,
        "create"
      ) ? (
        <NotFound />
      ) : (
        <>
          <HeaderBreadCrumbs options={homeIcon}></HeaderBreadCrumbs>
          <div className={globalClasses.marginAround}>
            <Paper>
              <div className={globalClasses.evenPaddingAround}>
                <Form
                  layout={"vertical"}
                  maxFieldsInRow={5}
                  handleChange={handleChange}
                  fields={CREATE_PRODUCT_PROFILE_FORM}
                  updateDefaultValue={false}
                  defaultValues={productProfileForm}
                ></Form>
              </div>
            </Paper>

            <Paper>
              <div className={classes.timePeriodFormStyle}>
                <div className={classes.timePeriodFormContainer}>
                  {timePeriodToggle ? (
                    <Form
                      layout={"vertical"}
                      maxFieldsInRow={1}
                      handleChange={handleChangeProductProfileTimePeriod}
                      fields={CREATE_PRODUCT_PROFILE_TIME_PERIOD_DROP_DOWN}
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
                      fields={CREATE_PRODUCT_PROFILE_TIME_PERIOD_DATE_PICKER}
                      updateDefaultValue={false}
                      defaultValues={productProfileRangePeriod}
                      labelWidthSpan={2}
                      fieldTypeWidthSpan={2}
                    ></Form>
                  )}
                </div>
                <Switch
                  defaultChecked={timePeriodToggle}
                  id="storetoDcfcToggleBtn"
                  onChange={(event) => {
                    setTimePeriodToggle(event.target.checked);
                  }}
                  rightLabel="Dynamic"
                  leftLabel="Static"
                  disabled={disableCreatePPSwitch}
                />
              </div>
            </Paper>
            <Paper>
              <div className={globalClasses.paddingAround}>
                {showFiltersErrorMessage ? (
                  <Typography variant="h5" color={colours.valencia}>
                    {" "}
                    Filters failed to load - Cannot proceed further
                  </Typography>
                ) : (
                  <>
                    {/* Edit flow */}
                    {props.createPPFilterDependency?.length > 0 &&
                      !isEmpty(filterDependency) && (
                        <CoreComponentScreen
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
                        />
                      )}
                    {/* Create flow */}
                    {!props.createPPFilterDependency?.length &&
                      isEmpty(filterDependency) && (
                        <CoreComponentScreen
                          showFilterDashboard={true}
                          filterConfigKey={
                            "createProductProfileFilterConfiguration"
                          }
                          disableFilterModal={true} // props used to render flat structure of filter hierarchy directly on screen
                          removeFilterAccordian={true}
                          hideFilterActions={true}
                          hideSaveFilterSection={true}
                          updateDependencyHandler={updateDependencyHandler}
                        />
                      )}
                  </>
                )}
              </div>
            </Paper>
          </div>

          <div className={globalClasses.marginAround}>
            <Paper>
              <Typography variant="h5" className={globalClasses.paperHeader}>
                Set Attributes
              </Typography>
              {/* Hiding sales attributes for signet and puma */}
              {props.createPPTenantAttrs?.salesAttributes?.length > 0 && (
                <div className={classes.contentPadding}>
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
                  <Form
                    layout={"horizontal"}
                    maxFieldsInRow={3}
                    handleChange={handleChangeSaleAttributes}
                    fields={displaySaleAttributesDynamically}
                    updateDefaultValue={false}
                    defaultValues={productProfileSaleAttribute}
                    labelWidthSpan={10} // longer label width
                    fieldTypeWidthSpan={2} // short width as its a checkbox
                  ></Form>
                </div>
              )}
              <div className={classes.contentPaddingProductAttributes}>
                <Typography
                  variant="h6"
                  className={globalClasses.marginVertical}
                >
                  {`${dynamicLabelsBasedOnTenant(
                    "product",
                    "core"
                  )} Attributes`}
                </Typography>
                <div className={classes.priceAttributeLayout}>
                  <Typography
                    variant="subtitle1"
                    className={classes.marginRightText}
                  >
                    Price
                  </Typography>
                  <Form
                    layout={"horizontal"}
                    maxFieldsInRow={2}
                    handleChange={handleChangeProductAttributes}
                    fields={CREATE_PRODUCT_PROFILE_PRODUCT_ATTRIBUTE}
                    updateDefaultValue={false}
                    defaultValues={productProfileProductAttribute}
                    labelWidthSpan={3}
                    fieldTypeWidthSpan={9}
                  ></Form>
                </div>
              </div>
            </Paper>
          </div>
          {/* hide table until proceed is clicked */}
          <Loader loader={props.newProductProfileLoader}>
            {displaySelectProductsTable && (
              <SelectProductTableComponent
                selectedArticles={setSelectedProducts}
                preSelectedArticles={
                  props.location.state && props.location.state.article
                }
                displaySnackMessages={displaySnackMessages}
              />
            )}
            {/* hide table until proceed is clicked with few rows selected */}
            {displayStorePriceContributionTable && (
              <StorePriceContributionComponent
                productFilterConfig={productFilterConfig}
                storeFilterConfig={storeFilterConfig}
              />
            )}
          </Loader>
          <div className={classes.footer}>
            {!displayStorePriceContributionTable ? (
              <Button
                color="primary"
                variant="contained"
                className={classes.setMarginForButtons}
                onClick={onProceed}
              >
                Proceed
              </Button>
            ) : (
              <Button
                color="primary"
                variant="contained"
                className={classes.setMarginForButtons}
                onClick={createProductProfile}
              >
                Save
              </Button>
            )}
            <Button
              color="primary"
              variant="outlined"
              onClick={() => props.history.push(PRODUCT_PROFILE)}
            >
              Back
            </Button>
          </div>
        </>
      )}
    </Loader>
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
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_create_product_profile
        ?.drillDown,
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
    getModuleLevelAccess: (payload) => dispatch(getModuleLevelAccess(payload)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setCreatePPFilterDependency: (payload) =>
      dispatch(setCreatePPFilterDependency(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateProductProfileFilters);
