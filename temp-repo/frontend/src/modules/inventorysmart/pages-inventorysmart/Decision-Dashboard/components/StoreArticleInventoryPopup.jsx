import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import classnames from "classnames";

import { Dialog, DialogContent, Typography } from "@mui/material";
import {
  ERROR_MESSAGE,
  STORE_INVENTORY_LABEL_MAPPINGS,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getStoreInventoryTableConfiguration,
  getStoreInventoryTableData,
  setStoreInventoryTableConfigLoader,
  setStoreInventoryLoader,
  setStoreInventoryTableData,
  getStoreDetailsAtSizes,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
}));

const StoreArticleInventoryPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [storeInventoryTableColumns, setStoreInventoryTableColumns] = useState(
    []
  );
  const [storeInventoryData, setStoreInventoryData] = useState([]);

  const fetchStoreInventoryData = async () => {
    try {
      props.setStoreInventoryLoader(true);
      if (props.storeDcModal) {
        let body = {
          filters: props.filters,
          article: props.article,
        };
        let response = await props.getStoreDetailsAtSizes(body);
        if (response.data.status) {
          let l_formattedColumns = agGridColumnFormatter(
            response?.data?.data?.columns?.[props.metric]
          );
          let l_data = response?.data?.data?.data;
          const dc_cols=[
            "available_to_allocate","dc_oh_1","dc_oh_qcloc","dc_oh_cwc",
            "oo_dc","it_dc","bulk_remaining","dc_oh_1_wms_location"
          ]
          if (dc_cols.includes(props.metric))
            l_data = l_data?.filter((data) => data.is_dc);
          else l_data = l_data?.filter((data) => !data.is_dc);

          setStoreInventoryTableColumns(l_formattedColumns);
          setStoreInventoryData(l_data);
          props.setStoreInventoryLoader(false);
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        let body = {
          filters: props.filters,
          meta: {
            ...tableConfigurationMetaData.meta,
          },
          article: props.article,
          metrics: props.metric,
        };
        let response = await props.getStoreInventoryTableData(body);
        if (response.data.status) {
          setStoreInventoryData(response.data.data);
          props.setStoreInventoryTableData(response.data);
          props.setStoreInventoryLoader(false);
          return { ...response.data, totalCount: response.data.total };
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return [];
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

  const resetStoreArticleInventoryData = () => {
    setStoreInventoryData([]);
    setStoreInventoryTableColumns([]);
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setStoreInventoryTableConfigLoader(true);
      let columns = await props.getStoreInventoryTableConfiguration();
      props.setStoreInventoryTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      setStoreInventoryTableColumns(formattedColumns);
    };

    if (props.active) {
      !props.storeDcModal && fetchColumnData();
      fetchStoreInventoryData();
    } else {
      resetStoreArticleInventoryData();
    }
  }, [props.active, props.storeDcModal]);

  return props.active ? (
    <Dialog
      id="storeInventoryDialog"
      aria-labelledby="store-invenotry-dialog"
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
          {props.title ? props.title : props.metric}
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
          loader={
            props.storeInventoryLoader || props.storeInventoryTableConfigLoader
          }
          minHeight={"350px"}
        >
          {storeInventoryTableColumns?.length > 0 &&
            !props.storeInventoryLoader &&
            !props.storeInventoryTableConfigLoader && (
              <AgGridComponent
                columns={storeInventoryTableColumns}
                rowdata={storeInventoryData}
                selectAllHeaderComponent={false}
                uniqueRowId={"store_code"}
                pagination={
                  !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                    "dashboard"
                  )
                }
                suppressFieldDotNotation
              />
            )}
        </Loader>
      </DialogContent>
    </Dialog>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    storeInventoryLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .storeInventoryLoader,
    storeInventoryTableConfigLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .storeInventoryTableConfigLoader,
    storeInventoryTableData:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .storeInventoryTableData,
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreInventoryTableConfiguration: (payload) =>
    dispatch(getStoreInventoryTableConfiguration(payload)),
  getStoreInventoryTableData: (payload) =>
    dispatch(getStoreInventoryTableData(payload)),
  getStoreDetailsAtSizes: (payload) =>
    dispatch(getStoreDetailsAtSizes(payload)),
  setStoreInventoryTableConfigLoader: (payload) =>
    dispatch(setStoreInventoryTableConfigLoader(payload)),
  setStoreInventoryLoader: (payload) =>
    dispatch(setStoreInventoryLoader(payload)),
  setStoreInventoryTableData: (payload) =>
    dispatch(setStoreInventoryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreArticleInventoryPopup);
