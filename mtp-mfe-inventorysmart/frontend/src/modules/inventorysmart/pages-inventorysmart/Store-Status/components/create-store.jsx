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
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import Form from "core/Utils/form";
import Loader from "core/Utils/Loader/loader";
import Typography from "@mui/material/Typography";
import {
  getFiltersValues,
  getCreateDimensionFilters,
} from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { useTranslation } from "impact-ui-v3";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "80rem",
      //   maxHeight:'50vh',
      borderRadius: "0.6rem",
    },
  },
  content: {
    padding: "0",
  },
  subHeader: {
    paddingTop: "0.8rem",
    paddingLeft: "1.28rem",
  },
  contentBody: {
    padding: "1rem 1.8rem 1.8rem 1.8rem",
  },
  confirmBox: {
    "& .MuiDialog-paper": {
      borderRadius: "10px 10px 6px 6px",
    },
  },
  dividerLineChanges: {
    height: "3px",
    backgroundColor: theme.palette.colours.checboxBorder,
    width: "100%",
  },
}));

function CreateNewStore(props) {
  const { t } = useTranslation();
  const classes = useStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [formFields, setformFields] = useState([]);
  const [flagEdit, setFlagEdit] = useState(false);
  const [setAllData, updateSetAllData] = useState({});

  const getFiltersOptions = async (initialDependency) => {
    setLoading(true);
    const { data: filters } = await getCreateDimensionFilters("store");

    const filterElements = filters.data.map(async (key) => {
      key.accessor = key.column_name;
      if (["store_name", "store_code"].indexOf(key.accessor) === -1) {
        let body = {
          attribute_name: key.accessor,
          filter_type: key.filter_type,
          filters: initialDependency,
        };

        const options = await getFiltersValues("store", body)();
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
    let formFilters = filters.data
      .filter((item) => item.column_name !== "status")
      .map((item) => {
        if (item.column_name === "special_classification") {
          return {
            label: item.label,
            field_type: "list",
            filter_type: item.type,
            options: item.options,
            required: false,
            accessor: item.column_name,
            is_clearable: item.is_clearable,
          };
        } else {
          return {
            label: item.label,
            field_type: item.field_type,
            filter_type: item.type,
            options: item.options,
            required: item.is_mandatory,
            accessor: item.column_name,
            is_clearable: item.is_clearable,
          };
        }
      });
    let Additionalfields = [
      {
        label: t("inventorysmart.storeId"),
        field_type: "TextField",
        required: true,
        accessor: "store_code",
      },
      {
        label: t("inventorysmart.storeName"),
        field_type: "TextField",
        required: true,
        accessor: "store_name",
      },
    ];
    formFilters = [...formFilters, ...Additionalfields];
    setformFields(formFilters);
    setLoading(false);
  };
  const getFilterDependency = (selectedOptions) => {
    if (selectedOptions) {
      let dependency = [];
      formFields.forEach((key) => {
        if (
          ["store_name", "store_code"].indexOf(key.accessor) === -1 &&
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
    if (["store_name", "store_code"].indexOf(id) === -1) {
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

  const setAllhandleChange = (data) => {
    updateSetAllData(data);
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
        props.addSnack({
          message: t("inventorysmart.pleaseEnterDataInAllRequiredFields"),
          options: {
            variant: "error",
          },
        });
      } else {
        let closeModal = await props.onApply(formData, setAllData);
        if (closeModal) {
          props.addSnack({
            message: t("inventorysmart.successfullyAppliedValues"),
            options: {
              variant: "success",
            },
          });
          props.handleModalClose();
        }
      }
    } catch (err) {}
  };

  const setAllformData = [
    {
      label: t("inventorysmart.status"),
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
      label: t("inventorysmart.fromDate"),
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
      label: t("inventorysmart.endDate"),
      field_type: "DateTimeField",
      options: [
        { label: "option 1", id: 1 },
        { label: "option 2", id: 2 },
      ],
      accessor: "end_time",
      disablePast: true,
    },
  ];

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
            {t("inventorysmart.createNewStore")}
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
            updateDefaultValue={true}
            maxFieldsInRow={3}
            handleChange={handleChange}
            fields={formFields}
            defaultValues={{}}
          ></Form>
          <div className={classes.dividerLineChanges}> </div>
          <Typography className={classes.subHeader} spacing={3} variant="h6">
            {t("inventorysmart.setAllValues")}
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
            id="createStoreCancelBtn"
            color="primary"
          >
            {t("inventorysmart.cancel")}
          </Button>
          <Button
            variant="contained"
            id="createStoreApplyBtn"
            onClick={onApply}
            color="primary"
          >
            {t("inventorysmart.apply")}
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
}

const mapActionsToProps = {
  addSnack,
};

export default connect(null, mapActionsToProps)(CreateNewStore);
