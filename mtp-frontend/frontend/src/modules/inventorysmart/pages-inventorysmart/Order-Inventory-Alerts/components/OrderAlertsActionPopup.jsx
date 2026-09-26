import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import { Dialog, DialogContent, Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
}));

const OrderAlertsActionPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <>
      <Dialog
        id="orderInventoryDialog"
        aria-labelledby="order-inventory-dialog"
        open={props.active}
        maxWidth="lg"
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
            Review Recommendation
          </Typography>
          <IconButton color="primary" onClick={props.closeModal} size="large">
            <CloseIcon fontSize="medium" />
          </IconButton>
        </DialogContent>
        <DialogContent
          classes={{
            root: classes.dialogContentBody,
          }}
        >
          <Loader
            loader={
              props.OrderAlertsPopUpTableConfigLoader ||
              props.OrderAlertsPopUpTableDataLoader
            }
            minHeight={"350px"}
          >
            {
              <AgGridComponent
                columns={props.tableConfig}
                rowdata={props.tableData}
                selectAllHeaderComponent={false}
                uniqueRowId={"unique_id"}
              />
            }
          </Loader>
        </DialogContent>
      </Dialog>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    alertsActionPopupConfigLoader:
      store.inventorysmartReducer.inventorySmartAlertsActionService
        .alertsActionPopupConfigLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
    OrderAlertsPopUpTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderAlertsService
        .OrderAlertsPopUpTableConfigLoader,
    OrderAlertsPopUpTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderAlertsService
        .OrderAlertsPopUpTableDataLoader,
  };
};
const mapDispatchToProps = (dispatch) => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderAlertsActionPopup);
