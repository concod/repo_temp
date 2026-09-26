import React, { useState, useEffect } from "react";
import { Button, Modal, Panel, useTranslation } from "impact-ui-v3";
import {
  Grid,
  Divider,
} from "@mui/material";
import { END_DATE } from "config/constants";
import makeStyles from "@mui/styles/makeStyles";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import Form from "core/Utils/form/index";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import moment from "moment";
import { cloneDeep, isUndefined, isEmpty } from "lodash";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import {
  deleteFieldRow,
  updateFormData,
  getDeleteRowField,
} from "core/Utils/form/form-helpers";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
const useStyles = makeStyles((theme) => ({
  addActionLabel: {
    verticalAlign: "super",
    display: "inline-block",
    margin: "1%",
  },
  addIcon: {
    "&:hover": {
      cursor: "pointer",
    },
  },
  lineMargin: {
    marginTop: 30,
    marginBottom: 40,
  },
}));

const SetAllMultiRow = (props) => {
  const { t } = useTranslation();
  let { isMultipleStatus = true } = props;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [fieldList, setFieldList] = useState(props.fieldList);
  const [customFieldList, setCustomFieldList] = useState([]);
  const [maxFieldsInRow, setMaxFieldsInRow] = useState(3);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    setFormRowId();
    setLoading(false);
    props.maxFieldsInRow && setMaxFieldsInRow(props.maxFieldsInRow);
  }, []);
  
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setDefaultValues();
  }, [fieldList]);

  useEffect(() => {
    if (props.customFieldList) {
      getCustomFields(props.customFieldList);
    }
  }, [props.customFieldList]);

  /**
   * @function
   * @description Set default form data if formdata dates dependency not set already
   */
  const setDefaultValues = () => {
    const newFormObj = cloneDeep(formData);
    fieldList.forEach((ele) => {
      ele.fields.forEach((item) => {
        if (
          props.setDefaultDateFieldValues &&
          item.type === "DateTimeField" &&
          !newFormObj.hasOwnProperty(item.accessor)
        ) {
          newFormObj[item.accessor] = item.column_name.includes("start")
            ? moment()
            : moment(END_DATE);
        }
      });
    });
    setFormData(newFormObj);
  };

  const originalFieldList = React.useMemo(() => {
    let fieldsListObj = {};
    props.fieldList.forEach((fieldData) => {
      fieldsListObj[fieldData.id] = fieldData;
    });

    return fieldsListObj;
  }, [props.fieldList]);

  // sets the row id on fields of newly added row
  const setFormRowId = (id = "", addNewRow = false) => {
    const copyFieldList = cloneDeep(fieldList);
    const copyOriginalFieldList = cloneDeep(originalFieldList);
    const rowFields = copyFieldList.map((fieldData) => {
      if (fieldData.id === id || id === "") {
        let newFieldRow = [];
        if (addNewRow) {
          // adding new row in fields list
          fieldData.rowCount = fieldData.rowCount + 1;
          newFieldRow = copyOriginalFieldList[id].fields.map((field) => {
            // appending row id in accessor key for new fields
            return modifyFieldRow(field, fieldData.rowCount);
          });
          // adding delete row icon
          isMultipleStatus &&
            newFieldRow.push(
              getDeleteRowField(fieldData.id, fieldData.rowCount, false)
            );
        } else {
          // only called during initial setup
          // updates fields with default row id
          fieldData.fields.map((field) => {
            return modifyFieldRow(field, fieldData.rowCount);
          });
          // since its first row delete icon will be disabled
          isMultipleStatus &&
            newFieldRow.push(
              getDeleteRowField(
                fieldData.id,
                fieldData.rowCount,
                !isUndefined(props.isSectionOptional)
                  ? !props.isSectionOptional
                  : true
              )
            );
        }
        fieldData.fields = [...fieldData.fields, ...newFieldRow];
      }
      return fieldData;
    });
    setFieldList(rowFields);
  };

  const modifyFieldRow = (field, rowCount) => {
    field.accessor = field.accessor + "_" + rowCount;
    field.field_type = field.type;
    if (field.type === "DateTimeField") {
      field.maxDate = field.maxDate || END_DATE;
    }
    return field;
  };

  const handleChange = (data, id) => {
    try {
      let fieldId;
      let rowId;
      if (id.split("_").length !== 3) {
        // This blocks handles the case where id contains extra underscores along with the underscores joining "delete" identifier and index with the id
        fieldId = id.slice(id.indexOf("_") + 1, id.lastIndexOf("_"));
        rowId = id.split("_")[id.split("_")?.length - 1];
      } else {
        fieldId = id.split("_")[1];
        rowId = id.split("_")[2];
      }

      const isStartDate = id.includes("start_"); //this condition checks if the id is start time/date related
      // condition true if delete icon is clicked
      if (id.includes("delete")) {
        const updatedFieldList = deleteFieldRow(fieldList, fieldId, rowId);
        const updatedFormData = updateFormData(formData, fieldId, rowId);
        setFieldList(updatedFieldList);
        setFormData(updatedFormData);
      } else {
        setFormData({ ...formData, [id]: data[id] });
        if (!flagEdit) {
          setFlagEdit(true);
        }
      }
    } catch (err) {
      displaySnackMessages(t("snackbarMessages.somethingWentWrong"), "error");
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
      let requiredFieldsError = false;
      let dateFieldError = false;
      let maxRowCount = 0;
      const today = moment();
      fieldList.forEach((fieldData) => {
        maxRowCount =
          maxRowCount < fieldData.rowCount ? fieldData.rowCount : maxRowCount;
        fieldData.fields.forEach((item) => {
          if (item.required && !formData[item.accessor]) {
            requiredFieldsError = true;
          }
          if (
            item.field_type === "DateTimeField" &&
            ((item.disablePast &&
              moment(formData[item.accessor]).isBefore(today, "day")) ||
              (item.disableFuture &&
                moment(formData[item.accessor]).isAfter(today, "day")))
          ) {
            dateFieldError = true;
          }
        });
      });
      if (requiredFieldsError || isEmpty(formData)) {
        displaySnackMessages(
          t("snackbarMessages.pleaseEnterDataInRequiredFields"),
          "error"
        );
      } else if (dateFieldError) {
        displaySnackMessages(t("snackbarMessages.pleaseEnterCorrectDate"), "error");
      } else {
        // if all required fields are filled process the form data
        Object.keys(formData).forEach((key) => {
          if (
            typeof formData[key] === "object" &&
            !Array.isArray(formData[key])
          ) {
            formData[key] = moment(formData[key]).format("YYYY-MM-DD");
          }
        });
        // call the custom formatter function
        if (props.formatMultiRowData) {
          const formattedData = props.formatMultiRowData(formData, maxRowCount);
          await props.onApply(formattedData);
        } else {
          await props.onApply(formData, maxRowCount);
        }
        // displaySnackMessages("Successfully applied", "success");
        props.handleModalClose();
      }
      setLoading(false);
    } catch (err) {
      //removing the error message as well, as we are displaying messages at respective places
      //if they are failed
      // displaySnackMessages("Something went wrong", "error");
      setLoading(false);
    }
  };

  const getCustomFields = (customFieldList) => {
    if (customFieldList?.[0]?.rowCount === 0) {
      const updatedCustomFields = customFieldList.map((item) =>
        item.fields.map((field) => {
          return modifyFieldRow(field, item.rowCount);
        })
      );
      setCustomFieldList(updatedCustomFields.flat());
      customFieldList[0].rowCount++;
    } else {
      setCustomFieldList(customFieldList?.[0]?.fields || []);
    }
  };

  const isPanel = props.containerType === "panel";
  const isCompactLayout = isPanel || windowWidth < 1200;
  const effectiveLayout = isCompactLayout
    ? "vertical"
    : props?.layout;
  const effectiveMaxFieldsInRow = isCompactLayout
    ? Math.min(2, maxFieldsInRow)
    : maxFieldsInRow;

  const shellProps = {
    open: true,
    onClose: onCancel,
    title: "Set All Values",
    primaryButtonLabel: props.setAllButtonLabel || "Apply and Save",
    secondaryButtonLabel: "Cancel",
    secondaryButtonProps: { variant: "secondary" },
    onPrimaryButtonClick: onApply,
    onSecondaryButtonClick: onCancel,
  };

  const renderSetAllContent = () => (
    <>
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
        {customFieldList?.length > 0 && (
          <>
            <div
              className={`${globalClasses.dialogTitle} ${globalClasses.marginBottom}`}
            >
              {"Custom Fields:"}
            </div>
            <Form
              handleChange={handleChange}
              fields={customFieldList}
              updateDefaultValue={
                props.updateDefaultValue === false ? false : true
              }
              defaultValues={
                props.updateDefaultValue === false ? formData : {}
              }
              layout={"vertical"}
              // +1 by defualt for delete icon
              maxFieldsInRow={
                effectiveMaxFieldsInRow + (isMultipleStatus ? 1 : 0)
              }
              addOptionSet={true}
              spacing={4}
              rowSpacing={4}
              // props to pass the function which will enable toggle, onClick of toggle
            ></Form>
            <Divider className={classes.lineMargin} />
          </>
        )}
        {fieldList.map((ele, index) => (
          <div key={ele.id + index}>
            <Form
              handleChange={handleChange}
              fields={ele.fields}
              updateDefaultValue={
                props.updateDefaultValue === false ? false : true
              }
              defaultValues={
                props.updateDefaultValue === false ? formData : {}
              }
              layout={effectiveLayout ? effectiveLayout : "clusterGraph"}
              // +1 by defualt for delete icon
              maxFieldsInRow={
                effectiveMaxFieldsInRow + (isMultipleStatus ? 1 : 0)
              }
              addOptionSet={true}
              fieldTypeWidthSpan={12}
              alignFields={props?.alignFields}
              spacing={4}
              rowSpacing={4}
            ></Form>
            <Grid
              className={`${globalClasses.marginVertical} ${globalClasses.marginTop}`}
            >
              {!ele.hideRowLabel && (
                <>
                  <Button
                    onClick={() => setFormRowId(ele.id, true)}
                    variant="tertiary"
                    size="large"
                    iconPlacement="left"
                    icon={<AddCircleIcon />}
                  >
                    {ele.addRowLabel}
                  </Button>
                </>
              )}
            </Grid>
            {index < fieldList.length - 1 && (
              <Divider className={classes.lineMargin} />
            )}
          </div>
        ))}
        {props.additionalContainer ? (
          <div>
            <Divider className={classes.lineMargin} />
            {props.additionalContainer}
          </div>
        ) : null}
      </Loader>
    </>
  );

  if (isPanel) {
    return (
      <Panel
        anchor="right"
        size="large"
        width={props.panelWidth || 600}
        {...shellProps}
      >
        {renderSetAllContent()}
      </Panel>
    );
  }

  return (
    <Modal
      className="setAllModal"
      size={props?.size ? props?.size : "medium"}
      aria-labelledby="customized-dialog-title"
      fullWidth={true}
      {...shellProps}
    >
      {renderSetAllContent()}
    </Modal>
  );
};

const mapActionsToProps = {
  addSnack,
};
export default connect(null, mapActionsToProps)(SetAllMultiRow);
