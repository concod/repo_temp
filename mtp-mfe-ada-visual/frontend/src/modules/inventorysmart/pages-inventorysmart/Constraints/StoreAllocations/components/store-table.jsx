import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { checkValidation } from "./config";
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

const StoreTable = (props) => {
  const [columns, setColumns] = useState([]);
  const classes = useConstraintsStyles();
  const [showloading, setShowloading] = useState(false);
  const [editedRows, setEditedRows] = useState([]);

  useEffect(() => {
    setShowloading(true);
    const setCols = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_grade_stores"
      );
      let permissionCheck = props.canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
        "edit"
      );
      if (!permissionCheck) {
        storeCols.forEach((item) => {
          if (
            ["wos", "min_store", "max_store"].indexOf(item.column_name) > -1
          ) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
      }
      setColumns(storeCols);
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

  const onBlur = async (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    cellData
  ) => {
    onCellValueChanged(cellData);
  };

  const onApply = async () => {
    setShowloading(true);
    try {
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
        await props.saveStoreTableData({ data: reqBody });
        props.displaySnackMessages("Data saved successfully", "success");
        setShowloading(false);
        props.onCancel(true);
      } else {
        props.displaySnackMessages("No change to save", "error");
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
                />
              )}
              \
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

  saveStoreTableData: (payload) => dispatch(saveStoreTableData(payload)),
});
export default connect(mapStateToProps, mapDispatchToProps)(StoreTable);
