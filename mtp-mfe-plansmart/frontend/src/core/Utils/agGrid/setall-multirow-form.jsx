import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Divider,
} from "@mui/material";
import { END_DATE } from "config/constants";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
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
  let { isMultipleStatus = true } = props;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [fieldList, setFieldList] = useState(props.fieldList);
  const [maxFieldsInRow, setMaxFieldsInRow] = useState(3);

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
    setDefaultValues();
  }, [fieldList]);

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
      const fieldId = id.split("_")[1];
      const rowId = id.split("_")[2];

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
      displaySnackMessages("Something went wrong", "error");
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
          "Please Enter the data in all the required fields",
          "error"
        );
      } else if (dateFieldError) {
        displaySnackMessages("Please enter correct date.", "error");
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
  return (
    <Dialog
      onClose={() => onCancel()}
      className="setAllModal"
      maxWidth={"md"}
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
                layout={"vertical"}
                // +1 by defualt for delete icon
                maxFieldsInRow={maxFieldsInRow + (isMultipleStatus ? 1 : 0)}
                addOptionSet={true}
              ></Form>
              <Grid className={globalClasses.marginVertical}>
                {!ele.hideRowLabel && (
                  <>
                    <AddCircleIcon
                      fontSize="small"
                      color="primary"
                      className={classes.addIcon}
                      onClick={() => setFormRowId(ele.id, true)}
                    />
                    <span className={classes.addActionLabel}>
                      {ele.addRowLabel}
                    </span>
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
            Apply and Save
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
};

const mapActionsToProps = {
  addSnack,
};
export default connect(null, mapActionsToProps)(SetAllMultiRow);
