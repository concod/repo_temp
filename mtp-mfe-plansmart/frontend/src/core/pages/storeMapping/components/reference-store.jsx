import React, { forwardRef, useEffect, useState } from "react";
import { connect } from "react-redux";
import Loader from "../../../Utils/Loader/loader";
import "./filter.scss";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import makeStyles from "@mui/styles/makeStyles";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import { Dialog, DialogActions, DialogContent, Snackbar } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import Form from "../../../Utils/form";
import {
  getAllStoreGroupProducts,
  getAllStoreProducts,
  mapStoreGroupToProduct,
  mapStoreToProduct,
} from "../services/storeMappingService";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});
const useStyles = makeStyles((theme) => ({
  button: {
    marginLeft: "0.6rem",
  },
  confirmBox: {
    "& .MuiDialog-paper": {
      minWidth: "430px",
      borderRadius: "10px 10px 6px 6px",
    },
  },
  contentBody: {
    minHeight: "10rem",
  },
  action: {
    background: "#f7f7f7",
    padding: "1rem",
  },
  actionToolbar: {
    flex: 1,
    display: "flex",
    justifyContent: "flex-end",
  },
  title: {
    fontSize: "1rem",
    fontWeight: "600",
    paddingTop: "1.5rem",
  },
  text: {
    paddingTop: "1rem",
    fontSize: "0.9rem",
    color: "#5a5a5ad9",
  },
  HeaderBreadCrumbs: {
    display: "flex",
    paddingBottom: "2rem",
  },
  footer: {
    textAlign: "center",
    padding: "1rem",
  },
  filterGroup: {
    display: "flex",
    padding: "2rem",
  },
}));

