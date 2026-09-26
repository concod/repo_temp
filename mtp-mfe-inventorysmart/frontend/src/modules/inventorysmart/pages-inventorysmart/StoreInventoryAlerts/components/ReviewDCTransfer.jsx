import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Button } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";

import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  setDCTransferRecommendationLoader,
  setCustomAllocationAlertFilterConfig,
  updateDCTransferStatus,
} from "../../../services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";

import { DASHBOARD } from "../../../constants-inventorysmart/routesConstants";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  formatSelectedFiltersData,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import { getActiveEntityFilter } from "core/commonComponents/coreComponentScreen/utils";
import { setIsFilterApplied } from "core/actions/filterAction";
import ReviewDCTransferTable from "./ReviewDCTransferTable";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

const useStyles = makeStyles(() => ({
  pageContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  wrapper: {
    background: "white",
    border: "1px solid #E0E0E0",
    borderRadius: "8px",
    padding: "1rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "1rem",
  },
}));

const ReviewDCTransfer = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const globalClasses = globalStyles();

  const [selectedRows, setSelectedRows] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);

  const classes = useStyles();
  const selectedFilters = location?.state?.selectedFiltersDependency;
  const isRedirectedFromDifferentPage = location?.state?.redirect || false;
  const initialChoiceValue = location?.state?.selectedIds;

  useEffect(() => {
    getInitialFilterConfiguration();
  }, []);

  const getInitialFilterConfiguration = async () => {
    try {
      props.setDCTransferRecommendationLoader(true);
      let response = await fetchFilterConfig(
        "Inventorysmart Custom Allocation Alerts"
      );
      props.setCustomAllocationAlertFilterConfig(response);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.customAllocationAlertFilterConfig)
    ) {
      props.setDCTransferRecommendationLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          const preSelectedFilters = isRedirectedFromDifferentPage
            ? cloneDeep(selectedFilters)
            : selected;
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.customAllocationAlertFilterConfig),
            appliedFilters: preSelectedFilters,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
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
          let filterConfig = formattedFilterConfiguration(
            "customAllocationAlertFilterConfig",
            filterConfigData,
            "DC Transfer Review Screen",
            preSelectedFilters
          );
          if (isRedirectedFromDifferentPage) {
            // on edit
            const formattedSelectedFilters = formatSelectedFiltersData(
              filterConfigData,
              "DC Transfer Review Screen",
              preSelectedFilters
            );

            setFilterDependency(formattedSelectedFilters);
          }
          filterConfig["customAllocationAlertFilterConfig"] = {
            ...filterConfig["customAllocationAlertFilterConfig"],
            appliedFilterData: {
              ...filterConfig["customAllocationAlertFilterConfig"]
                .appliedFilterData,
              dependencyData: preSelectedFilters,
            },
          };
          props.setFilterConfiguration(filterConfig);
          props.setIsFilterApplied(true);
        } catch (e) {
          handleErrorMessage(e);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.customAllocationAlertFilterConfig, props.savedFilterSelection]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setDCTransferRecommendationLoader(false);
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

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  const handleDiscard = async () => {
    try {
      props.setDCTransferRecommendationLoader(true);
      // Call updateDCTransferStatus with order_status: 1
      const response = await props.updateDCTransferStatus({
        article: initialChoiceValue,
        order_status: 1,
      });

      // Display success message if returned in response
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }

      props.setDCTransferRecommendationLoader(false);
      // Navigate to dashboard after successful API call
      navigate(DASHBOARD);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const handleApproveChoice = async () => {
    try {
      // Check if there are any selected rows
      if (selectedRows.length === 0) {
        displaySnackMessages(
          "Please select at least one row to approve",
          "warning"
        );
        return;
      }

      props.setDCTransferRecommendationLoader(true);

      // Extract article values from the selected rows
      const articleValues = selectedRows.map((row) => row.article);

      // Call updateDCTransferStatus with order_status: 2
      const response = await props.updateDCTransferStatus({
        article: articleValues,
        order_status: 2,
      });

      // Display success message if returned in response
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }

      props.setDCTransferRecommendationLoader(false);
      // Navigate to dashboard after successful API call
      navigate(DASHBOARD);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Decision Dashboard",
      to: DASHBOARD,
    },
    {
      label: "Product Details",
      to: "#",
    },
  ];

  return (
    <Loader loader={props.dcTransferRecommendationLoader}>
      <div className={classes.pageContainer}>
        <div style={{ flex: 1 }}>
          <div className={globalClasses.paddingAround}>
            <div style={{ marginLeft: "auto" }}>
              <CoreComponentScreen
                showFilterDashboard={true}
                filterConfigKey={"customAllocationAlertFilterConfig"}
                showChipsOnLoad={isRedirectedFromDifferentPage}
                disableFilters={isRedirectedFromDifferentPage}
                filterDependency={filterDependency}
                contained={true}
                hideSaveFilterSection={true}
                chipsDependency={selectedFilters}
                headerBreadCrumb={<HeaderBreadCrumbs options={paths} />}
              />
            </div>
            <ReviewDCTransferTable
              displaySnackMessages={displaySnackMessages}
              handleErrorMessage={handleErrorMessage}
              initialChoiceValue={initialChoiceValue}
              onSelectionChanged={onSelectionChanged}
            />
          </div>
        </div>
        <div className={classes.wrapper}>
          <div>
            <Button
              size="large"
              type="default"
              variant="tertiary"
              onClick={() => navigate(DASHBOARD)}
            >
              Back
            </Button>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Button
              size="large"
              type="default"
              variant="tertiary"
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <Button size="large" type="default" variant="secondary" disabled>
              Download
            </Button>
            <Button
              size="large"
              type="default"
              variant="primary"
              onClick={handleApproveChoice}
              disabled={selectedRows.length === 0}
            >
              Approve
            </Button>
          </div>
        </div>
      </div>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    dcTransferRecommendationLoader:
      inventorysmartReducer.inventorySmartAlertsActionService
        .dcTransferRecommendationLoader,
    customAllocationAlertFilterConfig:
      inventorysmartReducer.inventorySmartAlertsActionService
        .customAllocationAlertFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "customAllocationAlertFilterConfig"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorysmartScreenConfig,
    tenantFilterUamConfig: inventorysmartReducer.tenantFilterUamConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setDCTransferRecommendationLoader: (status) =>
      dispatch(setDCTransferRecommendationLoader(status)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setCustomAllocationAlertFilterConfig: (filterConfiguration) =>
      dispatch(setCustomAllocationAlertFilterConfig(filterConfiguration)),
    updateDCTransferStatus: (body) => dispatch(updateDCTransferStatus(body)),
    setIsFilterApplied: (status) => dispatch(setIsFilterApplied(status)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ReviewDCTransfer);
