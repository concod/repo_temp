import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import {
  checkValidation,
  checkValidationforTimeConstraint,
  checkValidationforTimeConstraintDate,
  setTimeConstraintPostRequestBody,
  setTimeConstraintSavePayload,
} from "./config";
import CloseIcon from "@mui/icons-material/Close";
import { useConstraintsStyles, constraintsStyle } from "./constraints-style";
import Form from "core/Utils/form";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import {
  getStoreModalTableData,
  saveStoreTableData,
  setConstraintsLoader,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import moment from "moment";
import { dateValidation } from "core/pages/storeStatus/utils";
import AddIcon from "@mui/icons-material/Add";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Delete from "@mui/icons-material/Delete";
import { ContactSupportOutlined } from "@mui/icons-material";

const StoreTable = (props) => {
  const [columns, setColumns] = useState([]);
  const classes = useConstraintsStyles();
  const [showloading, setShowloading] = useState(false);
  const [editedRows, setEditedRows] = useState([]);
  const timeBasedColumns = useRef({});
  const tableRef = useRef({});

  const setTableInstance = (params) => {
    tableRef.current = params;
  };

  const setDynamicRenderer = (cellProps, extraProps, item) => {
    if (cellProps.node.level > 0) {
      return (
        <CellRenderers
          cellData={cellProps}
          column={item}
          extraProps={extraProps}
          // actions={actions}
        ></CellRenderers>
      );
    }
    return " ";
  };
  useEffect(() => {
    setShowloading(true);
    const setCols = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_grade_stores"
      );
      let timeBasedCols = storeCols.some(
        (item) => item.column_name === "start_date"
      );
      let actionCol = {
        headerName: "Action",
        minWidth: 150,
        cellRenderer: (params, extraProps) => {
          if (params.node.level !== 0) {
            return (
              <div>
                <IconButton
                  variant="text"
                  color="primary"
                  className={classes.actionButton}
                  onClick={() => {
                    onDeleteClick(params);
                  }}
                  disabled={params?.node?.parent?.data?.stores?.length === 1}
                  title="Delete"
                  size="large"
                >
                  <Delete />
                </IconButton>
              </div>
            );
          } else {
            return (
              <div>
                <IconButton
                  variant="text"
                  color="primary"
                  className={classes.actionButton}
                  onClick={() => {
                    addChildRow(params);
                  }}
                  disabled={params?.node?.data?.stores?.length > 2}
                  title="Add"
                  size="large"
                >
                  <AddIcon fontSize="small"></AddIcon>
                </IconButton>
              </div>
            );
          }
        },
        editable: false,
        colId: "action",
      };

      let updatedColumns = timeBasedCols
        ? [...storeCols, actionCol]
        : [...storeCols];
      if (timeBasedCols) {
        updatedColumns.forEach((item) => {
          if (item.accessor === "store_code") {
            item.cellRenderer = "agGroupCellRenderer";
          }
          if (item.accessor === "start_date" || item.accessor === "end_date") {
            item.type = "datetime";
            item.editable = false;
          }
          if (
            item.accessor === "min_store" ||
            item.accessor === "max_store" ||
            item.accessor === "wos" ||
            item.accessor === "start_date" ||
            item.accessor === "end_date"
          ) {
            item.cellRenderer = (cellProps, extraProps) => {
              return setDynamicRenderer(cellProps, extraProps, item);
            };
          }
        });
      }
      let permissionCheck = props.canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
        "edit"
      );
      if (!permissionCheck) {
        updatedColumns.forEach((item) => {
          if (
            ["wos", "min_store", "max_store"].indexOf(item.column_name) > -1
          ) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
      }
      timeBasedColumns.current = timeBasedCols;
      setColumns(updatedColumns);
      setShowloading(false);
    };
    setCols();
  }, []);

  const manualCallBack = async (manualbody, pageIndex) => {
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    try {
      let reqBody = {
        product_code: props.formvalues.product_code,
        store_codes: props.formvalues.store_codes || [],
        meta: {
          ...manualFilterbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };

      let { data: storeData } = await props.getStoreModalTableData(reqBody);
      storeData.data = storeData.data.map((item) => {
        if (item.stores) {
          item.stores = item.stores.map((subRow, index) => {
            subRow.original_start_date = subRow.start_date;
            subRow.product_code = item.product_code;
            subRow.uniqueID = index;
            subRow.store_code = item.store_code;
            subRow.uniqueParentKey = item.uniqueKey;
            return subRow;
          });
        }
        return item;
      });
      if (props.flagEdit) {
        storeData.data = storeData.data.map((item) => {
          item.min_store = props.formvalues.min_store;
          item.max_store = props.formvalues.max_store;
          item.wos = props.formvalues.wos;
          return item;
        });
      }
      return { data: storeData.data, totalCount: storeData?.total };
    } catch (err) {
      return { data: [], totalCount: 0 };
    }
  };

  const onCellValueChanged = (params) => {
    checkValidation(params.data, params);
    setEditedRows((editedRows) => {
      let updatedRows = [];
      if (editedRows.length > 0) {
        let checkAlreadyExists = editedRows.some(
          (item) =>
            item.store_code === params.data.store_code &&
            item.product_code === params.data.product_code
        );
        if (checkAlreadyExists) {
          updatedRows = editedRows.map((item) => {
            if (
              item.store_code === params.data.store_code &&
              item.product_code === params.data.product_code
            ) {
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
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onTimebasedCellValueChanged = (params, oldValue) => {
    checkValidation(params.data, params);
    setEditedRows((editedRows) => {
      try {
        let updatedRows = [];
        if (editedRows.length > 0) {
          let editedRowData = editedRows.filter(
            (item) => item.uniqueParentKey === params?.data?.uniqueParentKey
          );
          let editedRowStoreData = [];
          let checkAlreadyExists = false;
          if (editedRowData?.length > 0) {
            editedRowStoreData = editedRowData[0].stores;
          } else {
            checkAlreadyExists = false;
            let newRow = {
              product_code: props.formvalues.product_code,
              channel: props?.formvalues?.product_channel_name,
              uniqueParentKey: params.data.uniqueParentKey,
              stores: [params.data],
            };
            return [...editedRows, newRow];
          }
          checkAlreadyExists = editedRowStoreData.some(
            (item) => item.uniqueID === params.data.uniqueID
          );
          if (checkAlreadyExists) {
            let updatedStoreRows = editedRowStoreData.map((item) => {
              if (item.uniqueID === params.data.uniqueID) {
                item = params.data;
              }
              return item;
            });
            let finalUpdatedRows = editedRows.map((item) => {
              if (item.product_code === props.formvalues.product_code) {
                item.stores = [...updatedStoreRows];
              }
              return item;
            });
            updatedRows = [...finalUpdatedRows];
          } else {
            let finalUpdatedRows = editedRows.map((item) => {
              if (item.product_code === props.formvalues.product_code) {
                item.stores = [...item.stores, params.data];
              }
              return item;
            });
            updatedRows = [...finalUpdatedRows];
          }
        } else {
          let newRow = {
            product_code: props.formvalues.product_code,
            channel: props?.formvalues?.product_channel_name,
            stores: [params.data],
            uniqueParentKey: params.data.uniqueParentKey,
          };
          updatedRows = [...editedRows, newRow];
        }
        return updatedRows;
      } catch (err) {
        return [];
      }
    });
  };
  const addChildRow = (params) => {
    let newRowData = {
      store_code: params.data.store_code,
      min_store: null,
      wos: null,
      max_store: null,
      start_date: null,
      end_date: "2050-12-31",
      // original_start_date: null,
      action: "insert",
      product_code: params.data.product_code,
      uniqueID: params?.data?.stores?.length + 1,
      uniqueParentKey: params.data.uniqueKey,
      newRowAdded: true,
    };
    let storesData = [...params.data.stores, newRowData];

    let updated_data = {
      ...params.data,
    };
    updated_data.stores = storesData;
    setEditedRows((editedRows) => {
      let exitedUpdatedRows = [...editedRows].filter(
        (item) => item.uniqueParentKey === params.data.uniqueKey
      );
      if (exitedUpdatedRows?.length > 0) {
        let finalRows = [...editedRows].map((item) => {
          if (item.uniqueParentKey === params.data.uniqueKey) {
            item.stores = [...item.stores, newRowData];
          }
          return item;
        });
        return finalRows;
      } else {
        let newRow = {
          product_code: params.data.product_code,
          uniqueParentKey: params.data.uniqueKey,
          channel: params?.data?.product_channel_name,
          stores: [newRowData],
        };
        let editedPayload = [...editedRows, newRow];
        return editedPayload;
      }
    });
    params.node.setExpanded(false);
    params.node.setData(updated_data);
    params.api.flashCells({ rowNodes: [params.node] });
    params.node.setExpanded(true);
  };

  const onDeleteClick = (params) => {
    let parentNode = params.node.parent;
    let childNodes = params.node.parent.data.stores.filter((item) => {
      return item.uniqueID !== params.data.uniqueID;
    });
    let deletedNode = params.node.parent.data.stores
      .filter((item) => {
        return item.uniqueID === params.data.uniqueID;
      })
      .map((item) => {
        item.action = "delete";
        item.uniqueID = `${item.uniqueID}_delete`;
        return item;
      });
    childNodes = childNodes.map((item, index) => {
      item.uniqueID = index;
      return item;
    });
    if (!deletedNode[0].newRowAdded) {
      setEditedRows((editedRows) => {
        let exitedDeletedRows = [...editedRows].filter(
          (item) => item.uniqueParentKey === params.data.uniqueParentKey
        );
        if (exitedDeletedRows?.length > 0) {
          let finalRows = [...editedRows].map((item) => {
            if (item.uniqueParentKey === params.data.uniqueParentKey) {
              item.stores = [...item.stores, ...deletedNode];
            }
            return item;
          });
          return finalRows;
        } else {
          let newRow = {
            product_code: props.formvalues.product_code,
            uniqueParentKey: params.data.uniqueParentKey,
            channel: props?.formvalues?.product_channel_name,
            stores: [...deletedNode],
          };
          let editedPayload = [...editedRows, newRow];
          return editedPayload;
        }
      });
    }

    parentNode.setExpanded(false);
    let updated_data = { ...params.node.parent.data };
    updated_data.stores = childNodes;
    parentNode.setData(updated_data);
    params.api.flashCells({ rowNodes: [parentNode] });
    parentNode.setExpanded(true);
  };
  const onBlur = async (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    cellData
  ) => {
    timeBasedColumns.current
      ? onTimebasedCellValueChanged(cellData, _initialValue)
      : onCellValueChanged(cellData, _initialValue);
  };
  const onStoreDateCellValueChanged = (params) => {
    if (
      params.column.colId === "start_date" ||
      params.column.colId === "end_date"
    ) {
      try {
        let value = moment(params.newValue).format("YYYY-MM-DD");
        params.data[params.column.colId] = value;
        if (
          params.data.start_date &&
          params.data.end_date &&
          params.data.start_date !== "Invalid date"
        ) {
          let validateDate = dateValidation(
            params.data.start_date,
            params.data.end_date
          );
          if (params.data.start_date === params.data.end_date) {
            validateDate = false;
            displaySnackMessages(
              "Start date and end date can not be the same. Please enter other dates",
              "error"
            );
          }
          if (validateDate) {
            onTimebasedCellValueChanged(params);
          } else {
            if (params.column.colId === "end_date") {
              params.node.setDataValue(params.column.colId, "2050-12-31");
            } else {
              params.node.setDataValue(params.column.colId, "");
            }
          }
        } else {
          onTimebasedCellValueChanged(params);
        }
      } catch (err) {}
    }
    return {};
  };
  const onApply = async () => {
    setShowloading(true);
    try {
      let validateData;
      let hasConflictedDate;
      if (editedRows.length > 0) {
        let reqBody = editedRows.map((item) => {
          return {
            product_code: item.product_code,
            min: Number(item.min_store),
            wos: Number(item.wos),
            max: Number(item.max_store),
            stores: [item.store_code],
          };
        });
        if (timeBasedColumns.current) {
          reqBody = setTimeConstraintPostRequestBody(editedRows, true);
          validateData = checkValidationforTimeConstraint(reqBody);
          // let reqDateBody=editedRows
          hasConflictedDate = checkValidationforTimeConstraintDate(
            editedRows,
            tableRef
          );
        }
        if (validateData) {
          displaySnackMessages("Please enter values in all the field", "error");
        } else if (hasConflictedDate) {
          displaySnackMessages(
            "There is a duplications in date, please enter other dates",
            "error"
          );
        } else if (reqBody.length > 0) {
          if (timeBasedColumns.current) {
            reqBody = setTimeConstraintSavePayload(reqBody);
          }
          await props.saveStoreTableData(
            { data: reqBody },
            timeBasedColumns.current
          );
          props.displaySnackMessages("Data saved successfully", "success");
          props.onCancel(true);
        }
        setShowloading(false);
      } else {
        props.displaySnackMessages("No change to save", "warning");
        setShowloading(false);
      }
    } catch (err) {
      setShowloading(false);
      props.displaySnackMessages("Error while saving", "error");
    }
  };
  const onCancel = () => {
    props.onCancel();
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
          Store Mapped
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
            <Form
              updateDefaultValue={true}
              maxFieldsInRow={4}
              labelWidthSpan={5}
              fieldTypeWidthSpan={6}
              style={constraintsStyle}
              handleChange={() => null}
              fields={props.readonlyFormFields}
              defaultValues={props.formvalues}
            ></Form>
            <div className={classes.tableBody}>
              {columns.length > 0 && (
                <AgGridComponent
                  columns={columns}
                  manualCallBack={(body, pageIndex) =>
                    manualCallBack(body, pageIndex)
                  }
                  rowModelType={"serverSide"}
                  serverSideStoreType="partial"
                  cacheBlockSize={10}
                  totalCount={100} // to set the total count once received from BE
                  sizeColumnsToFitFlag
                  onBlur={onBlur}
                  childKey={"stores"}
                  treeData={true}
                  purgeClosedRowNodes={true}
                  hideChildSelection={true}
                  groupDisplayType={"custom"}
                  loadTableInstance={setTableInstance}
                  onCellValueChanged={onStoreDateCellValueChanged}
                  noRowOverlayMessage="No mapped stores present"
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
          onClick={onApply}
          id="modifyAddBtn"
          color="primary"
          disabled={
            !props.canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
              "create"
            )
          }
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
const mapStateToProps = (store) => {
  return {
    readonlyFormFields:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.inventorysmart_constraints.drillDown
        .readonlyFormFields,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setConstraintsLoader: (payload) => dispatch(setConstraintsLoader(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreModalTableData: (payload) =>
    dispatch(getStoreModalTableData(payload)),

  saveStoreTableData: (payload, apiType) =>
    dispatch(saveStoreTableData(payload, apiType)),
});
export default connect(mapStateToProps, mapDispatchToProps)(StoreTable);
