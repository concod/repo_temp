import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
} from "@mui/material";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "../../../Utils/Loader/loader";
import { getProductStatusData } from "../../../actions/productStoreStatusActions";
import AddExceptionsTable from "./exceptionsTable";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { getAllProductStores } from "core/pages/product-mapping/services-product-mapping/productMappingService";
import { cloneDeep } from "lodash";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";
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
  const [flagEdit, setFlagEdit] = useState(false);
  const exceptionsTableRef = useRef(null);
  const [exceptionsTableData, setExceptionsTableData] = useState([]);
  const [addExceptionsTableColumns, setAddExceptionsTableColumns] = useState(
    []
  );

  const getStoreName = (storeInfo) => {
    //If exceptions is happening at a storegroup level,
    //From the previous dashboard, we only get the ids present in the store group
    //To get the labels, we need to make use of ref-stores api result
    //The above result data is being passed as allStoresInfo to the component
    if (
      typeof storeInfo === "object" &&
      storeInfo !== null &&
      storeInfo.label
    ) {
      return storeInfo.store_name;
    } else {
      const currentStore = props.allStoresInfo.filter(
        (store) => store.value === storeInfo.store_code
      );
      if (currentStore.length > 0) {
        return currentStore[0].label;
      }
    }
  };

  /**
   *
   * @param {str} screenName
   * @returns list of options
   */
  const fetchProductsData = async (screenName, isNameHidden = false) => {
    if (screenName === "store_mapping") {
      //If the screen is store mapping, we use the getProductStatusData function to fetch
      //the products data
      let body = {
        filters: filterDataWithRespectToDimension(
          props.filterDependency,
          "product"
        ),
        meta: {
          range: [],
          sort: [],
          search: [],
          limit: { limit: 20000, page: 1 },
        },
        headers: [],
      };

      const { data: details } = await getProductStatusData(
        "product",
        body,
        props.isAggregated ? "?level=aggregation" : "",
        true //calling product status fetch API only
      )();
      return details.data.map((item) => {
        const itemCode = item.sku || item.product_code || item.aggregation_code;
        return {
          label: `${itemCode}${
            !isNameHidden
              ? item.product_name
                ? `/${item.product_name}`
                : ""
              : ""
          }`,
          id: itemCode,
          value: item.product_code,
        };
      });
    } else {
      //If the screen is product mapping, we use the selections from the modify screen to
      //get the products data.
      return props.selectedProductsOrGrps.map((item) => {
        return {
          value: item.product_code,
          id: item.product_code,
          label: item.sku || item.product_code,
        };
      });
    }
  };

  /**
   * filterDataWithRespectToDimension is the function which
   * takes data and returns only the data which matches the
   * dimension passed to this function
   * @param {Array} data
   * @param {string} dimension
   * @returns
   */
  const filterDataWithRespectToDimension = (data, dimension) => {
    try {
      let filteredData = data?.filter((item) => item.dimension === dimension);
      return filteredData;
    } catch (error) {
      console.error("filterDataWithRespectToDimension error", error);
    }
  };

  /**
   *
   * @param {str} screenName
   * @returns list of options based on screenName
   */
  const fetchStoresData = async (screenName, isNameHidden = false) => {
    if (screenName === "store_mapping") {
      //If the screen is store mapping, we use the selections from the modify screen to
      //get the stores data.
      return props.selectedStoreOrGrps.map((item) => {
        return {
          value: item.store_code,
          id: item.store_code,
          label: item[dynamicLabelKeysBasedOnTenant("store_code", "core")],
        };
      });
    } else {
      //If the screen is product mapping, we then use getAllProductStores action function
      //to fetch the stores data
      let body = {
        selected_products: props.selectedProductsOrGrps.map(
          (item) => item.product_code
        ),
        filters: props.filterDependency,
        meta: {
          range: [],
          sort: [],
          search: [],
          limit: { limit: 20000, page: 1 },
        },
      };

      const { data: details } = await getAllProductStores(body)();
      return details.data.map((item) => {
        return {
          label: `${item[dynamicLabelKeysBasedOnTenant("store_code", "core")]}${
            !isNameHidden ? "/" + item.store_name : ""
          }`,
          id: item.store_code,
          value: item.store_code,
        };
      });
    }
  };
  //columns will be fetched from API
  useEffect(() => {
    const fetchColumns = async () => {
      setLoading(true);
      //on mount, get the columns of modify table
      let agGridcols = await getColumnsAg(
        `table_name=Product_Mapping_Exceptions_Table`
      )();

      //After fetching the table config, product_code, store_code columns are list based
      //To fetch the options for those columns, we use the below functions to fetch the data
      //Based on the screen Name and column Name, we call the respective functions
      //For products - fetchProductsData
      //For stores - fetchStoresData
      const unresolvedPromises = agGridcols.map(async (eachCol) => {
        if (
          eachCol.column_name === "product_code" &&
          props.screenName === "store_mapping"
        ) {
          //To fetch products data in store mapping add exceptions
          eachCol.options = await fetchProductsData(
            props.screenName,
            eachCol?.extra?.hideName
          );
        }
        if (
          eachCol.column_name === "store_code" &&
          props.screenName === "store_mapping"
        ) {
          //To fetch stores data in store mapping add exceptions
          eachCol.options = await fetchStoresData(
            props.screenName,
            eachCol?.extra?.hideName
          );
        }
        if (
          eachCol.column_name === "product_code" &&
          props.screenName === "product_mapping"
        ) {
          //To fetch products data in product mapping add exceptions
          eachCol.options = await fetchProductsData(
            props.screenName,
            eachCol?.extra?.hideName
          );
        }
        if (
          eachCol.column_name === "store_code" &&
          props.screenName === "product_mapping"
        ) {
          //To fetch stores data in product mapping add exceptions
          eachCol.options = await fetchStoresData(
            props.screenName,
            eachCol?.extra?.hideName
          );
        }
        //This condition will make the dropdowns as multi select
        eachCol.isMulti = true;
        eachCol.isSearchable = true;
        return eachCol;
      });
      agGridcols = await Promise.all(unresolvedPromises);
      setAddExceptionsTableColumns(agGridcols);
      setLoading(false);
    };
    fetchColumns();
  }, []);

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
      //loop over the table data and check if for each column, data is selected or not
      exceptionsTableData.forEach((eachException) => {
        addExceptionsTableColumns.forEach((eachCol) => {
          if (
            eachCol.column_name !== "delete_icon" &&
            (!eachException[eachCol.column_name] ||
              eachException[eachCol.column_name]?.length === 0)
          ) {
            //If the data is not selected, we make requiredFieldsError as true
            requiredFieldsError = true;
          }
        });
      });
      //If the table data is empty
      if (exceptionsTableData.length === 0) {
        requiredFieldsError = true;
      }
      if (requiredFieldsError) {
        //If there is error, we display the error
        props.toggleError("Please Enter the data in all the required fields");
        requiredFieldsError = false;
      } else {
        //If there is no error, we pass the table data to apply function to apply unmappings
        let closeModal = await props.onApply(exceptionsTableData);
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
      setLoading(false);
    } catch (err) {
      props.toggleError(err?.response?.data?.message || "Error in API call");
      setLoading(false);
    }
  };

  const addExceptions = () => {
    //On Click of add exceptions button, we add a new row to the table data
    let updatedExceptionsTableData = cloneDeep(exceptionsTableData);
    const currentIdx = updatedExceptionsTableData.length + 1;
    updatedExceptionsTableData.push({
      product_code: null,
      store_code: null,
      id: "row_" + currentIdx,
    });
    setExceptionsTableData(updatedExceptionsTableData);
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.root}
      maxWidth={"lg"}
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
          <AddExceptionsTable
            ref={exceptionsTableRef}
            addExceptionsTableColumns={addExceptionsTableColumns}
            exceptionsTableData={exceptionsTableData}
            setExceptionsTableData={setExceptionsTableData}
            setFlagEdit={setFlagEdit}
          />
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
            id="exceptionCancelBtn"
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
            id="exceptionSaveBtn"
            color="primary"
          >
            Apply
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
}

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(null, mapDispatchToProps)(ExceptionList);
