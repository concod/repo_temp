import { useState, useEffect, useRef } from "react";
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
import { getAllocationRules } from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getRuleHeaderConfiguration } from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";
import { addSnack } from "core/actions/snackbarActions";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import {
  fetchSetAllSKUCount,
  setAllTableData,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { PRODUCT_RULE_ALLOCATION_STORE_SCHEDULER } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useNavigate } from "react-router-dom-v5-compat";
import {
  CONFIGURATION,
  CREATE_STORE_ALLOCATION_RULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const SchedulerSelection = (props) => {
  const classes = useStyles();
  const navigate = useNavigate();

  const [columnDefs, setColumnDefs] = useState([]);
  const [selectedScheduler, setSelectedScheduler] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [saveJobId, setJobId] = useState("");
  const [confirmSetAll, setConfirmSetAll] = useState(false);
  const [displaySetAllSKUCount, setDisplaySetAllSKUCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const tableInstance = useRef(null);

  useEffect(async () => {
    let columns = await getRuleHeaderConfiguration(
      "inventorysmart_pr_allocation_rule_mapping"
    )();
    setColumnDefs(columns);
  }, []);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = getSelectedRowsForInfiniteRowModel(event);
    setSelectedScheduler(selections);
    setButtonEnabled(selections?.length);
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let response = await getAllocationRules(body)();
      if (response.data.status) {
        let finalData = response.data.data;

        return { data: finalData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");

        return defaultTableData;
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");

      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      let updatePayload = props.requestBody;

      updatePayload.filters = [...updatePayload.filters, ...props.storeData];

      updatePayload.values = {
        is_scheduler_mapping: true,
        scheduler_code: selectedScheduler[0]?.rule_code,
      };
      let skuCountResponse = await props.fetchSetAllSKUCount(
        updatePayload,
        PRODUCT_RULE_ALLOCATION_STORE_SCHEDULER
      );
      setIsLoading(false);
      setJobId(skuCountResponse.data?.data?.job_id);
      setDisplaySetAllSKUCount(skuCountResponse.data?.data?.sku_count);
      setConfirmSetAll(true);
    } catch (err) {
      setIsLoading(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const saveHandlerRequest = async (selectAllRequest) => {
    let updatePayload = props.requestBody;

    updatePayload.filters = [...updatePayload.filters, ...props.storeData];

    updatePayload.values = {
      is_scheduler_mapping: true,
      scheduler_code: selectedScheduler[0]?.rule_code,
    };
    try {
      let saveResponse = await props.setAllTableData(
        { body: updatePayload, jobIdCheck: saveJobId },
        PRODUCT_RULE_ALLOCATION_STORE_SCHEDULER
      );

      displaySnackMessages(
        "Saved request is running in background. Please refresh the table once a notification is received",
        "info"
      );
      setConfirmSetAll(false);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
    setTimeout(() => {
      navigate(CONFIGURATION, {
        state: CREATE_STORE_ALLOCATION_RULES_MAPPING,
      });
    }, 3000);
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
              : "SKU/SKU's"}{" "}
            and {props?.selectedStoresCount} number of Stores. Please confirm to proceed.
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
      <Loader loader={isLoading}>
        <AgGridComponent
          columns={columnDefs}
          manualCallBack={(body, pageIndex, params) =>
            manualCallBack(body, pageIndex, params)
          }
          rowModelType={"serverSide"}
          serverSideStoreType="partial"
          selectAllHeaderComponent={true}
          hideHeaderCheckboxComponent={true}
          hideSelectAllRecords={true}
          uniqueRowId={"rule_code"}
          rowSelection={"single"}
          sizeColumnsToFitFlag={true}
          onRowSelected
          cacheBlockSize={10}
          loadTableInstance={loadTableInstance}
          onSelectionChanged={onSelectionChanged}
        />
        <div className={classes.buttonGroupWrapper}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() =>
              props.setActiveStep((prevActiveStep) => prevActiveStep - 1)
            }
          >
            Back
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!buttonEnabled}
            className={classes.button}
            onClick={() => handleSave()}
          >
            Update & Save
          </Button>
        </div>
      </Loader>
      {confirmSetAll && openConfirmationPopUp()}
    </>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getAllocationRules: (body) => dispatch(getAllocationRules(body)),
  fetchSetAllSKUCount: (payload, screen) =>
    dispatch(fetchSetAllSKUCount(payload, screen)),
  setAllTableData: (payload, screen) =>
    dispatch(setAllTableData(payload, screen)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SchedulerSelection);
