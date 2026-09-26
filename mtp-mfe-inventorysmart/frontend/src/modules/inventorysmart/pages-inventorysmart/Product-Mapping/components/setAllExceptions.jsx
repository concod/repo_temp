import { useState, useEffect } from "react";
import { cloneDeep } from "lodash";
import moment from "moment";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { END_DATE } from "config/constants";
import makeStyles from "@mui/styles/makeStyles";
import {Modal} from "impact-ui-v3";
import Form from "core/Utils/form/index";
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
    <Modal
      onClose={() => props.onCancel()}
      className="setAllModal"
      aria-labelledby="customized-dialog-title"
      open={true}
      size="medium"
      title="Set All"
      primaryButtonLabel="Apply and Save"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={() => onApplySave()}
      onSecondaryButtonClick={() => props.onCancel()}
    >
      <div
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
          withPortal={true}
        ></Form>
      </div>
    </Modal>
  );
};

export default SetAllExceptions;
