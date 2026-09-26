import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import { Dialog, DialogContent, Typography,DialogTitle,Grid } from "@mui/material";
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

const ProductMappedListPopUp = (props) => {
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
        
        <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            Map Product to Supply-Route
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => props.closeModal()}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
        <DialogContent
          classes={{
            root: classes.dialogContentBody,
          }}
        >
          <Loader
            // loader={
            //   props.OrderAlertsPopUpTableConfigLoader ||
            //   props.OrderAlertsPopUpTableDataLoader
            // }
            minHeight={"350px"}
          >
            {
              <AgGridComponent
                columns={[]}
                rowdata={[]}
                selectAllHeaderComponent={false}
                uniqueRowId={"unique_id"}
                sideBar={false}
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
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
  };
};
const mapDispatchToProps = (dispatch) => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductMappedListPopUp);
