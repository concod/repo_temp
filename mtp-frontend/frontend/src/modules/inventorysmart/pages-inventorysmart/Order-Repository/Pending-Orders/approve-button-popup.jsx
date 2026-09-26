import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import { Prompt } from "impact-ui";
import {
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useState } from "react";

const useStyles = makeStyles({
  titleStyle: {
    fontWeight: 600,
    textAlign: "center",
  },

  contentStyle: {
    textAlign: "center",
  },

  dialogStyle: {
    padding: "1rem 2rem",
  },
});

const SendApprovalButton = ({ setShowSetAllModal }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const ClosePopUp = () => {
    setShowSetAllModal(false);
  };

  const confirmApproval = () => {
    //Function for Yes
  };

  const css_Styles = {
    dialog: classes.dialogStyle,
    title: classes.titleStyle,
    dialogContentText: classes.contentStyle,
  };

  return (
    <>
      <Prompt
        isOpen={setShowSetAllModal}
        title="PO Creation"
        subHeading="Are you sure you want to go ahead with PO creation?"
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_CONFIRM_BTN_TEXT,
          onClick: () => {
            confirmApproval();
            ClosePopUp();
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => ClosePopUp(),
        }}
      />
    </>
  );
};

export default SendApprovalButton;
