import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "config/constants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  setInventorysmartFilterLoader,
  setInventoryRetailEventsFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  resetRetailEventsStore,
} from "modules/inventorysmart/services-inventorysmart/Retail-Events/retail-events-service";
import { setNoOfButtonsNextToTab } from "../../services-inventorysmart/common/inventory-smart-common-services";
import RetailEventsUploadModal from "./components/RetailEventsUploadModal";
import RetailEventsTable from "./components/RetailEventsTable";
import RetailEventsErrorPreview from "./components/RetailEventsErrorPreview";
import {
  RETAIL_EVENTS_FILTER_CONFIG_KEY,
  RETAIL_EVENTS_SAVED_FILTER_SCREEN,
} from "./constants";
import { getUploadMessage } from "./utils";

const RetailEvents = (props) => {
  const [uploadSummary, setUploadSummary] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const applyFilters = (filterElements, filterDependency) => {
    const payload = filtersPayload(
      filterElements,
      filterDependency,
      true,
      true // ignore custom dimensions
    );

    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(payload.reqBody);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          RETAIL_EVENTS_SAVED_FILTER_SCREEN
        );
        if (
          isEmpty(props.filterDashboardConfiguration) ||
          props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
        ) {
          props.setInventoryRetailEventsFilterConfig(response);
        }
      } catch (e) {
        props.handleErrorMessage(e);
      }
    };

    getInitialFilterConfiguration();

    return () => {
      props.resetRetailEventsStore();
    };
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.inventoryRetailEventsFilterConfig) &&
      !isEmpty(props.inventorysmartScreenConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setInventorysmartFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.inventoryRetailEventsFilterConfig) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterConfigData = [
            {
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
              saved_filter_screen_name: RETAIL_EVENTS_SAVED_FILTER_SCREEN,
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            RETAIL_EVENTS_FILTER_CONFIG_KEY,
            filterConfigData,
            "Retail Events"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          props.handleErrorMessage(error);
        } finally {
          props.setInventorysmartFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.inventoryRetailEventsFilterConfig,
    props.inventorysmartScreenConfig,
  ]);

  useEffect(() => {
    return () => {
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, []);

  useEffect(() => {
    const hasFiltersApplied = Boolean(
      props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
        ?.length > 0
    );
    props.setNoOfButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [props.filterDashboardConfiguration]);

  const showSuccess = (message) =>
    props.addSnack({ message, options: { variant: "success" } });

  /** Shared by the inline uploader, the Upload modal and Re-Upload. */
  const handleUploaded = (summary) => {
    setUploadSummary(summary);
    setIsUploadOpen(false);
    showSuccess(getUploadMessage(summary));
    if (summary.rejected > 0) setIsPreviewOpen(true);
    // Refresh list when at least one row landed in the main table.
    if (summary.success > 0) setRefreshKey((key) => key + 1);
  };

  const openReUpload = () => {
    setIsPreviewOpen(false);
    setIsUploadOpen(true);
  };

  return (
    <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        showFilterLoader={props.inventorysmartFilterLoader}
        // Filter dashboard props
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={RETAIL_EVENTS_FILTER_CONFIG_KEY}
        onApplyFilter={onFilterDashboardClick}
        autoHideFilterButton={true}
      >
        {props.isFiltersValid && (
          <RetailEventsTable
            pageSize={props.pageSize}
            filters={props.selectedFilters}
            uploadSummary={uploadSummary}
            refreshKey={refreshKey}
            onUploadClick={() => setIsUploadOpen(true)}
            onViewErrorsClick={() => setIsPreviewOpen(true)}
            onUploaded={handleUploaded}
            onError={props.handleErrorMessage}
            onSuccess={showSuccess}
          />
        )}
      </CoreComponentScreen>

      <RetailEventsUploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={handleUploaded}
        onError={props.handleErrorMessage}
      />
      <RetailEventsErrorPreview
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        uploadSummary={uploadSummary}
        pageSize={props.pageSize}
        onReUpload={openReUpload}
        onError={props.handleErrorMessage}
        onSuccess={showSuccess}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  const retailEventsStore =
    store.inventorysmartReducer.inventorySmartRetailEventsService;
  const commonStore = store.inventorysmartReducer.inventorySmartCommonService;

  return {
    inventorysmartFilterLoader: retailEventsStore.inventorysmartFilterLoader,
    isFiltersValid: retailEventsStore.isFiltersValid,
    selectedFilters: retailEventsStore.selectedFilters,
    inventoryRetailEventsFilterConfig:
      retailEventsStore.inventoryRetailEventsFilterConfig,
    inventorysmartScreenConfig: commonStore.inventorysmartScreenConfig,
    pageSize:
      commonStore.inventorysmartScreenConfig?.inventorysmart_page_count || 10,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        RETAIL_EVENTS_FILTER_CONFIG_KEY
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryRetailEventsFilterConfig: (payload) =>
    dispatch(setInventoryRetailEventsFilterConfig(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  resetRetailEventsStore: (payload) =>
    dispatch(resetRetailEventsStore(payload)),
  setNoOfButtonsNextToTab: (value) => dispatch(setNoOfButtonsNextToTab(value)),
  addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RetailEvents);
