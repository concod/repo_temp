import { useState } from "react";
import {
  saveDefinition,
  setDataChangeStatus,
} from "core/pages/product-grouping/product-grouping-service";
import { addSnack } from "../../../../actions/snackbarActions";
import { connect } from "react-redux";
import { pseudocodeValidation } from "./common-functions";
import { useNavigate } from "react-router-dom-v5-compat";
import { Modal,Input } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles({
  definitionNameModal: {
    '&.ia_modalPopover.ia_modal_small': {
      height: '240px',
      width: '366px',
    },
  },
});

const DefintionName = (props) => {
  const classes = useStyles();
  const [definitionName, setdefinitionName] = useState("");
  const navigate = useNavigate();
  const saveGrpDefinition = async () => {
    if (definitionName === "") {
      props.addSnack({
        message: "Name can't be empty",
        options: {
          variant: "error",
        },
      });
      return;
    }
    if (!pseudocodeValidation(props.psuedocode, props.subrules)) {
      props.addSnack({
        message: "Please enter a valid definition",
        options: {
          variant: "error",
        },
      });
      return;
    }
    const definitionJSON = {
      name: definitionName,
      pseudo_code: props.psuedocode,
      rules: props.subrules.map((subrule) => {
        return {
          name: subrule.name,
          attribute_name: subrule.field,
          attribute_values: subrule.value,
        };
      }),
    };
    try {
      await props.saveDefinition(definitionJSON);
      props.setDataChangeStatus({ status: true, dataType: "definition_saved" });
      props.addSnack({
        message: "Definition created successfully",
        options: {
          variant: "success",
          autoHideDuration: 2000,
          onClose: () => {
            navigate(props.prevScr);
          },
        },
      });
      props.handleClose();
      props.resetDefinition();
    } catch (error) {
      props.addSnack({
        message: error?.response?.data?.message || "Definition creation failed",
        options: {
          variant: "error",
        },
      });
    }
  };
  return (
    <>
      <Modal
        className={classes.definitionNameModal}
        open={props.open}
        onClose={() => props.handleClose()}
        onPrimaryButtonClick={saveGrpDefinition}
        onSecondaryButtonClick={props.handleClose}
        primaryButtonLabel="Submit"
        secondaryButtonLabel="Cancel"
        size="small"
        title="Enter Definition Name"
      >
        <Input
          placeholder="Enter here"
          value={definitionName}
          id="productGrpingCrtDfnNameInp"
          onChange={(event) => setdefinitionName(event.target.value)}
        />
      </Modal>
    </>
  );
};
const mapActionsToProps = {
  saveDefinition,
  addSnack,
  setDataChangeStatus,
};
export default connect(null, mapActionsToProps)(DefintionName);
