import React, { useState, useEffect } from "react";
import { cloneDeep } from "lodash";
import moment from "moment";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { END_DATE } from "config/constants";
import { Button } from "impact-ui";
import makeStyles from "@mui/styles/makeStyles";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
} from "@mui/material";
import Form from "core/Utils/form/index";
import CloseIcon from "@mui/icons-material/Close";
import { TIME_PERIOD_FORM_FIELDS } from "./formConstants";
import { formatMomentDate } from "core/Utils/functions/utils";
import { dateValidationMessage } from "core/Utils/functions/helpers/validation-helpers";

const useStyles = makeStyles({
  dailogContainer: {
    paddingBottom: "0.5rem",
  },
});

const SetAllExceptions = (props) => {
  const [formFields, setFormFields] = useState();
  const [formData, setFormData] = useState();
  const [formDependency, setFormDependency] = useState();
  const classes = useStyles();
  const dispatch = useDispatch();

  useEffect(() => {
    updateFormObject();
  }, []);

  const updateFormObject = () => {
    const newFormFields = cloneDeep(TIME_PERIOD_FORM_FIELDS);
    const newFormData = {};
    newFormFields.forEach((item) => {
      newFormData[item.column_name] = item.column_name.includes("start")
        ? moment()
        : moment(END_DATE);
    });
    setFormData(newFormData);
    setFormFields(newFormFields);
    setFormDependency(newFormData);
  };

  const handleChange = (change, id) => {
    setFormDependency(change);
  };

  const momentDate = (input) => {
    if (moment.isMoment(input)) {
      return input;
    } else {
      return moment(input, "YYYY-MM-DD", true);
    }
  };

  const onApplySave = () => {
    const startDate = formDependency["start_date"];
    const endDate = formDependency["end_date"];
    const validationMessage = dateValidationMessage(
      momentDate(startDate),
      momentDate(endDate)
    );
    if (validationMessage.length === 0) {
      const dates = [
        moment(startDate, "YYYY-MM-DD"),
        moment(endDate, "YYYY-MM-DD"),
      ];
      props.onApplySetAll(
        dates.map((dateObj) => formatMomentDate(dateObj, "YYYY-MM-DD"))
      );
    } else {
      dispatch(
        addSnack({
          message: validationMessage,
          options: {
            variant: "error",
          },
        })
      );
    }
  };

  return (
    <Dialog
      onClose={() => props.onCancel()}
      className="setAllModal"
      maxWidth={"md"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="edit-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          Set All
          <IconButton
            aria-label="close"
            onClick={() => props.onCancel()}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent
        classes={{
          root: classes.dailogContainer,
        }}
      >
        <Form
          handleChange={handleChange}
          fields={formFields}
          updateDefaultValue={true}
          defaultValues={formData}
          layout={"vertical"}
          maxFieldsInRow={2}
        ></Form>
      </DialogContent>
      <DialogActions>
        <Button
          variant="secondary"
          id="cancelEdit"
          onClick={() => {
            props.onCancel();
          }}
        >
          Cancel
        </Button>
        <Button variant="primary" id="applyEdit" onClick={() => onApplySave()}>
          Apply and Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetAllExceptions;
