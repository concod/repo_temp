import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  updateProductPoMapping,
  getProductPoMapping,
  setProductPOMapping,
} from "../services-product-mapping/productMappingService";
import { Snackbar } from "@mui/material";
import EditPoMapping from "./edit-po-mapping";
import Moment from "moment";
import Loader from "../../../Utils/Loader/loader";
import MuiAlert from "@mui/material/Alert";
import { EDITCELL } from "../mapping-constants";
import { setActiveScreenName } from "../../commonModulesServices/common-assort-service";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});
const ProductToPO = (props) => {
  const [columns, setColumns] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [mappingData, setMappingData] = useState(props.productPOMapping);
  const [showloader, setLoader] = useState(false);
  const [snack, setSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");
  const agGridInstance = useRef(null);

  useEffect(() => {
    props.setActiveScreenName("Product to PO");
    sessionStorage.setItem("activeScreenName", "Product to PO");
  }, []);

  useEffect(async () => {
    if (props.filtersSelection.length) {
      const productPodata = await props.getProductPoMapping({
        product_attributes: props.filtersSelection,
        filters: {
          search: [],
          sort: [],
          range: [],
          limit: {
            limit: 10,
            page: 1,
          },
        },
      });
      props.setProductPOMapping(productPodata.data.data);
    } else {
      setMappingData([]);
      updateProductPoMapping([]);
    }
  }, [props.filtersSelection]);

  useEffect(async () => {
    let cols = await getColumnsAg("table_name=product_po")();
    let attributes = ["expected_receive_date", "issue_date", "vendor_name"];
    let dates = ["expected_receive_date", "issue_date"];
    const customEditCell = [...EDITCELL];
    customEditCell.tc_code = 12;
    const formattedEditCell = agGridColumnFormatter(
      customEditCell,
      {},
      {},
      false
    );
    cols = [...cols, ...formattedEditCell];
    cols = cols.map((col) => {
      if (attributes.includes(col.column_name)) {
        col.accessor = `attributes.${col.accessor}`;
      }
      if (dates.includes(col.column_name)) {
        col.Cell = (tableInfo) => {
          return Moment(
            tableInfo.row.original.attributes[col.column_name]
          ).format("DD-MM-YYYY");
        };
      }
      return col;
    });
    setColumns(cols);
    setMappingData(props.productPOMapping);
  }, [props.productPOMapping]);

  const editMapping = (product_code) => {
    setShowEdit(true);
    setCurrentProduct(product_code);
  };
  const closeDialog = () => {
    setCurrentProduct(null);
    setShowEdit(false);
  };
  const updateMapping = async (product) => {
    setLoader(true);
    try {
      const res = await props.updateProductPoMapping(product);
      if (res.data.message === "Successful") {
        let data = mappingData.map((prod) => {
          if (prod.product_code === product.product_code) {
            return product;
          }
          return prod;
        });
        setMappingData(data);
        setSnack(true);
        setSnackMsg("Updated successfully!");
        setSnackSeverity("success");
      }
    } catch (error) {
      setSnack(true);
      setSnackMsg("An error occured. Please try again");
      setSnackSeverity("error");
    }
    setLoader(false);
  };

  // To be added later during configuration
  // const manualCallBack = async (manualbody, pageIndex, params) => {
  //   const productPodata = await props.getProductPoMapping({
  //     product_attributes: props.filtersSelection,
  //     filters: { ...manualbody, limit: { limit: 10, page: pageIndex } },
  //   });
  //   props.setProductPOMapping(productPodata.data.data);
  //   return {
  //     data: asnMappingData.data.data,
  //     totalCount: asnMappingData.data?.total,
  //   }
  // };

  const handleWarningClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnack(false);
  };

  return (
    <>
      <Snackbar
        open={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        autoHideDuration={6000}
        onClose={handleWarningClose}
      >
        <Alert
          onClose={handleWarningClose}
          severity={snackSeverity}
          sx={{ width: "100%" }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
      <Loader loader={showloader}>
        <EditPoMapping
          visible={showEdit}
          currentProduct={currentProduct}
          closeDialog={closeDialog}
          updateMapping={updateMapping}
          mappingData={mappingData}
        />
        {Boolean(columns.length) && (
          <AgGridTable
            columns={columns}
            hideSelectAllRecords={true}
            onGridChanged
            // To be added later during configuration
            // manualCallBack={(body, pageIndex, params) =>
            //   manualCallBack(body, pageIndex, params)
            // }
            loadTableInstance={(gridInstance) => {
              agGridInstance.current = gridInstance;
            }}
            cacheBlockSize={10}
            uniqueRowId={"product-po"}
            rowdata={mappingData || []}
            onEditClick={(tableInfo) =>
              editMapping(tableInfo.cellData.data.product_code)
            }
          />
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    productPOMapping: state.productMappingReducerService.productPOMapping,
  };
};
const mapActionsToProps = (dispatch) => {
  return {
    updateProductPoMapping: (data) => dispatch(updateProductPoMapping(data)),
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    getProductPoMapping,
    setProductPOMapping,
  };
};
export default connect(mapStateToProps, mapActionsToProps)(ProductToPO);
