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
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import Form from "../../../Utils/form";
import Loader from "../../../Utils/Loader/loader";
import Typography from "@mui/material/Typography";
import {
  getFiltersValues,
  getCreateDimensionFilters,
} from "../../../actions/filterAction";
import {
  getAllAccessTypeData,
  getFilterAccessibleValues,
} from "core/Utils/filter-accessible-data";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "80rem",
      //   maxHeight:'50vh',
      borderRadius: "0.6rem",
    },
  },
  subHeader: {
    paddingTop: "0.8rem",
    paddingLeft: "1.28rem",
  },
  confirmBox: {
    "& .MuiDialog-paper": {
      borderRadius: "10px 10px 6px 6px",
    },
  },
}));

function CreateNewProduct(props) {
  const classes = useStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [setAllData, updateSetAllData] = useState({});
  const [formFields, setformFields] = useState([]);
  const [flagEdit, setFlagEdit] = useState(false);
  const setAllformData = [
    {
      label: "Status",
      field_type: "list",
      required: true,
      options: [
        { label: "Active", id: "active" },
        { label: "Clearence", id: "clearence" },
        { label: "Inactive", id: "inactive" },
      ],
      accessor: "status",
    },
    {
      label: "Type",
      required: true,
      field_type: "list",
      options: [
        { label: "Season", id: "season" },
        { label: "fashion", id: "fashion" },
      ],
      accessor: "type",
    },
    {
      required: true,
      label: "From Date",
      field_type: "DateTimeField",
      options: [
        { label: "option 1", id: 1 },
        { label: "option 2", id: 2 },
      ],
      accessor: "start_time",
      disablePast: true,
    },
    {
      label: "End Date",
      required: true,
      field_type: "DateTimeField",
      options: [
        { label: "option 1", id: 1 },
        { label: "option 2", id: 2 },
      ],
      accessor: "end_time",
      disablePast: true,
    },
  ];

  const getFiltersOptions = async (initialDependency) => {
    setLoading(true);
    const { data: filters } = await getCreateDimensionFilters("product");
    const filterElements = filters.data.map(async (key) => {
      key.accessor = key.column_name;
      if (["product_name", "product_code"].indexOf(key.accessor) === -1) {
        let body = {
          attribute_name: key.accessor,
          filter_type: key.filter_type,
          filters: initialDependency,
        };

        const options = await getFiltersValues("product", body)();
        key.options = options.data.data.attribute.map((item) => {
          return {
            value: item.attribute,
            label: item.attribute,
            id: item.attribute,
          };
        });
      }
      return key;
    });

    await Promise.all(filterElements);
    let formFilters = filters.data.map((item) => {
      return {
        label: item.label,
        field_type: item.field_type,
        filter_type: item.type,
        options: item.options,
        required: item.is_mandatory,
        accessor: item.column_name,
        is_clearable: item.is_clearable,
      };
    });
    let Additionalfields = [
      {
        label: dynamicLabelsBasedOnTenant("product_id", "core"),
        field_type: "TextField",
        required: true,
        accessor: "product_code",
      },
      {
        label: `${dynamicLabelsBasedOnTenant("product", "core")} Name`,
        field_type: "TextField",
        required: true,
        accessor: "product_name",
      },
    ];
    formFilters = [...formFilters, ...Additionalfields];
    setformFields(filterAccessibleValues(formFilters));
    setLoading(false);
  };

  const getFilterDependency = (selectedOptions) => {
    if (selectedOptions) {
      let dependency = [];
      formFields.forEach((key) => {
        if (
          ["product_name", "product_code"].indexOf(key.accessor) === -1 &&
          selectedOptions[key.accessor]
        ) {
          dependency.push({
            attribute_name: key.accessor,
            operator: "in",
            values: [selectedOptions[key.accessor]],
            filter_type: key.filter_type,
          });
        }
      });
      return dependency;
    } else {
      return [];
    }
  };

  useEffect(() => {
    getFiltersOptions([]);
  }, []);

  const handleChange = (updatedFormData, id) => {
    if (["product_name", "product_code"].indexOf(id) === -1) {
      let newdependency = getFilterDependency(updatedFormData);
      getFiltersOptions(newdependency);
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

  const onApply = async () => {
    try {
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
        props.toggleError(
          "Please Enter the data in all the required fields",
          "error"
        );
        requiredFieldsError = false;
      } else {
        let closeModal = await props.onApply(formData, setAllData);
        requiredFieldsError = false;
        if (closeModal) {
          props.addSnack({
            message: "Successfully applied values",
            options: {
              variant: "success",
            },
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const setAllhandleChange = (data) => {
    updateSetAllData(data);
  };

  const filterAccessibleValues = (planFilterConfig) => {
    let allCreateAccess = getAllAccessTypeData(props.accessData, "create");
    return getFilterAccessibleValues(planFilterConfig, allCreateAccess);
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
            Create New Product
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
            layout={"vertical"}
            maxFieldsInRow={3}
            handleChange={handleChange}
            fields={formFields}
            updateDefaultValue={true}
            defaultValues={{}}
          ></Form>

          <Typography className={classes.subHeader} spacing={3} variant="h6">
            Set All Values
          </Typography>
          <Form
            layout={"vertical"}
            maxFieldsInRow={4}
            updateDefaultValue={true}
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
            id="createProductCancelBtn"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onApply}
            id="createProductApplyBtn"
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

export default connect(null, mapActionsToProps)(CreateNewProduct);
