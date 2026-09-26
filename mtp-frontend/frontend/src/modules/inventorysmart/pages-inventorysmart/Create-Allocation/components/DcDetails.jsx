import { Button } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import {
  setStoreDcTableLoader,
  updateReserveQuantity,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import React from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const DcDetails = (props) => {
  const classes = useStyles();
  const { rowdata, columns, onBlur, loadTableInstance, channel } = props;

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const saveChanges = async () => {
    try {
      props.setStoreDcTableLoader(true);
      let l_req = [];
      rowdata.forEach((dc) => {
        l_req.push({
          dc_code: dc.dc_code,
          article: dc.product_code,
          channel: channel,
          sizes: dc.size,
          reserve_quantities: dc.Reserve_Quantity.map((i) => parseInt(i)),
        });
      });
      let l_response = await props.updateReserveQuantity(l_req);
      if (l_response.data.status) {
        displaySnackMessages(l_response.data.message, "success");
      }
    } catch (e) {
      displaySnackMessages("Error in Saving!!", "error");
    } finally {
      props.setStoreDcTableLoader(false);
    }
  };

  return (
    <div>
      <AgGridComponent
        toPrependContent={props.inventorysmartScreenConfig?.inventorysmart_create_allocation?.prependCustomData?.includes(
          "dcDetails"
        )}
        prependedContentDetails={props.prependData()}
        downloadAsExcel={props.inventorysmartScreenConfig?.inventorysmart_create_allocation?.enableDownloadExcel?.includes(
          "dcDetails"
        )}
        rowdata={rowdata}
        columns={columns}
        onBlur={onBlur}
        uniqueRowId={"dc_code"}
        sizeColumnsToFitFlag
        loadTableInstance={loadTableInstance}
        suppressFieldDotNotation
      />
      <div className={classes.buttonGroupWrapper}>
        <Button
          variant="contained"
          color="primary"
          disabled={!props.disableButton}
          className={classes.button}
          onClick={() => saveChanges(true)}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  updateReserveQuantity: (payload) => dispatch(updateReserveQuantity(payload)),
  setStoreDcTableLoader: (payload) => dispatch(setStoreDcTableLoader(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DcDetails);
