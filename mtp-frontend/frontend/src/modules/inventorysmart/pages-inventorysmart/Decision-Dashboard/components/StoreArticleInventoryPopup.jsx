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
  getPOStoreCount,
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

      if (props.isPO) {
        props.setStoreInventoryLoader(true);
        let req = {
          po_code: props.poCode,
          body: {
            article: props.article,
          },
        };
        let response = await props.getPOStoreCount(req);
        let l_formattedColumns = agGridColumnFormatter(
          response?.data?.data?.table_config
        );
        let l_data = response?.data?.data?.table_data;
        setStoreInventoryTableColumns(l_formattedColumns);
        setStoreInventoryData(l_data);
        props.setStoreInventoryLoader(false);
        return;
      }
      
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

        if ((props.inventorysmartScreenConfig?.client === "_NA" || props.inventorysmartScreenConfig?.client === "_EU") && props?.addReference) {
          body.reference = "aid";
        }

        // custom flow for nrf agent demo. config key: custom_agent_flow_payload
        if (
          props?.inventorysmartScreenConfig?.dashboard?.drillDown
            ?.custom_agent_flow_payload
        ) {
          body.filters = [
            ...body.filters,
            {
              filter_type: "cascaded",
              attribute_name: "special_classification",
              operator: "not in",
              dimension: "store",
              values: ["WHS"],
              system_filter: true,
            },
          ];
        }

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

  const getNewSubHeaders = (p_subCols, p_label) => {
    let newSubHead = []
    p_subCols.forEach((subCol) => {
   
      if (subCol.extra.displayClusteredCol) {
        newSubHead.push({
          ...subCol,
          extra: {"hide_from_panel": true,},
          columnGroupShow: 'closed',
          
        })
      }
      newSubHead.push({
        ...subCol,
        columnGroupShow: 'open'
      })
    })
    if (p_label == "DC Inventory") {
      newSubHead.push(TOTAL_INVENTORY_DC_COL_ALERTS_RL);
    }
    return newSubHead
  };

  const isClusterOpen = (p_colName) => {
    if (p_colName == "Store Inventory") {
      return true
    }
    return false
  }

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setStoreInventoryTableConfigLoader(true);
      let columns = await props.getStoreInventoryTableConfiguration();
      props.setStoreInventoryTableConfigLoader(false);
      let modifiedColumns = columns?.data?.data;
      // Handling cluster columns for RL_NA for second popup in Alerts Table
      if(props?.inventorysmartScreenConfig?.dashboard?.AlertsTableColumnApiAvoidCall){
        modifiedColumns = modifiedColumns?.map((column) => {
          // Handle `sub_headers` exist
          if (column.sub_headers.length){
            
            column = {
              ...column,
              ...(isClusterOpen(column.label) && { openByDefault: true }),
              sub_headers: getNewSubHeaders(column.sub_headers, column.label,'sub_headers'),              
            };
          }
        
          return column;
        });
    }
    let formattedColumns = agGridColumnFormatter(modifiedColumns);
      setStoreInventoryTableColumns(formattedColumns);
  };

    if (props.isPO) {
      fetchStoreInventoryData();
    } else if (props.active) {
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
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
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
  getPOStoreCount: (payload) => dispatch(getPOStoreCount(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreArticleInventoryPopup);
