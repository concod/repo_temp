import { useState, useEffect, useCallback } from "react";
import { connect } from "react-redux";
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
import { addSnack } from "core/actions/snackbarActions";
import Form from "../../../Utils/form";
import Loader from "../../../Utils/Loader/loader";
import { getAllProductStores } from "../services-product-mapping/productMappingService";
import { debounce } from "lodash";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "500px",
      //   maxHeight:'50vh',
      borderRadius: "0.6rem",
    },
  },
  newException: {
    marginTop: "2rem",
  },
  content: {
    padding: "0",
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

function ExceptionList(props) {
  const classes = useStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [formFields, setformFields] = useState(props.fields);
  const [defaultFields, setDefaultFields] = useState(props.fields);
  const [flagEdit, setFlagEdit] = useState(false);
  const [counter, setCounter] = useState(2);
  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };
  const onInputChange = useCallback(
    debounce((searchKey, param, field, selectedOptions) => {
      let searchArray = [{ column: "store_name", pattern: searchKey }];
      if (param.action === "input-change") {
        fetchData(searchArray, selectedOptions);
      } else if (param.action === "menu-close" && !selectedOptions) {
        fetchData();
      }
    }, 500),
    []
  );

  useEffect(() => {
    fetchData();
  }, []);
  const onCancel = () => {
    if (flagEdit) {
      showConfirmBox(true);
    } else {
      props.handleModalClose();
    }
  };
  const fetchData = async (searchArray, selectedOptions, pageIndex) => {
    let body = {
      selected_products: props.selectedProducts.map(
        (item) => item.product_code
      ),
      filters: props.filterDependency,
      meta: {
        range: [],
        sort: [],
        search: searchArray ? searchArray : [],
        limit: { limit: 1000, page: 1 },
      },
    };

    const { data: details } = await getAllProductStores(body)();
    let options = details.data.map((item) => {
      return {
        label: item.store_code + "/" + item.store_name,
        id: item.store_code,
        value: item.store_code,
      };
    });
    let fields = [...formFields];
    if (searchArray) {
      let selectedOption = selectedOptions
        ? [
            ...selectedOptions.map((item) => {
              item.id = item.value;
              return item;
            }),
          ]
        : [];
      fields[1].options = [...selectedOption, ...options];
    } else {
      fields[1].options = pageIndex
        ? [...fields[1].options, ...options]
        : options;
      fields[1].isSearchable = true;
      fields[1].fetchOptions = (pageindex) => {
        fetchData(null, null, pageindex);
      };
      fields[1].pagination = true;
      fields[1].onInputChange = onInputChange;
    }
    setformFields(fields);
    setDefaultFields(fields);
    setLoading(false);
  };

  const onApply = async () => {
    try {
      let requiredFieldsError = false;
      [...formFields].forEach((item) => {
        if (item.required && !formData[item.accessor]) {
          requiredFieldsError = true;
        }
      });
      if (requiredFieldsError) {
        props.toggleError("Please Enter the data in all the required fields");
        requiredFieldsError = false;
      } else {
        let finalExceptions = {};

        formData[`select_product`].forEach((item) => {
          finalExceptions[item] = formData[`select_store`];
        });

        for (let i = 2; i < counter; i++) {
          formData[`select_product-${i}`].forEach((item) => {
            finalExceptions[item] = finalExceptions[item]
              ? [...finalExceptions[item], ...formData[`select_store-${i}`]]
              : formData[`select_store-${i}`];
          });
        }
        let closeModal = await props.onApply(finalExceptions);
        requiredFieldsError = false;
        if (closeModal) {
          props.addSnack({
            message: "Successfully applied values",
            options: {
              variant: "success",
            },
          });
          props.handleModalClose();
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const addExceptions = () => {
    if (counter < 5) {
      let newException = JSON.parse(JSON.stringify(defaultFields));
      newException = newException.map((item) => {
        item.accessor = `${item.accessor}-${counter}`;
        return item;
      });
      let fields = [...formFields, ...newException];
      setCounter((old) => old + 1);
      setformFields(fields);
    }
  };
  const getDefaultValues = () => {
    let defaultValues = {};
    props.fields.forEach((item) => {
      defaultValues[item.accessor] = "";
    });
    return defaultValues;
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
            Exception List
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
            maxFieldsInRow={1}
            handleChange={handleChange}
            fields={formFields}
            updateDefaultValue={true}
            defaultValues={getDefaultValues}
          ></Form>
          <Button
            className={classes.newException}
            variant="contained"
            onClick={() => {
              addExceptions();
            }}
            color="primary"
          >
            + Add Exception
          </Button>
        </DialogContent>
        <DialogActions>
          <Button
            id="exceptionSaveBtn"
            onClick={() => {
              onCancel();
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onApply}
            id="exceptionCancelBtn"
            color="primary"
          >
            Apply
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
}

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect({}, mapDispatchToProps)(ExceptionList);
