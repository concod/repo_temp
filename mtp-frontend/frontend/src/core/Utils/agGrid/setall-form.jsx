import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Snackbar,
} from "@mui/material";
import { END_DATE } from "config/constants";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../confirmPrompt/confirmPopup";
import { addSnack } from "core/actions/snackbarActions";
import Form from "../form";
import Loader from "../Loader/loader";
import { TEXT_FIELDS_SETALL } from "../../../config/constants";
import moment from "moment";
import Alert from "@mui/material/Alert";
import { cloneDeep } from "lodash";

const SetAll = (props) => {
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [formFields, setformFields] = useState([]);
  const [flagEdit, setFlagEdit] = useState(false);
  const [errorPopup, setErrorPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const setOptions = async () => {
      let fields = props.fields.map(async (item) => {
        let eachField = cloneDeep(item);
        eachField.field_type = item.type;
        if (TEXT_FIELDS_SETALL.indexOf(item.type) > -1) {
          eachField.field_type = "TextField";
        }
        if (
          item.type === "percentage" ||
          item.type === "dollar" ||
          item.type === "float" ||
          item.type === "int"
        ) {
          eachField.field_type = "TextField";
          eachField.value_type = "number";
        }
        if (
          eachField.type === "dateStr" ||
          eachField.type === "DateTimeField"
        ) {
          eachField.type = "DateTimeField";
          eachField.field_type = "DateTimeField";
          eachField.maxDate = eachField.maxDate || END_DATE;
        }
        eachField.label = item.setAllLabel || item.label;
        eachField.accessor = item.column_name;
        return eachField;
      });

      let formField = await Promise.all(fields);
      setformFields(formField);
      setLoading(false);
    };
    setOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setLoading(true);
      let requiredFieldsError = false,
        validateKey = [],
        isValid = true,
        validateRequired = false,
        dateFieldError = false;
      const today = moment();
      [...formFields].forEach((item) => {
        if (item.isDataValidate) {
          validateKey.push(item.column_name);
        }
        if (item.required && !formData[item.id]) {
          requiredFieldsError = true;
        }
        if (
          item.field_type === "DateTimeField" &&
          ((item.disablePast &&
            moment(formData[item.id]).isBefore(today, "day")) ||
            (item.disableFuture &&
              moment(formData[item.id]).isAfter(today, "day")))
        ) {
          dateFieldError = true;
        }
      });
      if (requiredFieldsError) {
        setErrorMsg("Please Enter the data in all the required fields");
        setErrorPopup(true);
      } else if (dateFieldError) {
        setErrorMsg("Please enter correct date.");
        setErrorPopup(true);
      } else {
        Object.keys(formData).forEach((key) => {
          if (validateKey.includes(key)) {
            validateRequired = true;
          }
          if (
            typeof formData[key] === "object" &&
            !Array.isArray(formData[key])
          ) {
            formData[key] = moment(formData[key]).format("YYYY-MM-DD");
          }
        });
        if (validateRequired) {
          isValid = props.handleValidation(formData, props);
        }
        if (isValid) {
          //If we get response from the set all, we display the message coming in the response
          //Else we display the default message
          const setAllResponse = await props.onApply(formData);
          //only give alert if not having props.setAllButtonLabel i.e having only Apply and not having Apply and Save func
          if (!props.setAllButtonLabel) {
            props.addSnack({
              message: setAllResponse?.message || "Successfully applied values",
              options: {
                variant: setAllResponse?.type || "success",
              },
            });
          }
          props.handleModalClose();
        }
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const getDefaultValues = () => {
    let defaultValues = {};
    if (props.selectedRowIds.length === 1 && props.rowdata) {
      props.fields.forEach((item) => {
        defaultValues[item.accessor] = props.rowdata
          .filter((row) => props.selectedRowIds[0] === row[props.primaryKey])
          .map((e) => e[item.accessor])[0];
      });
    } else if (props.setAllInterdependentFields) {
      props.fields.forEach((item) => {
        defaultValues[item.accessor] = "";
      });
    } else if (props?.setDefaultDateFieldValues) {
      props.fields.forEach((item) => {
        if (item.type === "datetime") {
          defaultValues[item.accessor] = item.column_name.includes("start")
            ? moment()
            : moment(END_DATE);
        }
      });
    }
    return defaultValues;
  };
  const handleErrorClose = (_event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setErrorPopup(false);
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
      <Snackbar
        open={errorPopup}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        autoHideDuration={2000}
        onClose={handleErrorClose}
      >
        <Alert
          onClose={handleErrorClose}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {errorMsg}
        </Alert>
      </Snackbar>
      {confirmBox && (
        <ConfirmBox
          onClose={() => showConfirmBox(false)}
          onConfirm={() => {
            showConfirmBox(false);
            props.handleModalClose();
          }}
        />
      )}
      <Loader loader={loading}>
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
            layout={props.layout}
            handleChange={handleChange}
            fields={formFields}
            maxFieldsInRow={props.maxFieldsInRow ? props.maxFieldsInRow : 1}
            updateDefaultValue={true}
            defaultValues={getDefaultValues}
            onMaxLimitExceeded={() =>
              props.addSnack({
                message:
                  "User cannot select more than 8 DCs for a single store",
                options: { variant: "warning" },
              })
            }
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
      </Loader>
    </Dialog>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(SetAll);
