import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Form from "core/Utils/form";
import { useEffect, useRef, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import { roundZeroDecimal } from "../helperFunctions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import colours from "core/Styles/colours";
import { MIN_MAX_VALIDATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import AgGridComponent from 'core/Utils/agGrid';
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.6rem",
    },
  },
}));

const StoreSetAllModal = ({
  setShowSetAllModal,
  agGridInstance,
  setTotalEstimatedDemad,
  setSelectedRows,
  showSizeLevelBulkEdit
}) => {
  const ref=useRef();
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const classes = useStyles();
  const [rowData, setRowData] = useState([]);
  const [showForm, setShowForm] = useState(false)
  const [storeSetallFields, setStoreSetallFields] = useState([]);
  const colDef = agGridColumnFormatter([
    { 
      'field': 'size',
      'pinned': 'left',
      "headerName":'Size',
      "width": 200
    },
    {
      "column_name": "min",
      "label": "Min",
      "type": "int",
      "is_editable": true,
      "width": 200,
    },
    {
      "column_name": "max",
      "label": "Max",
      "type": "int",
      "is_editable": true,
      "width": 200,
    },
 ])
  useEffect(()=>{
    let instance = agGridInstance.current.api.getSelectedNodes();
    readyTheRows(instance);
    let store_fields=[
      {
        label: dynamicLabelsBasedOnTenant("aps"),
        accessor: "aps",
        field_type: "IntegerField",
        value_type: "number",
      },
      {
        label: "WOS",
        accessor: "wos",
        field_type: "IntegerField",
        value_type: "number",
      },
    ]
    //For other Clients
    if(!showSizeLevelBulkEdit){
      store_fields.push(
        {
          label: dynamicLabelsBasedOnTenant("min") || "Min",
          accessor: "min",
          field_type: "IntegerField",
          value_type: "number",
        },
        {
          label: dynamicLabelsBasedOnTenant("max") || "Max",
          accessor: "max",
          field_type: "IntegerField",
          value_type: "number",
        }
      )
    }
    setStoreSetallFields(store_fields);
    setShowForm(true);
  },[])

  const readyTheRows = (instances) =>{
    let sizes = instances[0]?.data?.size_desc;
    let data_1 = instances[0]?.data;
    setRowData(sizes?.map( item => {
      return {
        size:item,
        max:data_1?.[item+'_max_stock'] | 0, 
        min:data_1?.[item+'_min_stock'] | 0,
      }
    }))
  }

  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (+formData.min > +formData.max) {
      setShowValidation(true);
      return;
    }
    let selections = agGridInstance.current.api
      .getSelectedNodes()
      ?.filter((val) => val.displayed);
    let l_oldEstimatedDemand = 0,
      l_newEstimatedDemand = 0;

    selections.forEach((row) => {
      const selected = row.data;
      if (!isEmpty(formData.wos)) {
        selected["WOS_rounded"] = formData.wos;
        selected.isWosEdited = true;
      }
      if (!isEmpty(formData.min) || !isEmpty(formData.max)) {
        selected.minMaxEdited = true;
      }
      !isEmpty(formData.aps) && (selected["APS/ROS"] = formData.aps);
      // for RL
      if(showSizeLevelBulkEdit){
        rowData.map(item => {
          selected[item.size+"_min_stock"] = item.min;
          selected[item.size+"_max_stock"] = item.max;
        })
      }
      // for other clients
      !isEmpty(formData.min) && (selected["min_stock"] = formData.min);
      !isEmpty(formData.max) && (selected["max_stock"] = formData.max);
      let l_available, l_required, l_estimatedDemand;
      l_available =
        Number(selected["onhand"]) +
        Number(selected["onorder"]) +
        Number(selected["intransit"]);
      l_required =
        (formData.aps ? formData.aps : selected["APS/ROS"]) *
        (formData.wos ? formData.wos : selected["WOS_rounded"]);
      l_estimatedDemand = roundZeroDecimal(
        Math.max(
          0,
          Math.min(
            selected["max_stock"],
            Math.max(Number(l_required), selected["min_stock"]) - l_available
          )
        )
      );
      l_oldEstimatedDemand += +selected["estimated_demand"];
      l_newEstimatedDemand += +l_estimatedDemand;
      selected["estimated_demand"] = l_estimatedDemand;
    });
    setTotalEstimatedDemad(
      (old) => +old - +l_oldEstimatedDemand + +l_newEstimatedDemand
    );
    await agGridInstance.current.api.redrawRows();
    let l_selectedRowsStoreCodeMapping = {};
    selections.forEach((rows) => {
      const selected = rows.data;
      l_selectedRowsStoreCodeMapping[selected.store_code] = {
        ...selected,
        is_selected: true,
      };
    });
    setSelectedRows(l_selectedRowsStoreCodeMapping);
    setShowSetAllModal(false);
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
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            Set All
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setShowSetAllModal(false)}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        {showForm && (
          <>
            <div className={classes.contentBody}>
              <Form
                maxFieldsInRow={2}
                layout={"vertical"}
                handleChange={handleChange}
                fields={storeSetallFields}
                updateDefaultValue={true}
                defaultValues={{}}
              ></Form>
            </div>
            {showSizeLevelBulkEdit && (
              <div style={{ marginTop: '20px' }}>
                <AgGridComponent
                  columns={colDef}
                  rowdata={rowData}
                  selectAllHeaderComponent={true}
                  loadTableInstance={(params) => ref.current = params}
                  uniqueRowId={'size'}
                  pagination={false}
                  showSaveTableConfig={false}
                  sideBar={false}
                />
              </div>
            )}
          </>
        )}
      </DialogContent>
      {showValidation && (
        <Typography align="center" color={colours.valencia}>
          {MIN_MAX_VALIDATION}
        </Typography>
      )}
      <DialogActions>
        <Button
          onClick={() => {
            onCancel();
          }}
          color="primary"
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={onApply} color="primary">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StoreSetAllModal;
