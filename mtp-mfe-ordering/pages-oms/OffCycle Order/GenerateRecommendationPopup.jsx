import React, { useState } from "react";
import { connect } from "react-redux";
import { Modal } from "impact-ui-v3";
import { TextField, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";

function GenerateRecommendationPopup(props) {
  const globalClasses = globalStyles();

  const [draftName, setDraftName] = useState("");

  const onCancel = () => {
    props?.closeDraftNamePopup();
  };

  const onConfirm = () => {
    if (draftName) {
      props?.callGenerateRecommendation(draftName);
    } else {
      props?.addSnack({
        message: "Please provide draft name",
        options: { variant: "info" },
      });
    }
  };

  return (
    <Modal
      onClose={() => onCancel()}
      title="Please provide draft name"
      size="small"
      height="200px"
      aria-labelledby="generate-recommendation-modal"
      open={true}
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => {
            onCancel();
          },
          variant: "contained",
        },
        {
          label: "Confirm",
          onClick: () => {
            onConfirm();
          },
          variant: "contained",
        },
      ]}
      primaryButtonLabel="Generate Recommendation"
      onPrimaryButtonClick={() => {
        onConfirm();
      }}
      primaryButtonProps={{
        disabled: !draftName || props?.isLoading,
      }}
      secondaryButtonProps={{
        disabled: props?.isLoading,
      }}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div className={`${globalClasses.centerAlign}`} style={{ gap: "1rem" }}>
        <Typography style={{ whiteSpace: "pre" }} variant="h6">
          Draft Name
        </Typography>
        <TextField
          placeholder=""
          size="small"
          characterLimit={240}
          fullWidth
          height="80px"
          width="480px"
          defaultValue=""
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
        />
      </div>
    </Modal>
  );
}

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});
export default connect(null, mapDispatchToProps)(GenerateRecommendationPopup);
