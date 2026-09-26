import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Panel, useTranslation } from "impact-ui-v3";
import { END_DATE } from "config/constants";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { addSnack } from "core/actions/snackbarActions";
import Form from "core/Utils/form";
import Loader from "core/Utils/Loader/loader";
import { TEXT_FIELDS_SETALL } from "config/constants";
import moment from "moment";
import { cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { isValidDate } from "core/Utils/functions/helpers/validation-helpers";

const SetAllPanelForm = (props) => {
  const { t } = useTranslation();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [formFields, setformFields] = useState([]);
  const [flagEdit, setFlagEdit] = useState(false);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

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
          eachField.type === "DateTimeField" ||
          eachField.type === "datetime"
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
      formField?.forEach((field) => {
        if (field.type === "list") {
          field.options?.forEach((option) => {
            option.label = replaceSpecialCharacter(option.label);
          });
        }
      });
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
        dateFieldError = false,
        invalidDateError = false;
      const today = moment();
      [...formFields].forEach((item) => {
        if (item.isDataValidate) {
          validateKey.push(item.column_name);
        }
        if (
          item.required &&
          (!formData[item.id] ||
            (Array.isArray(formData[item.id]) && formData[item.id].length === 0))
        ) {
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
        if (
          item.field_type === "DateTimeField" &&
          !isValidDate(new Date(formData[item.id]))
        ) {
          invalidDateError = true;
        }
      });
      if (requiredFieldsError) {
        displaySnackMessages(
          t("inventorysmart.pleaseEnterDataInRequiredFields"),
          "error"
        );
      } else if (dateFieldError) {
        displaySnackMessages(
          t("inventorysmart.pleaseEnterCorrectDate"),
          "error"
        );
      } else if (invalidDateError) {
        displaySnackMessages(t("inventorysmart.invalidDateEntered"), "error");
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
          const setAllResponse = await props.onApply(formData);
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

  const primaryButtonLabel = props.setAllButtonLabel
    ? props.setAllButtonLabel
    : t("inventorysmart.apply");

  return (
    <Panel
      anchor="right"
      open={true}
      onClose={onCancel}
      title={t("inventorysmart.setAllValues")}
      size="large"
      width={props.panelWidth || 600}
      primaryButtonLabel={primaryButtonLabel}
      secondaryButtonLabel={t("inventorysmart.cancel")}
      secondaryButtonProps={{ variant: "secondary" }}
      onPrimaryButtonClick={onApply}
      onSecondaryButtonClick={onCancel}
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
      <Loader loader={loading}>
        <Form
          layout={props.layout}
          handleChange={handleChange}
          fields={formFields}
          maxFieldsInRow={props.maxFieldsInRow ? props.maxFieldsInRow : 1}
          updateDefaultValue={true}
          defaultValues={getDefaultValues}
          minFieldsInRow={3}
          fieldTypeWidthSpan={12}
          labelWidthSpan={8}
          spacing={4}
          rowSpacing={4}
          withPortal
        ></Form>
      </Loader>
    </Panel>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(SetAllPanelForm);
