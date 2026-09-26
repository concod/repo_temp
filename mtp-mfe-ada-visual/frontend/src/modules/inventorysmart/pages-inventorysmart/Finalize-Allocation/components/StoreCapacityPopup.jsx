import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { useConstraintsStyles } from "../../Constraints/StoreAllocations/components/constraints-style";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getStoreCapacityTablePopupData } from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { bulkUpdateAllocatedUnits } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";

const StoreCapacityPopup = (props) => {
  const [columns, setColumns] = useState([]);
  const classes = useConstraintsStyles();
  const [showloading, setShowloading] = useState(false);
  const [tableData, seTableData] = useState([]);
  const [editedRows, setEditedRows] = useState([]);
  useEffect(() => {
    setShowloading(true);
    const setCols = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=size_level_allocation_popup"
      );
      fetchData();
      // setColumns(storeCols);
    };
    setCols();
  }, []);

  const fetchData = async () => {
    try {
      let reqBody = {
        article: props.selectedRowData.article,
        plan_status: "Created",
        allocation_code: props.allocationCode,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_type: props.planType,
        store_code: props.selectedRowData.store_code,
      };
      let { data: storeData } = await props.getStoreCapacityTablePopupData(
        reqBody,
        true
      );
      if (storeData.data?.table_config_capacity_breach) {
        storeData.data.table_config_capacity_breach = storeData.data?.table_config_capacity_breach.map(
          (item) => {
            if (item.column_name === "allocated_header") {
              item.sub_headers = item.sub_headers.map((key) => {
                key.is_editable = true;
                return key;
              });
            }
            return item;
          }
        );
        let formattedColumns = agGridColumnFormatter(
          storeData.data?.table_config_capacity_breach
        );
        setColumns(formattedColumns);
      }
      if (storeData.data?.table_data) seTableData(storeData.data?.table_data);
      setShowloading(false);
    } catch (err) {
      displaySnackMessages("Error while fetching the data", "error");
      setShowloading(false);
    }
  };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const onBlur = async (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    params
  ) => {
    setEditedRows((editedRows) => {
      let updatedRows = [];
      if (editedRows.length > 0) {
        let checkAlreadyExists = editedRows.some(
          (item) => item.size === params.data.size
        );
        if (checkAlreadyExists) {
          updatedRows = editedRows.map((item) => {
            if (item.size === params.data.size) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };

  const onCancel = () => {
    props.onCancel();
  };
  const saveRequest = async () => {
    setShowloading(true);
    try {
      let obj = {};
      editedRows.forEach((item) => {
        let key = `${item.dc_code}___${item.size}`;
        let value = item[`allocated_qty__${item.dc}`];
        obj[item.store_code] = {
          ...obj[item.store_code],
          [key]: value,
        };
      });
      let reqBody = {
        allocation_code: props.allocationCode,
        edited_allocation_code: null,
        allocation_row: {
          [props.selectedRowData.article]: obj,
        },
      };
      let l_response = await props.bulkUpdateAllocatedUnits(reqBody, true);
      if (l_response?.data?.status) {
        if (!props.originalAllocationCode) {
          props.setOriginalAllocationCode(props.allocationCode);
        }
        if (l_response?.data?.data?.allocation_code) {
          props.setAllocationCode(l_response?.data?.data?.allocation_code);
        } else {
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
        displaySnackMessages("Updated Successfully!!", "success");
      }
      setShowloading(false);
      setEditedRows([]);
      props.onCancel();
    } catch (err) {
      setShowloading(false);
      displaySnackMessages("Error while saving", "error");
    }
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.storeModalPopup}
      aria-labelledby="customized-dialog-title"
      open={true}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          Review Size wise Allocation
          <IconButton
            aria-label="close"
            onClick={() => onCancel()}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <LoadingOverlay loader={showloading}>
          <div className={classes.container}>
            <div className={classes.headerContainer}>
              <div className={classes.headerContainer}>
                <span>
                  {dynamicLabelsBasedOnTenant("product", "core")}
                  {" : "}
                </span>
                <Typography variant="h4">
                  {props.selectedRowData.article}
                </Typography>
              </div>
              <span>{" | "}</span>
              <div className={classes.headerContainer}>
                <span> {"Net Avl Capacity : "}</span>
                <Typography variant="h4">
                  {props.selectedRowData.net_available}
                </Typography>
              </div>
            </div>
            <div className={classes.tableBody}>
              {columns.length > 0 && (
                <AgGridComponent
                  columns={columns}
                  rowdata={tableData}
                  sizeColumnsToFitFlag
                  onBlur={onBlur}
                />
              )}
            </div>
          </div>
        </LoadingOverlay>
      </DialogContent>
      <DialogActions
        classes={{
          root: classes.footer,
        }}
      >
        <Button
          onClick={() => {
            onCancel();
          }}
          id="modifyCancelBtn"
          color="primary"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            saveRequest();
          }}
          id="modifyAddBtn"
          color="primary"
          disabled={editedRows?.length === 0}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
const mapStateToProps = (store) => {
  return {};
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreCapacityTablePopupData: (payload, isV3) =>
    dispatch(getStoreCapacityTablePopupData(payload, isV3)),
  bulkUpdateAllocatedUnits: (payload, isV3) =>
    dispatch(bulkUpdateAllocatedUnits(payload, isV3)),
});
export default connect(mapStateToProps, mapDispatchToProps)(StoreCapacityPopup);
