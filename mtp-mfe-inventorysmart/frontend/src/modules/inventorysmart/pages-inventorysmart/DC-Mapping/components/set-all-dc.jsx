import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import Form from "core/Utils/form";
import { TEXT_FIELDS_SETALL } from "config/constants";
import moment from "moment";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";

function SetAllDc(props) {
  const [confirmBox, showConfirmBox] = useState(false);
  const [formData, setFormData] = useState({});
  const [formFields, setformFields] = useState(props.fields);
  const [flagEdit, setFlagEdit] = useState(false);

  useEffect(() => {
    const setOptions = async () => {
      let fields = props.fields.map(async (item) => {
        item.required = true;
        if (TEXT_FIELDS_SETALL.indexOf(item.field_type) > -1) {
          item.field_type = "TextField";
        }

        return item;
      });
      let formfields = await Promise.all(fields);
      setformFields(formfields);
    };
    setOptions();
  }, []);

  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    if (flagEdit) {
      showConfirmBox(true);
    } else {
      props.handleModalClose();
    }
  };

  const onApply = async () => {
    try {
      let requiredFieldsError = false;
      [...formFields].forEach((item) => {
        if (item.required && !formData[item.accessor]) {
          requiredFieldsError = true;
        }
      });
      if (requiredFieldsError) {
        displaySnackMessages(
          "Please Enter the data in all the required fields",
          "error"
        );
      } else {
        Object.keys(formData).forEach((key) => {
          if (
            typeof formData[key] === "object" &&
            !Array.isArray(formData[key])
          ) {
            formData[key] = moment(formData[key]).format("YYYY-MM-DD");
          }
        });
        await props.onApply(formData);
        displaySnackMessages("Successfully applied values", "success");
        props.handleModalClose();
      }
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const getDefaultValues = () => {
    let defaultValues = {};
    props.fields.forEach((item) => {
      defaultValues[item.accessor] = "";
    });
    return defaultValues;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className="setAllModal"
      maxWidth={"sm"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      {confirmBox && (
        <ConfirmBox
          onClose={() => showConfirmBox(false)}
          onConfirm={() => {
            showConfirmBox(false);
            props.handleModalClose();
          }}
        />
      )}
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          Set All Values
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
        <Form
          handleChange={handleChange}
          fields={formFields}
          updateDefaultValue={true}
          defaultValues={getDefaultValues}
        ></Form>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onCancel();
          }}
          color="primary"
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={onApply} color="primary">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const mapActionsToProps = {
  addSnack,
};

export default connect(null, mapActionsToProps)(SetAllDc);
