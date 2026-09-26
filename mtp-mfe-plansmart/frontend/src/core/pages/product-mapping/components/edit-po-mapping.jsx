import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
} from "@mui/material";
import Form from "core/Utils/form";
import { Prompt } from "impact-ui";
import { cloneDeep } from "lodash";
import { useEffect, useState } from "react";

const EditPoMapping = (props) => {
  const [currentData, setCurrentData] = useState({});
  const [poEditDetails, setPOEditDetails] = useState({});
  const [dcEditDetails, setDCEditDetails] = useState({});
  const [dcEditFields, setDCEditFields] = useState([]);
  const [input, setInput] = useState("qty");
  const [showConfirmationDialogue, setShowConfirmationDialogue] = useState(
    false
  );
  useEffect(() => {
    const data = props.mappingData.filter(
      (item) => item.product_code === props.currentProduct
    );
    setCurrentData(cloneDeep(data[0]));
  }, [props.currentProduct]);

  useEffect(() => {
    let defaultValues = {};
    if (currentData && currentData.attributes) {
      defaultValues = {
        issueDate: currentData.attributes.issue_date,
        receiveDate: currentData.attributes.expected_receive_date,
        vendorName: currentData.attributes.vendor_name,
        orderQuantity: currentData && currentData.total_quantity,
      };
    }

    setPOEditDetails(defaultValues);
    let fields =
      currentData &&
      currentData.dc_map &&
      currentData.dc_map.map((dc) => {
        return { label: dc.dc, field_type: "TextField", accessor: dc.dc };
      });
    setDCEditFields(fields);

    defaultValues = {};
    if (currentData && currentData.dc_map) {
      currentData.dc_map.forEach((dc) => {
        defaultValues[dc.dc] = input === "qty" ? dc.quantity : dc.quantity_perc;
      });
    }
    setDCEditDetails(defaultValues);
  }, [currentData, input]);

  const handlePOChange = (obj) => {
    let editedProduct = currentData;
    editedProduct.attributes.issue_date = obj.issueDate;
    editedProduct.attributes.expected_receive_date = obj.receiveDate;
    editedProduct.attributes.vendor_name = obj.vendorName;
    editedProduct.total_quantity = obj.orderQuantity;
    setCurrentData(editedProduct);
  };

  const handleDCChange = (obj) => {
    let editedProduct = currentData;
    editedProduct.dc_map.forEach((dc) => {
      if (obj[dc.dc]) {
        dc.quantity = obj[dc.dc];
      }
    });
    setCurrentData(editedProduct);
  };
  const resetData = (e) => {
    if (e) {
      const data = props.mappingData.filter(
        (item) => item.product_code === props.currentProduct
      );
      setCurrentData(cloneDeep(data[0]));
      setShowConfirmationDialogue(false);
      props.closeDialog();
    } else {
      setShowConfirmationDialogue(false);
    }
  };
  const updateMapping = () => {
    props.updateMapping(currentData);
    props.closeDialog();
  };

  const poEditFields = [
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
      label: "PO Order Quantity",
      field_type: "TextField",
      accessor: "orderQuantity",
    },
  ];

  return (
    <Dialog
      open={props.visible}
      maxWidth={"lg"}
      fullWidth
      TransitionProps={{
        onExit: resetData,
      }}
    >
      <DialogTitle>Modify PO Details</DialogTitle>
      <DialogContent>
        {currentData && (
          <>
            <Grid container spacing={2} className="edit-mapping-dialog">
              <Grid item xs={3}>
                <span className="po-details-label">Product ID:</span>{" "}
                {currentData.product_code}
              </Grid>
              <Grid item xs={3}>
                <span className="po-details-label">PO ID:</span>{" "}
                {currentData.po_code}
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
                <span className="po-details-label">PO Details</span>
                <Form
                  handleChange={handlePOChange}
                  fields={poEditFields}
                  defaultValues={poEditDetails}
                ></Form>
              </Grid>
              <Grid item xs={6}>
                <span className="po-details-label">DC Quantity</span>
                <div className="po-details-label quantity-select">
                  <RadioGroup
                    row
                    name="row-radio-buttons-group"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                  >
                    <FormControlLabel
                      value="qty"
                      control={<Radio color="primary" />}
                      label="Input Qty."
                    />
                    <FormControlLabel
                      value="perc"
                      control={<Radio color="primary" />}
                      label="Input %"
                    />
                  </RadioGroup>
                </div>

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
      </DialogContent>
      <DialogActions>
        <Button
          label="Cancel"
          onClick={() => setShowConfirmationDialogue(true)}
        >
          Cancel
        </Button>
        <Button label="Save" color="primary" onClick={updateMapping}>
          Save
        </Button>
      </DialogActions>
      {showConfirmationDialogue && (
          <Prompt
            isOpen={showConfirmationDialogue}
            title="Discard changes"
            subHeading="Are you sure you want to discard the changes?"
            infoList={[]}
            primaryButtonProps={{
              children: "Yes", onClick: () => {
                resetData()
                setShowConfirmationDialogue(false)
              }
            }}
            tertiaryButtonProps={{
              children: "No",
              onClick: () => setShowConfirmationDialogue(false),
            }}
            variant="error"
          />
      )}
    </Dialog>
  );
};

export default EditPoMapping;
