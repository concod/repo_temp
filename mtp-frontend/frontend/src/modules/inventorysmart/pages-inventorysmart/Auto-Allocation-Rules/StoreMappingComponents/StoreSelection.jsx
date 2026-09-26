import { useEffect, useRef, useState } from "react";
import { isEmpty } from "lodash";
import { connect } from "react-redux";
import {
  Button,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import Loader from "core/Utils/Loader/loader";

import AgGridComponent from "core/Utils/agGrid";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { getRequiredFilterList } from "../../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  displayErrorMessage,
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { defaultTableData, ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { getStoreList } from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { getObjectsAfterCheckAll } from "../../StoreInventoryAlerts/components/AlertsActionPopup";
import { useNavigate } from "react-router-dom-v5-compat";
import {
  CONFIGURATION,
  CREATE_STORE_ALLOCATION_RULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  fetchSetAllSKUCount,
  setAllTableData,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import globalStyles from "core/Styles/globalStyles";
import { PRODUCT_RULE_ALLOCATION_STORE_SCHEDULER } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

const StoreSelection = (props) => {
  const navigate = useNavigate();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [columnDefs, setColumnDefs] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setStoreFilters] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [render, setRender] = useState(false);
  const [confirmSetAll, setConfirmSetAll] = useState(false);
  const [displaySetAllSKUCount, setDisplaySetAllSKUCount] = useState(0);
  const [saveJobId, setJobId] = useState("");
  const [selectedStoresCount, setSelectedStoresCount] = useState(0);

  const tableInstance = useRef(null);
  const onFilterDependency = useRef(null);

  useEffect(() => {
    setRender(false);
  }, [filters]);

  useEffect(() => {
    if (!isEmpty(filters) && !render) {
      setRender(true);
      fetchData();
    }
  }, [render]);

  const fetchData = async () => {
    try {
      const { payload } = props;
      setIsLoading(true);
      let body = {
        filters: [...payload, ...filters],
        meta: { ...payload.meta },
        application_code: 1,
      };

      props.setRequestBody(body);
      let response = await getStoreList(body)();
      if (response.data.status) {
        const finalData = response.data.data;
        setIsLoading(false);
        setRender(true);
        setTableData(finalData);
      } else {
        props.addSnack(ERROR_MESSAGE, "error");
        setIsLoading(false);

        return defaultTableData;
      }
    } catch (err) {
      console.log(err);
      props.addSnack(ERROR_MESSAGE, "error");
      setIsLoading(false);
      return defaultTableData;
    }
  };

  useEffect(async () => {
    let dependency = props.savedFilterSelection || [];
    const fetchFilters = async () => {
      try {
        const storeFilters = await fetchFilterFieldValues(
          "auto_allocation_rule_store_mapping",
          props.savedFilterSelection
        );
        //Assign only the required filters present in the filters data
        //to the filter dependency ref
        onFilterDependency.current = getRequiredFilterList(
          storeFilters,
          dependency
        );
        if (!isEmpty(onFilterDependency.current)) {
          //If the filter dependency is not empty, we are triggering the manualcallback for
          //the filters related data
          tableInstance?.current.api?.refreshServerSideStore({ purge: false });
        }
        if (isEmpty(props.filterDashboardConfiguration)) {
          let filterConfigData = [
            {
              filterDashboardData: storeFilters,
              isCrossDimensionFilter: true,
              screen_name: "auto_allocation_rule_store_mapping",
              saved_filter_screen_name: "auto_allocation_rule_store_mapping",
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "autoAllocationStoreFilterConfig",
            filterConfigData,
            "auto_allocation_rule_store_mapping"
          );
          props.setFilterConfiguration(filterConfig);
        }
      } catch (err) {
        displayErrorMessage(ERROR_MESSAGE);
      }
    };
    fetchFilters();
    const cols = await props.getColumnsAg(
      "table_name=store_list_auto_allocation_rules"
    );
    setColumnDefs(cols);
    fetchData();
    setRender(true);
  }, []);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onFilterDashboardClick = async (dependencyData) => {
    setStoreFilters(dependencyData);
    const cols = await props.getColumnsAg(
      "table_name=store_list_auto_allocation_rules"
    );
    setColumnDefs(cols);
    setRender(true);
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  /**
   * This function generates the filter payload based on the selected stores in the table.
   * It checks if any user actions have been performed and if so, it constructs the filter payload accordingly.
   * If no user actions have been performed, it returns the filter payload for the selected stores.
   *
   * @return {Array} The filter payload containing the selected stores or the payload with user actions applied.
   */
  const setFilterPayload = () => {
    // Construct the filter payload for the selected stores
    let selected_stores = {
      attribute_name: "store_code",
      dimension: "store",
      filter_type: "cascaded",
      operator: "in",
      system_filter: true,
      values: tableInstance.current.api
        .getSelectedRows()
        .map((item) => item.store_code),
    };

    // Check if any user actions have been performed
    let l_userActions = getObjectsAfterCheckAll(
      tableInstance?.api?.checkConfiguration
    );

    let filterPayload = [];

    // If no user actions have been performed, return the filter payload for the selected stores
    if (isEmpty(l_userActions)) {
      filterPayload = [selected_stores];
    } else {
      // If user actions have been performed, construct the filter payload accordingly

      // Combine the user actions into a single object
      let l_userActionClubbed = l_userActions.reduce(
        (result, obj) => Object.assign(result, obj),
        {}
      );

      // Check if any unselected stores have been identified
      if (l_userActionClubbed?.unCheckedRows) {
        let unselected_stores = {
          attribute_name: "store_code",
          dimension: "store",
          filter_type: "cascaded",
          operator: "not in",
          system_filter: true,
          values: l_userActionClubbed?.unCheckedRows.map((item) =>
            Number(item)
          ),
        };

        // Return the filter payload containing the unselected stores
        filterPayload = [unselected_stores];
      } else {
        // Return the filter payload with the user actions applied
        filterPayload = [...payload, ...filters];
      }
    }

    return filterPayload;
  };

  const onNextHandler = () => {
    const storeSelectedFilters = setFilterPayload();
    props.handleNext(storeSelectedFilters);
  };

  const handleUnMap = async () => {
    setIsLoading(true);
    try {
      let updatePayload = props.requestBody;

      updatePayload.filters = [...updatePayload.filters, ...setFilterPayload()];

      updatePayload.values = {
        is_scheduler_mapping: false,
      };

      let skuCountResponse = await props.fetchSetAllSKUCount(
        updatePayload,
        PRODUCT_RULE_ALLOCATION_STORE_SCHEDULER
      );

      setJobId(skuCountResponse.data?.data?.job_id);
      setDisplaySetAllSKUCount(skuCountResponse.data?.data?.sku_count);
      setIsLoading(false);
      setConfirmSetAll(true);
    } catch (err) {
      setIsLoading(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const saveHandlerRequest = async () => {
    let updatePayload = props.requestBody;

    updatePayload.filters = [...updatePayload.filters, ...setFilterPayload()];

    updatePayload.values = {
      is_scheduler_mapping: false,
    };

    try {
      let saveResponse = await props.setAllTableData(
        { body: updatePayload, jobIdCheck: saveJobId },
        PRODUCT_RULE_ALLOCATION_STORE_SCHEDULER
      );
      setConfirmSetAll(false);
      displaySnackMessages(
        "Saved request is running in background. Please refresh the table once a notification is received",
        "info"
      );
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = getSelectedRowsForInfiniteRowModel(event);
    const selectedStoresCount = selections?.length || 0;
    setSelectedStoresCount(selectedStoresCount);
    props.onStoreSelectionComplete(selectedStoresCount);
    setButtonEnabled(selections?.length);
  };

  const openConfirmationPopUp = () => {
    return (
      <Dialog
        open={confirmSetAll}
        onClose={() => setConfirmSetAll(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>Confirm Set All</DialogTitle>
        <DialogContent>
          <Typography variant="h6">
            Set All operation is being applied for {displaySetAllSKUCount}{" "}
            number of{" "}
            {dynamicLabelsBasedOnTenant("article") === "Material"
              ? "Material/Material's"
              : "SKU/SKU's"}{" "} and {selectedStoresCount} number of Stores
            . Please confirm to proceed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setConfirmSetAll(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => saveHandlerRequest(true)}
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={"autoAllocationStoreFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        hideNoDataFound={true}
      />
      {render && (
        <>
          {confirmSetAll && openConfirmationPopUp()}
          <Loader loader={isLoading}>
            <div className={`${globalClasses.layoutAlignEnd}`}>
              <Button
                onClick={() => {
                  handleUnMap();
                }}
                id="unmapSchedulerBtn"
                color="primary"
                variant="contained"
                className={classes.btn}
                disabled={!buttonEnabled}
              >
                Unmap Scheduler
              </Button>
            </div>
            <AgGridComponent
              loadTableInstance={loadTableInstance}
              rowdata={tableData}
              columns={columnDefs}
              pagination={true}
              uniqueRowId="store_code"
              rowSelection={"multiple"}
              onRowSelected={onSelectionChanged}
              cacheBlockSize={10}
              selectAllHeaderComponent
            />
            <div className={classes.buttonGroupWrapper}>
              <Button
                variant="contained"
                color="primary"
                className={classes.button}
                onClick={() => {
                  navigate(CONFIGURATION, {
                    state: CREATE_STORE_ALLOCATION_RULES_MAPPING,
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={!buttonEnabled}
                className={classes.button}
                onClick={() => onNextHandler()}
              >
                Next
              </Button>
            </div>
          </Loader>
        </>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "autoAllocationStoreFilterConfig"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFilterConfiguration: (payload) =>
    dispatch(setFilterConfiguration(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreList: (payload) => dispatch(getStoreList(payload)),
  fetchSetAllSKUCount: (payload, screen) =>
    dispatch(fetchSetAllSKUCount(payload, screen)),
  setAllTableData: (payload, screen) =>
    dispatch(setAllTableData(payload, screen)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreSelection);
