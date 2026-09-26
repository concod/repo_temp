import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  updateProductAsnMapping,
  setProductAsnMappings,
  getProductAsnMapping,
} from "../services-product-mapping/productMappingService";
import { Snackbar } from "@mui/material";
import EditASNMapping from "./edit-asn-mapping";
import Loader from "../../../Utils/Loader/loader";
import { EDITCELL } from "../mapping-constants";
import { setActiveScreenName } from "../../commonModulesServices/common-assort-service";
import {Alert as MuiAlert} from "impact-ui-v3";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});
const ProductToASN = (props) => {
  const [columns, setColumns] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [mappingData, setMappingData] = useState(props.productASNMapping);
  const [snack, setSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");
  const [showloader, setLoader] = useState(false);
  const agGridInstance = useRef(null);

  useEffect(() => {
    props.setActiveScreenName("Product to ASN");
    sessionStorage.setItem("activeScreenName", "Product to ASN");
  }, []);

  useEffect(() => {
    const setProductAsnMappingData = async () => {
      if (props.filtersSelection.length) {
        const asnMappingData = await props.getProductAsnMapping({
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
        props.setProductAsnMappings(asnMappingData.data.data);
      } else {
        setMappingData([]);
        updateProductAsnMapping([]);
      }
    };
    setProductAsnMappingData();
  }, [props.filtersSelection]);

  useEffect(() => {
    const setProductAsnData = async () => {
      let cols = await getColumnsAg("table_name=product_asn")();
      let attributes = ["expected_receive_date", "issue_date", "vendor_name"];
      const customEditCell = [...EDITCELL];
      customEditCell.tc_code = 13;
      const formattedEditCell = agGridColumnFormatter(customEditCell);
      cols = [...cols, ...formattedEditCell];
      cols = cols.map((col) => {
        if (attributes.includes(col.column_name)) {
          col.accessor = `attributes.${col.accessor}`;
        }
        return col;
      });
      setColumns([...cols]);
      setMappingData(props.productASNMapping);
    };
    setProductAsnData();
  }, [props.productASNMapping]);

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
      let res = await props.updateProductAsnMapping(product);
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

  // To be added later with data integration
  // const manualCallBack = async (manualbody, pageIndex, params) => {
  //   const asnMappingData = await props.getProductAsnMapping({
  //     product_attributes: props.filtersSelection,
  //     filters: { ...manualbody, limit: { limit: 10, page: pageIndex } },
  //   });
  //   props.setProductAsnMappings(asnMappingData.data.data);
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
        <EditASNMapping
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
            uniqueRowId={"product-asn"}
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
    productASNMapping: state.productMappingReducerService.productASNMapping,
  };
};
const mapActionsToProps = (dispatch) => {
  return {
    updateProductAsnMapping: (data) => dispatch(updateProductAsnMapping(data)),
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    setProductAsnMappings,
    getProductAsnMapping,
  };
};
export default connect(mapStateToProps, mapActionsToProps)(ProductToASN);
