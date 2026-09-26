import React, { useState, useRef } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { setFormFilters } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { Button, Grid, Typography, Tooltip } from "@mui/material";
import UpdateIcon from "@mui/icons-material/Update";
import DownloadIcon from "@mui/icons-material/Download";
import {
  setDropShipVendorSkuTableConfigLoader,
  setDropShipVendorSkuTableData,
  setDropShipVendorSkuTableDataLoader,
  getDropShipVendorSkuLevelTableData,
  updateDropShipVendorSkuPredictions,
  setUpdateDropShipPredictionsSuccess,
  getDropShipVendorSkuCostTableData,
  getDropShipVendorSkuUnitTableData,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/drop-ship-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  OMS_EMPTY_ADJUSTED_PREDICTIONS,
  UPDATED_MESSAGE,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import VendorSkuCostProjections from "./VendorSkuCostProjections";
import VendorSkuUnitProjections from "./VendorSkuUnitProjections";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const DropShipSkuProjections = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [isSaveHidden, setIsSaveHidden] = useState(true);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [editedPredictions, setEditedPredictions] = useState([]);

  const [showSetAllPopUp, setShowSetAllPopUp] = useState(false);
  const [isRevertEnabled, setIsRevertEnabled] = useState(false);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const downloadCsv = async () => {
    let filterArray = [];
    if (props.selectedFilters.length > 0) {
      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          filterArray.push(filter);
        }
      });
    }
    let body = {
      filters: filterArray,
      meta: {
        ...tableConfigurationMetaData.meta,
        limit: { limit: totalCount, page: 1 },
      },
    };
    displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");

    let response = {};
    if (props.showProjectionCosts)
      response = await props.getDropShipVendorSkuCostTableData(body);
    else response = await props.getDropShipVendorSkuUnitTableData(body);

    if (response.data.status) {
      let downloadData = agGridRowFormatter(response?.data?.data?.data);
      let columns = response?.data?.data?.column;
      let formattedColumns = agGridColumnFormatter(columns, null);
      setCsvData(cloneDeep(downloadData), formattedColumns);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const setValueForEditedPredictions = (data) => {
    setEditedPredictions(data);
    if (data.length > 0) setIsSaveDisabled(false);
  };

  const saveAdjustedProjections = async () => {
    let invalidData = false;
    if (editedPredictions && editedPredictions.length > 0) {
      editedPredictions.forEach((cell) => {
        if (!cell.adjusted_predictions > 0 || cell.adjusted_predictions === "")
          invalidData = true;
      });
    }

    if (!invalidData) {
      props.setDropShipVendorSkuTableConfigLoader(true);
      setIsSaveDisabled(true);
      let body = {
        data: editedPredictions,
      };
      let response = await props.updateDropShipVendorSkuPredictions(body);
      if (response.data.status) {
        props.setDropShipVendorSkuTableConfigLoader(false);
        props?.setUpdateDropShipPredictionsSuccess(true);
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setEditedPredictions([]);
      }
    } else {
      setIsSaveDisabled(false);
      displaySnackMessages(OMS_EMPTY_ADJUSTED_PREDICTIONS, "error");
    }
  };

  const openSetAllPopUp = () => {
    setShowSetAllPopUp(true);
  };

  return (
    <>
      <div className={globalClasses.marginVertical1rem}>
        <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"space-between"}
        >
          <Grid container alignItems={"center"} item xs={6}>
            <Typography variant="h6">
              Vendor-SKU Forecast Projections
            </Typography>
          </Grid>

          {!props.dropShipVendorSkuTableConfigLoader &&
            !props.dropShipVendorSkuTableDataLoader && (
              <Grid
                container
                alignItems={"center"}
                item
                xs={6}
                justifyContent={"flex-end"}
              >
                {props?.inventorysmartOmsCommonConfig?.isEditButton
                  ?.isVisible &&
                  !props.showProjectionCosts &&
                  !isSaveHidden && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        id="revertIconBtn"
                        className={classes.button}
                        onClick={openSetAllPopUp}
                        disabled={!isRevertEnabled}
                      >
                        Revert
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        id="updateIconBtn"
                        className={classes.button}
                        onClick={saveAdjustedProjections}
                        disabled={isSaveDisabled}
                      >
                        <UpdateIcon fontSize="small"></UpdateIcon>
                      </Button>
                    </>
                  )}

                <Tooltip title="Download">
                  <Button
                    variant="contained"
                    className={classes.button}
                    sx={{ mr: 0 }}
                    onClick={async () => {
                      await downloadCsv();
                      downloadLink.current.link.click();
                    }}
                    startIcon={<DownloadIcon />}
                    disabled={totalCount === 0}
                  >
                    Download
                  </Button>
                </Tooltip>
                {downloadExcelLink(
                  csvData,
                  "drop_ship_sku_projections",
                  downloadLink,
                  csvHeaders,
                  "",
                  "",
                  true
                )}
              </Grid>
            )}
        </Grid>

        {props.showProjectionCosts ? (
          <VendorSkuCostProjections setTotalCount={setTotalCount} />
        ) : (
          <VendorSkuUnitProjections
            setValueForEditedPredictions={setValueForEditedPredictions}
            setIsSaveHidden={setIsSaveHidden}
            setTotalCount={setTotalCount}
            showSetAllPopUp={showSetAllPopUp}
            setShowSetAllPopUp={setShowSetAllPopUp}
            isRevertEnabled={isRevertEnabled}
            setIsRevertEnabled={setIsRevertEnabled}
          />
        )}
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDropShipService.selectedFilters,
    dropShipVendorSkuTableConfigLoader:
      store.inventorysmartReducer.inventorySmartDropShipService
        .dropShipVendorTableConfigLoader,
    dropShipVendorSkuTableDataLoader:
      store.inventorysmartReducer.inventorySmartDropShipService
        .dropShipVendorTableDataLoader,
    updateDropShipPredictionsSuccess:
      store.inventorysmartReducer.inventorySmartDropShipService
        .updateDropShipPredictionsSuccess,
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getDropShipVendorSkuLevelTableData: (payload) =>
    dispatch(getDropShipVendorSkuLevelTableData(payload)),
  setDropShipVendorSkuTableConfigLoader: (payload) =>
    dispatch(setDropShipVendorSkuTableConfigLoader(payload)),
  setDropShipVendorSkuTableDataLoader: (payload) =>
    dispatch(setDropShipVendorSkuTableDataLoader(payload)),
  setDropShipVendorSkuTableData: (payload) =>
    dispatch(setDropShipVendorSkuTableData(payload)),
  updateDropShipVendorSkuPredictions: (payload) =>
    dispatch(updateDropShipVendorSkuPredictions(payload)),
  setUpdateDropShipPredictionsSuccess: (payload) =>
    dispatch(setUpdateDropShipPredictionsSuccess(payload)),
  getDropShipVendorSkuCostTableData: (payload) =>
    dispatch(getDropShipVendorSkuCostTableData(payload)),
  getDropShipVendorSkuUnitTableData: (payload) =>
    dispatch(getDropShipVendorSkuUnitTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DropShipSkuProjections);
