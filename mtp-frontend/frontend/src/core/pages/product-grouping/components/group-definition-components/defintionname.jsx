import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useState } from "react";
import {
  saveDefinition,
  setDataChangeStatus,
} from "core/pages/product-grouping/product-grouping-service";
import { addSnack } from "../../../../actions/snackbarActions";
import { connect } from "react-redux";
import { pseudocodeValidation } from "./common-functions";
import { useNavigate } from "react-router-dom-v5-compat";

const DefintionName = (props) => {
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
    <Dialog
      id="productGrpingDfnNameDialog"
      open={props.open}
      fullWidth={true}
      maxWidth={"sm"}
      onClose={props.handleClose}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title">Enter definition name</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          placeholder="Enter here"
          fullWidth
          value={definitionName}
          id={"productGrpingCrtDfnNameInp"}
          onChange={(event) => setdefinitionName(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button
          id="productGrpingDfnNameCnclBtn"
          onClick={props.handleClose}
          color="primary"
        >
          Cancel
        </Button>
        <Button
          id="productGrpingDfnNameSaveBtn"
          onClick={saveGrpDefinition}
          color="primary"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
const mapActionsToProps = {
  saveDefinition,
  addSnack,
  setDataChangeStatus,
};
export default connect(null, mapActionsToProps)(DefintionName);
