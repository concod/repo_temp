import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  fetchEventsType,
  fetchAppScreens,
  createEvents,
  updateEvents,
  fetchAppScreensActions,
  fetchDepartmentsAndChannels,
} from "../../../actions/eventConfigurationActions";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import Loader from "../../../Utils/Loader/loader";
import Form from "../../../Utils/form";
import { getFiltersValues } from "../../../actions/filterAction";
import { addSnack } from "../../../actions/snackbarActions";
import {
  PRIMARY_EVENT_FIELDS,
  SECONDARY_EVENT_FIELDS,
  HIERARCHY_LEVEL,
} from "./config";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "58rem",
      borderRadius: "0.6rem",
    },
  },
  content: {
    padding: 0,
  },
  confirmBox: {
    "& .MuiDialog-paper": {
      borderRadius: "10px 10px 6px 6px",
    },
  },
  footer: {
    background: theme.palette.background.primary,
  },
}));

function AddEvent(props) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [flagEdit, setFlagEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const tagifyRef = useRef();
  const [formData, setFormData] = useState(
    props.defaultData ? props.defaultData : {}
  );
  const [fields, setFields] = useState(SECONDARY_EVENT_FIELDS);
  const [primaryEventFields, setPrimaryEventFields] = useState(
    PRIMARY_EVENT_FIELDS
  );

  const setOptions = (dataArr) => {
    return dataArr?.map((item) => {
      return {
        label: item,
        id: item,
        value: item,
      };
    });
  };

  /**
   * @func
   * @desc Update the defaultFormData with the present options
   * @param {String} accessor 
   * @param {Array} options 
   * @param {Object} defaultFormData 
   */
  const getAllOptions = (accessor, options, defaultFormData) => {
    const values = [];
    const filterValues = options?.map((item) => {
      let val = typeof(item) !== "string" ? item.attribute : item;
      values.push(val);
      return {
        label: val,
        value: val,
      };
    });

    defaultFormData[accessor] = values; 
    defaultFormData[`${accessor}_options`] = filterValues;
  };

  const setFieldsOptions = async () => {
    let optionsData = await props.fetchEventsType();
    let fieldsData = [...fields];
    let primaryEventFieldsData = [...primaryEventFields];
    let defaultFormData = {};
    let body = {
      attribute_name: HIERARCHY_LEVEL,
      filter_type: "cascaded",
      filters: [],
    };
    const departmentOptions = await getFiltersValues("product", body)();

    fieldsData[0].options = setOptions(optionsData.event_types);
    

    primaryEventFieldsData.forEach((item) => {
      const accessor = item.accessor;
      if (accessor === "channels") {
        getAllOptions(accessor, optionsData[accessor], defaultFormData)
        item.options = setOptions(optionsData[accessor]);
      }
      if (accessor === "notification_channel") {
        getAllOptions(accessor, optionsData[accessor], defaultFormData)
        item.options = setOptions(optionsData[accessor]);
      }
      if (accessor === "departments") {
        getAllOptions(accessor, departmentOptions.data.data.attribute, defaultFormData)
        item.options = departmentOptions.data.data.attribute.map((opt) => {
          return {
            value: opt.attribute,
            id: opt.attribute,
            label: opt.attribute,
          };
        });
      }
      if (accessor === "role_codes") {
        item.options = optionsData.roles.map((opt) => {
          return {
            value: opt.id,
            id: opt.id,
            label: opt.name,
          };
        });
      }

      if (accessor === "products") {
        item.options = setOptions(optionsData.products);
      }
    });

    fieldsData[2].tagsInfo = optionsData.tags.map((item) => {
      return {
        id: item.tag_code,
        value: item.tag_value,
      };
    });

    setFields(fieldsData);
    if (props.defaultData.products) {
      getScreenOptions(props.defaultData.products);
      getScreenActionsOptions(props.defaultData.screen);
    } else {
      setPrimaryEventFields(primaryEventFieldsData);
      setFormData(defaultFormData);
    }
    setLoading(false);
  };

  useEffect(() => {
    setFieldsOptions();
  }, []);

  const getScreenOptions = async (appName) => {
    let screenData = await props.fetchAppScreens(`?application=${appName}`);
    let primaryEventFieldsData = [...primaryEventFields];
    primaryEventFieldsData.forEach((item) => {
      if (item.accessor === "screen") {
        screenData.forEach((opt) => {
          item.options = opt.screens.map((e) => {
            return {
              label: e,
              id: e,
              value: e,
            };
          });
        });
      }
      return item;
    });

    setPrimaryEventFields(primaryEventFieldsData);
  };

  const getScreenActionsOptions = async (screenName) => {
    let screenAction = await props.fetchAppScreensActions(
      `?application=${formData.products}&screen=${screenName}`
    );
    let primaryEventFieldsData = [...primaryEventFields];
    primaryEventFieldsData.forEach((item) => {
      if (item.accessor === "screen_id") {
        screenAction.forEach((opt) => {
          item.options = opt.map((option) => {
            return {
              label: option.action,
              id: option.not_code,
              value: option.not_code,
            };
          });
        });
      }
      return item;
    });
    setPrimaryEventFields(primaryEventFieldsData);
  };

  const getDepartmemtAndChannelOptions = async (data, id) => {
    let body = {
      type: id,
      ids: data[id],
    };

    let newOptions = await props.fetchDepartmentsAndChannels(body);
    let primaryEventFieldsData = [...primaryEventFields];
    primaryEventFieldsData.forEach((item) => {
      let fieldID = id === "departments" ? "channels" : id;
      if (item.accessor === fieldID) {
        item.options = newOptions
          ? newOptions.map((op) => {
              return {
                label: op,
                id: op,
                value: op,
              };
            })
          : [];
      }
      return item;
    });
    setPrimaryEventFields(primaryEventFieldsData);
  };

  const onCancel = () => {
    if (flagEdit) {
      showConfirmBox(true);
    } else {
      props.handleModalClose();
    }
  };

  const handleChange = (updatedFormData, id) => {
    if (["products"].indexOf(id) > -1) {
      getScreenOptions(updatedFormData.products);
      let formValues = { ...updatedFormData };
      formValues.screen = null;
      setFormData(formValues);
    } else if (["screen"].indexOf(id) > -1) {
      getScreenActionsOptions(updatedFormData.screen);
      let formValues = { ...updatedFormData };
      formValues.screen_id = null;
      setFormData(formValues);
    } else if (["departments", "channels"].indexOf(id) > -1) {
      if (updatedFormData.departments && updatedFormData.channels) {
        setFormData(updatedFormData);
      } else {
        getDepartmemtAndChannelOptions(updatedFormData, id);
        setFormData(updatedFormData);
      }
    } else {
      setFormData(updatedFormData);
    }
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onApply = async () => {
    try {
      let reqBody = { ...formData };
      let text = tagifyRef.current.state.lastOriginalValueReported;
      reqBody.description = text;
      let requiredFieldsError = false;
      [...fields, ...primaryEventFields].forEach((item) => {
        if (item.required && !reqBody[item.accessor]) {
          requiredFieldsError = true;
        }
      });

      if (requiredFieldsError) {
        props.addSnack({
          message: "Please Enter the data in all the required fields",
          options: {
            variant: "error",
          },
        });
      } else {
        let tags_values = reqBody.description
          .split("[[")
          .filter((v) => v.indexOf("]]") > -1)
          .map((value) => value.split("]]")[0].trim());
        let startIndex = 0;

        [...reqBody.description].forEach((item, index) => {
          if (item === "[" && reqBody.description[index + 1] === "[") {
            startIndex = index;
          }
          if (item === "]" && reqBody.description[index + 1] === "]") {
            let finalText = reqBody.description.substring(
              startIndex,
              index + 2
            );
            finalText = finalText.replace("[[", "");
            finalText = finalText.replace("]]", "");
            finalText = JSON.parse(finalText);
            let replaceText = `[[${finalText.value}]]`;
            text = text.replace(
              reqBody.description.substring(startIndex, index + 2),
              replaceText
            );
          }
        });
        reqBody.description = text;
        reqBody.tags_code = tags_values.map((item) => {
          let obj = JSON.parse(item);
          return obj.id;
        });
        delete reqBody.channels_options;
        delete reqBody.departments_options;
        delete reqBody.role_codes_options;
        delete reqBody.products;
        delete reqBody.notification_channel_options;
        if (props.defaultData && props.defaultData.noe_code) {
          await updateEvents(props.defaultData.noe_code, reqBody);
        } else {
          await createEvents(reqBody);
        }
        props.addSnack({
          message:
            props.defaultData && props.defaultData.noe_code
              ? "Event updated successfully"
              : "Event created successfully",
          options: {
            variant: "success",
          },
        });
        props.handleModalClose();
      }
    } catch (err) {
      props.addSnack({
        message:
          "Notifications for few of the selections are already in effect, Please modify selection to proceed further",
        options: {
          variant: "error",
        },
      });
    }
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.root}
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
      <Loader loader={loading}>
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Add Event
            <IconButton
              aria-label="close"
              onClick={() => onCancel()}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent
          classes={{
            root: classes.content,
          }}
        >
          <div className={globalClasses.paperWrapper}>
            <Form
              layout={"vertical"}
              updateDefaultValue={false}
              maxFieldsInRow={4}
              handleChange={handleChange}
              fields={primaryEventFields}
              defaultValues={formData}
            ></Form>
          </div>

          <div
            style={{
              height: "1px",
              backgroundColor: "lightgrey",
              width: "100%",
            }}
          >
            {" "}
          </div>
          <div className={globalClasses.paperWrapper}>
            <Form
              updateDefaultValue={false}
              maxFieldsInRow={1}
              tagifyRef={tagifyRef}
              handleChange={handleChange}
              fields={fields}
              defaultValues={formData}
            ></Form>
          </div>
        </DialogContent>
        <DialogActions
          classes={{
            root: `${classes.footer} ${globalClasses.mainBody}`,
          }}
        >
          <Button
            onClick={() => {
              onCancel();
            }}
            id="createStoreCancelBtn"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            id="createStoreApplyBtn"
            onClick={onApply}
            color="primary"
          >
            Add Event
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
}
const mapActionsToProps = {
  addSnack,
  fetchEventsType,
  fetchAppScreens,
  fetchAppScreensActions,
  fetchDepartmentsAndChannels,
};
export default connect(null, mapActionsToProps)(AddEvent);
