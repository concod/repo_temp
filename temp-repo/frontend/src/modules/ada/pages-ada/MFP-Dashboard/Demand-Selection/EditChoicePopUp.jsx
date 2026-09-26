import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useMemo, useRef, useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import EditHierarcyForecast from "../../Dashboard/edit-forecast/edit-hierarcy-forecast";
import { forwardRef } from "react";
import classNames from "classnames";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useSelector } from "react-redux";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
    "& .MuiPaper-root": {
      left: "14px",
      height: "100%",
    },
  },
  button: {
    height: "20%",
    marginTop: "1.5rem",
  },
}));

const EditChoicePopUp = forwardRef((props, ref) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const {
    activeKey,
    lastEditedDrivers,
    setCounterOnEditHierarchyChange,
    setActiveChildHierarchyKey,
    resetDemandSelectionRefs,
    setPopUpCloseCounter,
    popUpCloseCounter,
  } = props;
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const onCancel = () => {
    props?.setShowSetAllModal(false);
    setPopUpCloseCounter((prevState) => prevState + 1);
    resetDemandSelectionRefs();
  };
  const l0DisplayName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l0?.display_name ||
    adaReducer?.tenantFilters?.l0?.display_name;
  return (
    <Dialog
      //onClose={() => onCancel()}
      className={classes.root}
      maxWidth={"100%"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      style={{ background: "rgba(90, 90, 90, 0.5)" }}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            {l0DisplayName}:-{" "}
            {props?.selectedRows[0]?.choice
              ? replaceSpecialCharacter(
                  props?.selectedRows[0]?.choice.toString()
                )
              : ""}{" "}
            and Channel:-
            {props?.selectedRows[0]?.channel}
          </Typography>
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
        <div className={classNames(globalClasses.marginVertical1rem)}>
          <EditHierarcyForecast
            setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
            setActiveChildHierarchyKey={setActiveChildHierarchyKey}
            key={activeKey + popUpCloseCounter}
            {...props}
            lastEditedDrivers={lastEditedDrivers}
            ref={ref}
            showIAData={false}
            isCalledFromMFPDashboard={true}
            id={"adjusted"}
            onCancel={onCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default EditChoicePopUp;