const ReferenceStore = forwardRef((props, ref) => {
  const [showloader, setloader] = useState(true);
  const [rowData, setRowData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [errorPopup, setErrorPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [successPopup, setSuccessPopup] = useState(false);
  const [warningPopup, setWarningPopup] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [defaultOption, setdefaultOption] = useState({ ref_store: null });
  const [confirmBox, showConfirmBox] = useState(false);

  const [selectedStore, updateSelectedStore] = useState({});
  const classes = useStyles();

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let cols = await getColumnsAg(
          "table_name=store_product_reference_products"
        )();
        cols = cols.map((item) => {
          if (item.column_name === "status") {
            item.showFilter = true;
            item.options = [
              { label: "Active", id: "active" },
              { label: "Clearence", id: "clearence" },
              { label: "Inactive", id: "inactive" },
            ];
          }
          if (item.column_name === "type") {
            item.showFilter = true;
            item.options = [
              { label: "Season", id: "season" },
              { label: "fashion", id: "fashion" },
            ];
          }
          return item;
        });
        setColumns(cols);
        setloader(false);
      } catch (error) {
        console.log(error);
      }
    };

    getInitialData();
  }, []);

  const updateProductsData = async (body, pageIndex) => {
    let queryParams = pageIndex
      ? `?reference_store=${selectedStore}&page=${pageIndex + 1}`
      : `?reference_store=${selectedStore}`;
    if (props.selectedDimension === "store") {
      let { data: products } = await getAllStoreProducts(body, queryParams)();
      let selectedRowsData = [];
      products.data.forEach((item, idx) => {
        let obj = {};
        obj[idx] = true;
        selectedRowsData.push(obj);
      });
      setSelectedRows(selectedRowsData);
      setRowData(products.data);
      if (products.data.length === 0) {
        setErrorMsg("There is no product for this store");
        setErrorPopup(true);
      }
      setloader(false);
    } else {
      let { data: products } = await getAllStoreGroupProducts(
        body,
        queryParams
      )();
      let selectedRowsData = [];
      products.data.forEach((item, index) => {
        let obj = {};
        obj[index] = true;
        selectedRowsData.push(obj);
      });
      setSelectedRows(selectedRowsData);
      setRowData(products.data);
      setloader(false);
      if (products.data.length === 0) {
        setErrorMsg("There is no product for this store");
        setErrorPopup(true);
      }
    }
  };

  const manualCallBack = async (manualbody, pageIndex, pageSize) => {
    setloader(true);
    try {
      let body = {};
      let meta = manualbody
        ? { ...manualbody }
        : {
            range: [],
            sort: [],
            search: [],
          };
      if (props.selectedDimension === "store") {
        body = {
          selected_stores: props.rowData.map((item) => item.store_code),
          filters: [],
          meta: {
            ...meta,
          },
          headers: [],
        };
      } else {
        body = {
          selected_store_groups: props.rowData.map((item) => item.sg_code),
          filters: [],
          meta: {
            ...meta,
          },
          headers: [],
        };
      }
      updateProductsData(body, pageIndex);
    } catch (err) {
      setloader(false);
    }
  };

  const handleChange = (selectedStoreData) => {
    setdefaultOption(selectedStoreData);
    updateSelectedStore(selectedStoreData.ref_store);
    props.setSelectedRefStore(selectedStoreData.ref_store);
  };

  const onConfirm = async () => {
    try {
      setloader(true);

      if (props.selectedDimension === "store") {
        let body = {
          stores: props.rowData.map((item) => item.store_code),
          products: selectedRowsIDs.map((item) => {
            return {
              product_code: item,
              include_unmapped: true,
              map: true,
              select: [],
              unselect: [],
            };
          }),
        };
        const level = props.isAggregated ? "aggregation" : "product";
        await mapStoreToProduct(body, level)();
      } else {
        let body = {
          store_groups: props.rowData.map((item) => item.sg_code),
          products: selectedRowsIDs.map((key) => {
            return {
              product_code: key,
              include_unmapped: true,
              map: true,
              select: [],
              unselect: [],
            };
          }),
        };
        await mapStoreGroupToProduct(body)();
      }
      setShowModal(false);
      props.addSnack({
        message: "Store Mapping Data Saved Successfully",
        options: {
          variant: "success",
        },
      });
      setloader(false);
      props.goBack();
    } catch (err) {
      setloader(false);
      props.addSnack({
        message: err?.response?.data?.detail || "Something went wrong.",
        options: {
          variant: "error",
        },
      });
    }
  };

  const onReset = () => {
    setdefaultOption({ ref_store: null });
    setRowData([]);
  };
  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setSuccessPopup(false);
  };
  const handleWarningClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setWarningPopup(false);
  };
  const handleErrorClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setErrorPopup(false);
  };

  const renderContent = () => {
    let formFields = [
      {
        label: "Select Reference Store",
        required: true,
        field_type: "list",
        options: [...props.options],
        accessor: "ref_store",
      },
    ];
    return (
      <Loader loader={showloader || props.showFilterLoader}>
        <div data-testid="filterContainer">
          <Snackbar
            open={successPopup}
            autoHideDuration={6000}
            onClose={handleClose}
          >
            <Alert
              onClose={handleClose}
              severity="success"
              sx={{ width: "100%" }}
            >
              Product Data Updated Successfully
            </Alert>
          </Snackbar>
          <Snackbar
            open={errorPopup}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            autoHideDuration={6000}
            onClose={handleErrorClose}
          >
            <Alert
              onClose={handleErrorClose}
              severity="error"
              sx={{ width: "100%" }}
            >
              {errorMsg}
            </Alert>
          </Snackbar>
          <Snackbar
            open={warningPopup}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            autoHideDuration={6000}
            onClose={handleWarningClose}
          >
            <Alert
              onClose={handleWarningClose}
              severity="warning"
              sx={{ width: "100%" }}
            >
              There is no change to save.
            </Alert>
          </Snackbar>

          <Dialog
            open={showModal}
            className={classes.confirmBox}
            onClose={() => setShowModal(false)}
            id={"routePrompt"}
          >
            <DialogContent className={classes.contentBody}>
              <div className={classes.title}> Confirm Changes</div>
              <div className={classes.text}>
                Are you sure to save all your changes ?
              </div>
            </DialogContent>
            <DialogActions className={classes.action}>
              <Button
                id="closeBtn"
                onClick={() => setShowModal(false)}
                color="primary"
                autoFocus
              >
                Close
              </Button>
              <Button
                id="updateBtn"
                onClick={() => onConfirm()}
                color="primary"
                autoFocus
              >
                Update
              </Button>
            </DialogActions>
          </Dialog>
          <Paper elevation={0}>
            <div className={classes.filterGroup}>
              <div style={{ flex: 1, position: "relative" }}>
                <Form
                  maxFieldsInRow={1}
                  handleChange={handleChange}
                  fields={formFields}
                  // updateDefaultValue={true}
                  defaultValues={defaultOption}
                ></Form>
              </div>
              <div className={classes.actionToolbar}>
                <Button
                  variant="contained"
                  color="primary"
                  id="referenceStoreFilterBtn"
                  className={classes.button}
                  onClick={async () => {
                    ref?.current?.api?.refreshServerSideStore({ purge: true });
                  }}
                >
                  Filter
                </Button>
                <Button
                  variant="outlined"
                  id="referenceStoreResetBtn"
                  className={classes.button}
                  onClick={onReset}
                >
                  Reset
                </Button>
              </div>
            </div>
          </Paper>
          {confirmBox && (
            <ConfirmBox
              onClose={() => showConfirmBox(false)}
              onConfirm={() => {
                manualCallBack();
                showConfirmBox(false);
              }}
            />
          )}
        </div>
      </Loader>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
});
const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
  };
};

export default connect(null, mapDispatchToProps, null, { forwardRef: true })(
  ReferenceStore
);
