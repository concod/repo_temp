import { useState, useEffect } from "react";
import {
  Grid,
} from "@mui/material";
import Form from "../../../Utils/form";
import { cloneDeep } from "lodash";
import { getAllDCs } from "../services-product-mapping/productMappingService";
import { Modal } from "impact-ui-v3";

const EditPoMapping = (props) => {
  const [currentData, setCurrentData] = useState({});
  const [poEditDetails, setPOEditDetails] = useState({});
  const [dcEditDetails, setDCEditDetails] = useState({});
  const [dcEditFields, setDCEditFields] = useState([]);
  const [dcError, setDcError] = useState("");
  const [shippingEditFields, setshippingEditFields] = useState([
    {
      label: "PO Issue Date",
      field_type: "DateTimeField",
      accessor: "issueDate",
    },
    {
      label: "Expected Receive Date",
      field_type: "DateTimeField",
      accessor: "receiveDate",
    },
    {
      label: "Vendor Name",
      field_type: "TextField",
      accessor: "vendorName",
    },
    {
      label: "Shipping Quantity",
      field_type: "TextField",
      accessor: "orderQuantity",
    },
    {
      label: "Arrival DC",
      field_type: "list",
      accessor: "arrivalDC",
      options: [],
      isMulti: true,
    },
  ]);

  useEffect(() => {
    const setEditAsnMapping = async () => {
      const data = props.mappingData.filter(
        (item) => item.product_code === props.currentProduct
      );
      setCurrentData(cloneDeep(data[0]));
      const allDCs = await getAllDCs()();
      let shippingFields = shippingEditFields;
      shippingFields.filter(
        (s) => s.accessor === "arrivalDC"
      )[0].options = allDCs.map((dc) => {
        return { id: dc.name, label: dc.name, value: dc.name };
      });
      setshippingEditFields(shippingFields);
    };
    setEditAsnMapping();
  }, [props.currentProduct]);

  useEffect(() => {
    let defaultValues = {};
    if (currentData && currentData.attributes) {
      defaultValues = {
        issueDate: currentData.attributes.issue_date,
        receiveDate: currentData.attributes.expected_receive_date,
        vendorName: currentData.attributes.vendor_name,
        orderQuantity: currentData && currentData.total_quantity,
        arrivalDC: currentData.dc_map && currentData.dc_map.map((dc) => dc.dc),
      };
    }

    setPOEditDetails(defaultValues);
    let fields =
      currentData &&
      currentData.dc_map &&
      currentData.dc_map.map((dc) => {
        return {
          label: dc.dc,
          field_type: "TextField",
          accessor: dc.dc,
        };
      });
    setDCEditFields(fields);

    defaultValues = {};
    if (currentData && currentData.dc_map) {
      currentData.dc_map.forEach((dc) => {
        defaultValues[dc.dc] = dc.quantity_perc;
      });
      setDCEditDetails(defaultValues);
    }
  }, [currentData]);

  const handleShippingChange = (obj) => {
    let editedProduct = currentData;
    editedProduct.attributes.issue_date = obj.issueDate;
    editedProduct.attributes.expected_receive_date = obj.receiveDate;
    editedProduct.attributes.vendor_name = obj.vendorName;
    editedProduct.total_quantity = obj.orderQuantity;
    if (obj.arrivalDC && obj.arrivalDC.length) {
      const newDCs = obj.arrivalDC.map((dc) => {
        return { dc: dc, quantity: 0, quantity_perc: 0 };
      });
      if (editedProduct.dc_map) {
        newDCs.forEach((dc) => {
          if (!editedProduct.dc_map.some((d) => d.dc === dc.dc)) {
            editedProduct.dc_map.unshift(dc);
          }
        });
      } else {
        editedProduct["dc_map"] = newDCs;
      }
      setDCEditFields(
        editedProduct.dc_map.map((dc) => {
          return { label: dc.dc, field_type: "TextField", accessor: dc.dc };
        })
      );
    }
    setCurrentData(editedProduct);
  };

  const handleDCChange = (obj) => {
    let editedProduct = currentData;
    editedProduct.dc_map.forEach((dc) => {
      if (obj[dc.dc]) {
        dc.quantity_perc = obj[dc.dc];
      }
    });
    setCurrentData(editedProduct);
  };
  const resetData = () => {
    const data = props.mappingData.filter(
      (item) => item.product_code === props.currentProduct
    );
    setCurrentData(cloneDeep(data[0]));
    setDcError("");
    props.closeDialog();
  };
  const updateMapping = () => {
    if (
      currentData.dc_map.some(
        (dc) => dc.quantity_perc > 100 || dc.quantity_perc < 0
      )
    ) {
      setDcError("Please input a value between 0 and 100");
    } else {
      setDcError("");
      props.updateMapping(currentData);
      props.closeDialog();
    }
  };
  return (
    <Modal
      open={props.visible}
      size={"large"}
      onClose={resetData}
      title = {"Modify ASN Details"}
      primaryButtonLabel = "Save"
      secondaryButtonLabel = "Cancel"
      onPrimaryButtonClick = {updateMapping}
      onSecondaryButtonClick = {resetData}
    >  
        {currentData && (
          <>
            <Grid container spacing={2} className="edit-mapping-dialog">
              <Grid item xs={3}>
                <span className="po-details-label">Product ID:</span>{" "}
                {currentData.product_code}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">ASN No.:</span>{" "}
                {currentData.source_asn_code}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">Batch No.:</span>{" "}
                {currentData.batch}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">PO ID:</span>{" "}
                {currentData.source_po_code}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">PO Line item: </span>{" "}
                {currentData.line_number}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">Product Name: </span>
                {currentData.product_name}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">Description:</span>{" "}
                {currentData.description}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">Size and Color:</span>{" "}
                {currentData.size_color}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">Style Group:</span>{" "}
                {currentData.style_group}
              </Grid>
            </Grid>

            <Grid container spacing={6} className="edit-mapping-form">
              <Grid item xs={6}>
                <span className="po-details-label">Shipping</span>
                {/* //this */}
                <Form
                  handleChange={handleShippingChange}
                  fields={shippingEditFields}
                  defaultValues={poEditDetails}
                ></Form>
              </Grid>
              <Grid item xs={6}>
                <span className="po-details-label">DC - Push%</span>
                {dcError && <span className="error-label">{dcError}</span>}
                {dcEditFields && dcEditFields.length && (
                  <Form
                    handleChange={handleDCChange}
                    fields={dcEditFields}
                    defaultValues={dcEditDetails}
                  ></Form>
                )}
              </Grid>
            </Grid>
          </>
        )}
    </Modal>
  );
};

export default EditPoMapping;
