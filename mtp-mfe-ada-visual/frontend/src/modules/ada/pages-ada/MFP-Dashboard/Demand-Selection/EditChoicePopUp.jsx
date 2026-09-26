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
import ViewHierarchyDriversSignificance from "../../Dashboard/edit-forecast-wrapper/ViewHierarchyDriversSignificance";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import EditHierarcyForecast from "../../Dashboard/edit-forecast/edit-hierarcy-forecast";
import { forwardRef } from "react";
import classNames from "classnames";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useSelector } from "react-redux";
import { useTranslation } from "impact-ui-v3";

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
  const { t } = useTranslation();

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
  const Mfp_Key =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp?.mfp_level;
  const channelsRef = useRef([]);
  const showDriverSignificance =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;
  const mfpChoiceTableFirstCol = adaReducer?.tableColumns?.mfp_choice_table[0];
  const l1TableColumnName = adaReducer?.tableColumns?.detail_table_2[0];

  const onCancel = () => {
    props?.setShowSetAllModal(false);
    setPopUpCloseCounter((prevState) => prevState + 1);
    resetDemandSelectionRefs();
  };
  const mfpDisplayName = mfpChoiceTableFirstCol?.label;
  const mfpColumnName = mfpChoiceTableFirstCol.column_name;
  const l1Columnname = l1TableColumnName.column_name;

  const isL0TableHidden = mfpColumnName === l1Columnname;
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
            {mfpDisplayName}:-
            {props?.selectedRows[0]?.[Mfp_Key]
              ? replaceSpecialCharacter(
                  props?.selectedRows[0]?.[Mfp_Key].toString()
                )
              : ""}{" "}
            {t("ada.editChoicePopup.andChannel")}
            {replaceSpecialCharacter(props?.selectedRows[0]?.channel)}
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
            isL0TableHidden={isL0TableHidden}
          />
        </div>
        {showDriverSignificance && (
          <ViewHierarchyDriversSignificance
            activeKey={activeKey}
            ref={{ channelsRef }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
});

export default EditChoicePopUp;
