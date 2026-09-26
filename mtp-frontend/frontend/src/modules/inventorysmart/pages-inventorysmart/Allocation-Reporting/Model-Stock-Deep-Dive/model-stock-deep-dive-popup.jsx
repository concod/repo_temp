import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import classnames from "classnames";

import { Dialog, DialogContent, Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getModelStockDeepDivePopupTableConfig,
  setModelStockDeepDivePopupConfigLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/model-stock-deep-dive-service";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
}));

const ModelStockDeepDiveComponentPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [
    modelStockPopupTableColumns,
    setModelStockPopupTableColumns,
  ] = useState([]);

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setModelStockDeepDivePopupConfigLoader(true);
      let columns = await props.getModelStockDeepDivePopupTableConfig();
      props.setModelStockDeepDivePopupConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      setModelStockPopupTableColumns(formattedColumns);
    };

    if (props.active) {
      fetchColumnData();
    }
  }, [props.active]);

  return props.active ? (
    <Dialog
      id="modelStockDeepDive"
      aria-labelledby="model-stock-deep-dive-dialog"
      open={props.active}
      maxWidth="md"
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
      classes={{
        paperFullWidth: classes.paperFullWidth,
      }}
    >
      <DialogContent
        dividers
        classes={{
          root: classnames(
            classes.dialogContentRoot,
            globalClasses.flexRow,
            globalClasses.layoutAlignBetweenCenter
          ),
        }}
      >
        <Typography classes={{ root: classes.moduleTitle }}>
          Model Stock Deep Dive - Store View
        </Typography>
        <IconButton color="primary" onClick={props.closeModal} size="large">
          <CloseIcon fontSize="medium" />
        </IconButton>
      </DialogContent>
      <DialogContent
        dividers
        classes={{
          root: classes.dialogContentBody,
        }}
      >
        <Loader
          loader={props.modelStockDeepDivePopupConfigLoader}
          minHeight={"350px"}
        >
          {modelStockPopupTableColumns?.length > 0 && (
            <AgGridComponent
              columns={modelStockPopupTableColumns}
              rowdata={props.data}
              selectAllHeaderComponent={false}
              downloadAsExcel={props.enableDownload}
              disableExcelDownload={props.data?.length ? false : true}
              uniqueRowId={"store_code"}
            />
          )}
        </Loader>
      </DialogContent>
    </Dialog>
  ) : null;
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;

  return {
    modelStockDeepDivePopupConfigLoader:
      inventorysmartReducer.inventoryModelStockDeepDiveService
        .modelStockDeepDivePopupConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getModelStockDeepDivePopupTableConfig: (payload) =>
    dispatch(getModelStockDeepDivePopupTableConfig(payload)),
  setModelStockDeepDivePopupConfigLoader: (payload) =>
    dispatch(setModelStockDeepDivePopupConfigLoader(payload)),

  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ModelStockDeepDiveComponentPopup);
