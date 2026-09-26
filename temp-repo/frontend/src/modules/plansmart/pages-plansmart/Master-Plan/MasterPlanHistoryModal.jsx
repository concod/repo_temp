import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { makeStyles } from "@mui/styles";
import { connect } from "react-redux";
import AgGridTable from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  masterPlanHistoryColDefLoaderSelector,
  masterPlanHistoryColDefSelector,
  masterPlanHistoryDataLoaderSelector,
  masterPlanHistoryDataSelector,
} from "modules/plansmart/services-plansmart/Master-Plan/master-plan-services";

const useStyles = makeStyles(() => ({
  titleDialog: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contentDialog: {
    padding: "10px 0px",
  },
}));

function MasterPlanHistoryModal(props) {
  const { show, handleClose, colDefLoader, dataLoader, colDef, data } = props;
  const classes = useStyles();
  return (
    <Dialog
      open={show}
      maxWidth="xl"
      fullWidth
      onClose={() => handleClose(false)}
    >
      <DialogTitle
        classes={{
          root: classes.titleDialog,
        }}
      >
        History
        <IconButton onClick={() => handleClose(false)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent
        classes={{
          root: classes.contentDialog,
        }}
      >
        <LoadingOverlay loader={colDefLoader || dataLoader}>
          <AgGridTable columns={colDef} rowdata={data} sideBar={false} />
        </LoadingOverlay>
      </DialogContent>
    </Dialog>
  );
}

const mapState = (state) => {
  return {
    colDefLoader: masterPlanHistoryColDefLoaderSelector(state),
    dataLoader: masterPlanHistoryDataLoaderSelector(state),
    colDef: masterPlanHistoryColDefSelector(state),
    data: masterPlanHistoryDataSelector(state),
  };
};

export default connect(mapState)(MasterPlanHistoryModal);
