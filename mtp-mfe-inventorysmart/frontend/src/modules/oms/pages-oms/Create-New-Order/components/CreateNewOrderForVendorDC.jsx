import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { cloneDeep, isArray, isEmpty } from "lodash";
import classNames from "classnames";
import { ButtonGroup } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  mergeOmsDcIntoFilters,
  readOmsCnoRedirectDashboardDcsFromStorage,
} from "modules/oms/utils-oms/oms-utility";
import {
  ERROR_MESSAGE,
  OMS_CNO_REDIRECT_DASHBOARD_DCS,
  tableArticleFilter,
} from "modules/oms/constants-oms/stringConstants";
import { CREATE_NEW_ORDER_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import {
  resetCreateNewOrderState,
  setCreateNewOrderFilterDependency,
  setCreateNewOrderFilterElements,
  setCreateNewOrderFilterLoader,
  setCreateNewOrderSelectedDcs,
  setSelectedFilters,
  setIsFiltersValid,
  setCreateNewOrderSku,
} from "modules/oms/services-oms/Create-New-Order/create-new-order-service";
import CreateNewOrderTable from "./CreateNewOrderTable";
import OffCycleOrderContainer from "./OffCycleOrder/OffCycleOrderContainer.jsx";
import DcFilter from "../../common/DcFilter";

const CreateNewOrderForVendorDC = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [showOffCycleOrder, setShowOffCycleOrder] = useState(false);

  const [filterDependency, setFilterDependency] = useState([]);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const [customChipData, setCustomChipData] = useState(null);
  const [redirectedFilterDependency, setRedirectedFilterDependency] = useState(
    localStorage.getItem("selectedFiltersDependency")
      ? JSON.parse(localStorage.getItem("selectedFiltersDependency"))
      : null
  );
  const [isFilterReadyToLoad, setIsFilterReadyToLoad] = useState(false);

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const startDateDashboard = localStorage.getItem("startDate");
  const endDatedashboard = localStorage.getItem("endDate");
  const storedSku = JSON.parse(localStorage.getItem("selectedSku")) || [];

  // Extract URL parameters reactively - will update when location changes
  const urlParams = new URLSearchParams(location.search);
  const type = urlParams.get("type");
  const step = urlParams.get("step");
  const draftId = urlParams.get("draft_id");

  const addFilterExclusions = props?.screenConfig?.addFilterExclusions;

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  useEffect(() => {
    if (isRedirectedFromDifferentPage) {
      if (props.isFiltersValid) props?.setPageLoader(false);
      else props?.setPageLoader(true);
    }
  }, [isRedirectedFromDifferentPage, props.isFiltersValid]);

  // Track if we came directly from notification (skipped filter init)
  const [skippedFilterInit, setSkippedFilterInit] = useState(false);

  // Watch for URL changes to handle navigation to/from Off-Cycle Order
  useEffect(() => {
    const hasOffCycleParams = step === "1" && draftId;

    if (hasOffCycleParams) {
      // Navigating to Off-Cycle Order step 2 (from notification)
      setShowOffCycleOrder(true);
      setIsFilterReadyToLoad(true);
      setSkippedFilterInit(true); // Mark that we skipped filter initialization
      props.onOffCycleOrderVisibilityChange?.(true);
    } else if (!hasOffCycleParams) {
      // URL params cleared (Cancel clicked or direct navigation) - hide Off-Cycle Order
      setShowOffCycleOrder((prevShow) => {
        if (prevShow) {
          // Only trigger callback if we're actually hiding
          props.onOffCycleOrderVisibilityChange?.(false);
        }
        return false;
      });
    }
  }, [location.search, step, draftId]);

  useEffect(() => {
    const coreOwnsChrome = isFilterReadyToLoad && !showOffCycleOrder;
    props.onVendorDcCoreShellActiveChange?.(coreOwnsChrome);
  }, [
    isFilterReadyToLoad,
    showOffCycleOrder,
    props.onVendorDcCoreShellActiveChange,
  ]);

  // Initialize filters when returning from Off-Cycle Order (if we skipped init earlier)
  useEffect(() => {
    if (!showOffCycleOrder && skippedFilterInit && filters.length === 0) {
      setSkippedFilterInit(false);
      setIsFilterReadyToLoad(false);

      // Trigger filter initialization
      const initializeFilters = async () => {
        try {
          props.setCreateNewOrderFilterLoader(true);
          const response = await fetchFilterConfig(
            CREATE_NEW_ORDER_FILTER_CONFIG
          );
          setFilters(response);
        } catch (error) {
          props.setCreateNewOrderFilterLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      initializeFilters();
    }
  }, [showOffCycleOrder, skippedFilterInit]);

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.createNewOrderFilterDependency,
      true
    );
    const redirectLsDcs = readOmsCnoRedirectDashboardDcsFromStorage();
    const dcsToMerge =
      props.selectedDcs?.length > 0
        ? props.selectedDcs
        : isRedirectedFromDifferentPage && redirectLsDcs.length > 0
        ? redirectLsDcs
        : [];

    const hasNonDcWithValues = (body) =>
      (body || []).some(
        (f) =>
          String(f?.dimension || "").toLowerCase() !== "dc" &&
          (f?.values?.length ?? 0) > 0
      );

    let baseForMerge = payload.reqBody;
    if (isRedirectedFromDifferentPage && !hasNonDcWithValues(payload.reqBody)) {
      baseForMerge = cloneDeep(props.createNewOrderFilterDependency || []);
    }

    const mergedApply = mergeOmsDcIntoFilters(baseForMerge, dcsToMerge);
    props.setSelectedFilters(mergedApply);
    if (isRedirectedFromDifferentPage && dcsToMerge.length > 0) {
      props.setCreateNewOrderSelectedDcs(dcsToMerge);
    }
    if (isRedirectedFromDifferentPage) {
      props.setIsFiltersValid(true);
      if (localStorage.getItem(OMS_CNO_REDIRECT_DASHBOARD_DCS)) {
        localStorage.removeItem(OMS_CNO_REDIRECT_DASHBOARD_DCS);
      }
    } else {
      props.setIsFiltersValid(payload.isValid);
    }
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setCreateNewOrderFilterLoader(true);

      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.createNewOrderFilterDependency)
        : [];
      const redirectLsDcs = readOmsCnoRedirectDashboardDcsFromStorage();
      const dcsForFetch =
        props.selectedDcs?.length > 0
          ? props.selectedDcs
          : isRedirectedFromDifferentPage && redirectLsDcs.length > 0
          ? redirectLsDcs
          : [];
      const appliedFiltersForFetch = mergeOmsDcIntoFilters(
        selectedFilters,
        dcsForFetch
      );
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: appliedFiltersForFetch,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      if (
        isRedirectedFromDifferentPage ||
        isEmpty(props?.filterDashboardConfiguration) ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
      ) {
        const filterConfigData = [
          {
            filterDashboardData: [...response],
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "createNewOrderFilterConfiguration",
          filterConfigData,
          "Create New Order",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          let redirectedFilters = redirectedFilterDependency?.map((item) => {
            if (item.dimension !== "custom")
              return {
                ...item,
                filter_id: item.attribute_name,
                filter_type: "cascaded",
                display_type: "dropdown",
              };
          });

          let formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Create New Order",
            redirectedFilters
          );
          let filterConfigRedirected = formattedFilterConfiguration(
            "createNewOrderFilterConfiguration",
            filterConfigData,
            "Create New Order",
            redirectedFilters
          );
          filterConfigRedirected[
            "createNewOrderFilterConfiguration"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;

          // This code is used to explicitly set the Chip data that core components handles on applying filter.
          if (redirectedFilters) {
            let chipsDependencyData = cloneDeep(redirectedFilters)?.map(
              (item) => {
                if (isArray(item.values)) {
                  item.values = item.values.map((value) => {
                    if (typeof value === "boolean")
                      return mapDataToLabel(value.toString().toUpperCase());
                    else return mapDataToLabel(value);
                  });
                } else item.values = [mapDataToLabel(item.values)];
                return item;
              }
            );
            setCustomChipData(chipsDependencyData);
          }

          setFilterDependency(formattedSelectedFilters);
          onFilterDashboardClick(redirectedFilters, response);
          if (!isRedirectedFromDifferentPage)
            props?.setFilterConfiguration(filterConfigRedirected);
        } else {
          props?.setFilterConfiguration(filterConfig);
        }
      }

      setIsFilterReadyToLoad(true);
      setFilterData(response);
    } catch (error) {
      console.log("Error while fetching options", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setCreateNewOrderFilterLoader(false);
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    // If navigating directly to Step 2 (from notification), show OffCycleOrder immediately
    if (step === "1" && draftId) {
      setShowOffCycleOrder(true);
      setIsFilterReadyToLoad(true);
      props.onOffCycleOrderVisibilityChange?.(true);
      return; // Skip filter initialization
    }

    const selectedSku =
      storedSku?.length > 0 ? storedSku : props.selectedCreateNewOrderSku;
    props.setCreateNewOrderSku(selectedSku);
    if (storedSku?.length > 0) {
      var storedArticlePayload = JSON.parse(JSON.stringify(tableArticleFilter));
      storedArticlePayload.values = [...storedSku];
      localStorage.removeItem("selectedSku");
      if (savedFiltersDependency?.length > 0) {
        savedFiltersDependency.push(storedArticlePayload);
      }
    }

    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    props.setCreateNewOrderFilterDependency(selectedFiltersDependency);

    const redirectDashboardDcsRaw = localStorage.getItem(
      OMS_CNO_REDIRECT_DASHBOARD_DCS
    );
    if (redirectDashboardDcsRaw) {
      try {
        const parsed = JSON.parse(redirectDashboardDcsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mergedHydrate = mergeOmsDcIntoFilters(
            cloneDeep(selectedFiltersDependency || []),
            parsed
          );
          props.setCreateNewOrderSelectedDcs(parsed);
          props.setSelectedFilters(mergedHydrate);
        }
      } catch (e) {
        console.error("Failed to parse redirect dashboard DCs", e);
      }
    }

    localStorage.removeItem("startDate");
    localStorage.removeItem("endDate");

    const redirectedFromDifferentPage = type && true;
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);

    const fetchFilters = async () => {
      try {
        props.setCreateNewOrderFilterLoader(true);
        const response = await fetchFilterConfig(
          CREATE_NEW_ORDER_FILTER_CONFIG
        );
        setFilters(response);
      } catch (error) {
        props.setCreateNewOrderFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
    return () => {
      props.resetCreateNewOrderState();
    };
  }, []);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked, props.formFilters]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    // Guard clause: Skip if dependencyData is undefined (happens when navigating directly to Step 2)
    if (!dependencyData || !Array.isArray(dependencyData)) {
      return;
    }
    let datesIndex = -1;

    const dates = dependencyData.find((dataItem, index) => {
      if (dataItem.attribute_name === "fiscal_date_range") {
        datesIndex = index;
      }
      return dataItem.attribute_name === "fiscal_date_range";
    });

    filterData = filterData.filter(
      (item) => item.column_name !== "fiscal_date_range"
    );

    if (datesIndex > -1) {
      dependencyData.splice(datesIndex, 1);
    }
    applyFilters(filterData, dependencyData, dates);
  };

  const handleShowOffCycleOrder = () => {
    setShowOffCycleOrder(true);
    props.onOffCycleOrderVisibilityChange?.(true);
  };

  const handleCancelOffCycleOrder = () => {
    setShowOffCycleOrder(false);
    props.onOffCycleOrderVisibilityChange?.(false);
  };

  return (
    <>
      {isFilterReadyToLoad && (
        <>
          {showOffCycleOrder ? (
            <>
              {props.headerBreadCrumb || null}
              {props.renderGroupOptions?.()}
              <OffCycleOrderContainer
                onCancel={handleCancelOffCycleOrder}
                selectedArticleDCFromParent={[]}
              />
            </>
          ) : (
            <CoreComponentScreen
              autoHideFilterButton={true}
              deferExtraButtonsUntilFilterPanelOpen={
                isRedirectedFromDifferentPage
              }
              headerBreadCrumb={
                props.createNewOrderBreadcrumbsOnly
                  ? props.createNewOrderBreadcrumbsOnly
                  : null
              }
              extraButtons={[
                <DcFilter
                  key="create-new-order-dc-filter"
                  variant="create_new_order"
                />,
              ]}
              renderAboveFilterDashboard={
                props.groupOptions ? (
                  <div
                    className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
                  >
                    <ButtonGroup
                      onChange={props.onCreateNewOrderGroupChange}
                      options={props.groupOptions}
                      selectedOption={props.selectedGroup}
                    />
                  </div>
                ) : null
              }
              showPageRoute={false}
              showPageHeader={true}
              showFilterDashboard={true}
              contained={true}
              filterConfigKey={"createNewOrderFilterConfiguration"}
              showChipsOnLoad={isRedirectedFromDifferentPage}
              disableFilters={isRedirectedFromDifferentPage}
              filterDependency={
                filterDependency?.length ? filterDependency : null
              }
              chipsDependency={customChipData ? customChipData : null}
              onApplyFilter={onFilterDashboardClick}
              customDependencyValue={addFilterExclusions || {}}
              preventFilterPreselection={isRedirectedFromDifferentPage}
              autoApplyEnabled={!isRedirectedFromDifferentPage}
            >
              {props.renderGroupOptions?.()}
              <Loader loader={props?.pageLoader}>
                {props?.isFiltersValid && (
                  <div className={classNames(globalClasses.marginVertical1rem)}>
                    <CreateNewOrderTable
                      isRedirectedFromDifferentPage={
                        isRedirectedFromDifferentPage
                      }
                      fiscalCalendarData={props?.fiscalCalendarDetails}
                      onShowOffCycleOrder={handleShowOffCycleOrder}
                    />
                  </div>
                )}
              </Loader>
            </CoreComponentScreen>
          )}
        </>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "createNewOrderFilterConfiguration"
      ],
    selectedCreateNewOrderSku:
      store.omsReducer.createNewOrderService.selectedSku,
    isFiltersValid: store.omsReducer.createNewOrderService.isFiltersValid,
    backButtonClicked: store.omsReducer.createNewOrderService.backButtonClicked,
    formFilters: store.omsReducer.createNewOrderService.formFilters,
    createNewOrderFilterLoader:
      store.omsReducer.createNewOrderService.createNewOrderFilterLoader,
    createNewOrderFilterElements:
      store.omsReducer.createNewOrderService.createNewOrderFilterElements,
    createNewOrderFilterDependency:
      store.omsReducer.createNewOrderService.createNewOrderFilterDependency,
    selectedDcs:
      store.omsReducer.createNewOrderService.createNewOrderSelectedDcs,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.create_new_order,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.create_new_order,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setCreateNewOrderFilterLoader: (payload) =>
    dispatch(setCreateNewOrderFilterLoader(payload)),
  setCreateNewOrderFilterElements: (payload) =>
    dispatch(setCreateNewOrderFilterElements(payload)),
  setCreateNewOrderFilterDependency: (filterConfiguration) =>
    dispatch(setCreateNewOrderFilterDependency(filterConfiguration)),
  resetCreateNewOrderState: () => dispatch(resetCreateNewOrderState()),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setCreateNewOrderSku: (payload) => dispatch(setCreateNewOrderSku(payload)),
  setCreateNewOrderSelectedDcs: (payload) =>
    dispatch(setCreateNewOrderSelectedDcs(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewOrderForVendorDC);
