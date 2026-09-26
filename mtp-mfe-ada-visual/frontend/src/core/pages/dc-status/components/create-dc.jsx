import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { connect } from "react-redux";
import { addSnack } from "../../../actions/snackbarActions";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import Form from "../../../Utils/form";
import Loader from "../../../Utils/Loader/loader";
import Typography from "@mui/material/Typography";
import { getFiltersValues } from "../../../actions/filterAction";
import {
  DC_DROPDOWN_STORE,
  STORE_NAME,
  STORE_CODE,
  MASTER_STORE_CODE,
  FLAG,
  EXISTING,
} from "../../../../config/constants";
import { generateFormFields, processFilterfields } from "../common-functions";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "80rem",
      borderRadius: "0.6rem",
    },
  },
  subHeader: {
    paddingTop: "0.8rem",
    paddingLeft: "1.28rem",
  },
}));

function CreateNewDc(props) {
  const classes = useStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [formFields, setformFields] = useState(props.fields);
  const emptyformFields = [...props.fields];
  const [existingFlag, setexistingFlag] = useState("new");
  const [flagEdit, setFlagEdit] = useState(false);
  const [setAllData, updateSetAllData] = useState({});
  const ignore_columns = [
    "store_name",
    "store_code",
    "name",
    "dc_code",
    "fc_code",
  ];

  /**
   * @func
   * @desc Update the filter fields and options with respect to the flag
   * @param {Array} initialDependency
   * @param {String} exflag
   */
  const getFiltersOptions = async (initialDependency, exflag) => {
    setLoading(true);
    let filters = {};
    const newFormFields = filterAllFormFields(
      emptyformFields.filter((fields) => fields.accessor !== "region")
    );
    let filterExist = await processFilterfields(exflag, newFormFields);
    filters = await generateFormFields(filterExist, initialDependency);

    let filterFormFields = filters
      .filter((item) => item.column_name !== "status")
      .map((item) => {
        if (
          item.field_type !== "TextField" &&
          item.column_name === "special_classification"
        ) {
          return {
            label: item.label,
            field_type: "dropdown",
            filter_type: item.type,
            options: item.options,
            required: false,
            accessor: item.column_name,
            isClearable: true,
          };
        } else {
          return item;
        }
      });
    let dcFilterFormIndex = filterFormFields.findIndex(
      (item) => item.accessor === "dc_name"
    );
    let fcFilterFormIndex = filterFormFields.findIndex(
      (item) => item.accessor === "fc_name"
    );

    if (dcFilterFormIndex !== -1) {
      filterFormFields.splice(dcFilterFormIndex, 1);
    } else if (fcFilterFormIndex !== -1) {
      filterFormFields.splice(fcFilterFormIndex, 1);
    }
    setformFields(filterFormFields);
    setLoading(false);
  };

  const getFilterDependency = (selectedOptions, index) => {
    if (selectedOptions) {
      let dependency = [];
      formFields.forEach((key, idx) => {
        if (
          ignore_columns.indexOf(key.accessor) === -1 &&
          selectedOptions[key.accessor] &&
          key.field_type !== "TextField" &&
          idx <= index
        ) {
          dependency.push({
            attribute_name: key.accessor,
            operator: "in",
            values: [selectedOptions[key.accessor]],
            filter_type: "cascaded",
          });
        }
      });
      return dependency;
    } else {
      return [];
    }
  };

  useEffect(() => {
    getFiltersOptions([], existingFlag);
  }, []);

  /**
   * @func
   * @desc Handle chnages by the Form and update dependencies
   * @param {Object} updatedFormData
   * @param {String} id
   */
  const handleChange = async (updatedFormData, id) => {
    if (ignore_columns.indexOf(id) === -1) {
      const selectionIndex = formFields.findIndex((item) => {
        return item.accessor === id;
      });
      const newdependency = getFilterDependency(
        updatedFormData,
        selectionIndex
      );
      const currentField = formFields.filter(
        (field) => field.column_name === id
      );
      if (currentField?.filter_type === "cascaded") {
        const updatedFilterList = await generateFormFields(
          formFields,
          newdependency
        );
        setformFields(updatedFilterList);
      }
    }
    setFormData(updatedFormData);
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

  const setAllhandleChange = (data) => {
    updateSetAllData(data);
  };

  const onCreateNewDC = async () => {
    try {
      setLoading(true);
      let requiredFieldsError = false;

      [...formFields].forEach((item) => {
        if (item.required && !formData[item.accessor]) {
          requiredFieldsError = true;
        }
      });

      [...setAllformData].forEach((item) => {
        if (item.required && !setAllData[item.accessor]) {
          requiredFieldsError = true;
        }
      });
      if (requiredFieldsError) {
        displaySnackMessages(
          "Please Enter the data in all the required fieldss",
          "error"
        );
        setLoading(false);
      } else {
        let temp = formData;
        temp[FLAG] = existingFlag;
        if (existingFlag === EXISTING) {
          temp[STORE_CODE] = temp[MASTER_STORE_CODE];
        }
        setFormData(temp);
        let closeModal = await props.onCreateNewDC(formData, setAllData);
        setLoading(false);
        if (closeModal) {
          displaySnackMessages("Successfully applied values", "success");
          props.handleModalClose();
        }
      }
    } catch (err) {
      setLoading(false);
      displaySnackMessages(err, "error");
    }
  };

  const getDefaultValues = (fields, selections) => {
    let defaultValues = {};
    fields.forEach((item) => {
      if (selections[item.accessor]) {
        defaultValues[item.accessor] = selections[item.accessor];
      } else {
        defaultValues[item.accessor] = "";
      }
    });
    return defaultValues;
  };

  /**
   * @func
   * @desc Filter the forn fields according to selected title (DC/FC)
   * @param {Array of Objects} fields
   * @returns fields
   */
  const filterAllFormFields = (fields) => {
    return fields.filter((fieldName) => {
      let isNewDC =
        fieldName.column_name === "dc_name" && fieldName.field_type === "list";
      switch (props.title) {
        case "Create New FC":
          return fieldName.column_name !== "dc_name";
        case "Create New DC":
          return isNewDC;
        default:
          return fieldName;
      }
    });
  };

  /**
   * @func
   * @desc Handle the Form fields and update when radio buttons are switched.
   * @param {Object} event
   */
  const handleChangeMethod = async (event) => {
    setexistingFlag(event.target.value);
    setFormData({});
    updateSetAllData({});
    if (event.target.value === EXISTING) {
      setLoading(true);
      const result = DC_DROPDOWN_STORE.map(async (item) => {
        let tbody = {
          attribute_name: item,
          filter_type: "cascaded",
          filters: [],
        };
        const options = await getFiltersValues("store", tbody)();
        return options.data.data.attribute.map((optionItem) => {
          return {
            value: optionItem.attribute,
            label: optionItem.attribute,
            id: optionItem.attribute,
          };
        });
      });

      const attoptions = await Promise.all(result);
      let store_name = {
        label: "Store name",
        required: true,
        field_type: "dropdown",
        options: attoptions[1],
        filter_type: "cascaded",
        accessor: "store_name",
      };
      let store_code = {
        label: "Store code",
        required: true,
        field_type: "dropdown",
        options: attoptions[0],
        filter_type: "cascaded",
        accessor: "master_store_code",
      };
      let fields = [...emptyformFields];

      fields = filterAllFormFields(fields);
      fields = fields.map((item) => {
        if (item["accessor"] === STORE_NAME) {
          return { ...store_name, isClearable: true };
        }
        if (item["accessor"] === STORE_CODE) {
          return { ...store_code, isClearable: true };
        }
        return {
          ...item,
          isClearable: true,
          field_type: item.field_type === "list" ? "dropdown" : item.field_type,
        };
      });
      setformFields(fields);
      setLoading(false);
    } else {
      getFiltersOptions([], event.target.value);
    }
  };

  const setAllformData = [
    {
      label: "Status",
      required: true,
      field_type: "list",
      options: [
        { label: "Open", id: "open" },
        { label: "Deactivated", id: "deactivated" },
        { label: "Close", id: "close" },
        { label: "Renovation", id: "renovation" },
      ],
      accessor: "status",
    },
    {
      label: "From Date",
      required: true,
      field_type: "DateTimeField",
      options: [
        { label: "option 1", id: 1 },
        { label: "option 2", id: 2 },
      ],
      accessor: "start_time",
      disablePast: true,
    },
    {
      required: true,
      label: "To Date",
      field_type: "DateTimeField",
      options: [
        { label: "option 1", id: 1 },
        { label: "option 2", id: 2 },
      ],
      accessor: "end_time",
      disablePast: true,
    },
  ];

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
            {props.title}
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
          <RadioGroup
            row
            aria-label="gender"
            name="controlled-radio-buttons-group"
            value={existingFlag}
            onChange={handleChangeMethod}
          >
            <FormControlLabel
              value="new"
              control={<Radio color="primary" />}
              label="With New Store"
            />
            <FormControlLabel
              value={EXISTING}
              control={<Radio color="primary" />}
              label="With existing store"
            />
          </RadioGroup>
          <Form
            layout={"vertical"}
            updateDefaultValue={false}
            maxFieldsInRow={3}
            handleChange={handleChange}
            fields={formFields}
            defaultValues={getDefaultValues(formFields, formData)}
          ></Form>
          <Typography className={classes.subHeader} spacing={3} variant="h6">
            Set All Values
          </Typography>
          <Form
            layout={"vertical"}
            updateDefaultValue={true}
            maxFieldsInRow={3}
            handleChange={setAllhandleChange}
            fields={setAllformData}
            defaultValues={{}}
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
          <Button
            variant="contained"
            id="createStoreApplyBtn"
            onClick={onCreateNewDC}
            color="primary"
          >
            Apply
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
}
const mapActionsToProps = {
  addSnack,
};

export default connect(null, mapActionsToProps)(CreateNewDc);
