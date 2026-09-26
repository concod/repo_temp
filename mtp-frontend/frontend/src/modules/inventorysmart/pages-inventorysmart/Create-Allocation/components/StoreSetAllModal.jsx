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
import { isEmpty, isUndefined } from "lodash";
import { onlySpaces, roundZeroDecimal } from "../helperFunctions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import colours from "core/Styles/colours";
import { MIN_MAX_VALIDATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.6rem",
    },
  },
}));

const StoreSetAllModal = ({
  col,
  setShowSetAllModal,
  agGridInstance,
  setTotalEstimatedDemad,
  setSelectedRows,
  showSizeLevelBulkEdit,
  isPO,
}) => {
  const setAllTableref = useRef();
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [prevmax, setPrevmax] = useState(0);
  const classes = useStyles();
  const [rowData, setRowData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [storeSetallFields, setStoreSetallFields] = useState([]);
  const colDef = agGridColumnFormatter([
    {
      field: "size",
      column_name: "size",
      pinned: "left",
      headerName: "Size",
    
    },
    {
      column_name: "min",
      label: "Min",
      type: "int",
      is_editable: true,
    },
    {
      column_name: "max",
      label: "Max",
      type: "int",
      is_editable: true,
    },
  ]);
  useEffect(() => {
    let instance = agGridInstance.current.api.getSelectedNodes();
    readyTheRows(instance);
    const rosApsColumn = col.find((column) => column.field === "APS/ROS");
    const isRosApsEditable = rosApsColumn && rosApsColumn.is_editable;

    let store_fields = [
      {
        label: "WOS",
        accessor: "wos",
        field_type: "IntegerField",
        value_type: "number",
        no_negative_values: true,
        isDisabled: isPO ? true : false,
      },
    ];
    isRosApsEditable &&
    store_fields.push({
      label: dynamicLabelsBasedOnTenant("aps"),
      accessor: "aps",
      field_type: "IntegerField",
      value_type: "number",
    })
    //For other Clients
    if (!showSizeLevelBulkEdit) {
      store_fields.push(
        {
          label: dynamicLabelsBasedOnTenant("min") || "Min",
          accessor: "min",
          field_type: "IntegerField",
          value_type: "number",
          no_negative_values: true,
        },
        {
          label: dynamicLabelsBasedOnTenant("max") || "Max",
          accessor: "max",
          field_type: "IntegerField",
          value_type: "number",
          no_negative_values: true,
        }
      );
    }
    setStoreSetallFields(store_fields);
    setShowForm(true);
  }, []);

  const readyTheRows = (instances) => {
    let sizes = instances[0]?.data?.size_desc;
    let data_1 = instances[0]?.data;
    setPrevmax(data_1.max_stock);
    setRowData(
      sizes?.map((item) => {
        return {
          size: replaceSpecialCharacter(item),
          isRowColor: false,
          // max: data_1?.[item + "_max_stock"] | 0,
          // min: data_1?.[item + "_min_stock"] | 0,
        };
      })
    );
  };

  const handleChange = (data) => {
    setFormData(data);
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    let selections = agGridInstance.current.api
      .getSelectedNodes()
      ?.filter((val) => val.displayed);

    if (+formData.min > +formData.max) {
      setShowValidation(true);
      return;
    }
    if (showSizeLevelBulkEdit) {
      let l_validation = false;

      for (let i = 0; i < rowData.length; i++) {
        rowData[i].isRowColor = false;
      }

      let minCheckVals = rowData.filter((val) => {
        if (val.min)
          return val;
      })

      let maxCheckVals = rowData.filter((val) => {
        if (val.max)
          return val;
      })
      if (minCheckVals.length) {
        for (let i = 0; i < minCheckVals.length; i++) {
          if (!(minCheckVals[i].min && minCheckVals[i].max)) {
            for (let j = 0; j < selections.length; j++) {
              if (minCheckVals[i].min > selections[j].data[minCheckVals[i].size + "_max_stock"]) {
                minCheckVals[i].isRowColor = true;
                l_validation = true;
                let l_rowData = cloneDeep(rowData);
                setRowData(l_rowData);
              }
            }
          }
        }
      }
      if (maxCheckVals.length) {
        for (let i = 0; i < maxCheckVals.length; i++) {
          if (!(maxCheckVals[i].min && maxCheckVals[i].max)) {
            for (let j = 0; j < selections.length; j++) {
              if (maxCheckVals[i].max < selections[j].data[maxCheckVals[i].size + "_min_stock"]) {
                maxCheckVals[i].isRowColor = true;
                l_validation = true;
                let l_rowData = cloneDeep(rowData);
                setRowData(l_rowData);
              }
            }
          }
        }
      }

      for (let i = 0; i < rowData.length; i++) {
        if (!onlySpaces(rowData[i].min) && !onlySpaces(rowData[i].max)) {
          if (rowData[i].min > rowData[i].max) {
            rowData[i].isRowColor = true;
            l_validation = true;
            let l_rowData = cloneDeep(rowData);
            setRowData(l_rowData);
          }
        }
      }

      if (l_validation) {
        setShowValidation(true);
        return;
      }
    }

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
      if (showSizeLevelBulkEdit) {
        rowData.map((item) => {
          selected[item.size + "_min_stock"] =
            isUndefined(item.min) || onlySpaces(item.min)
              ? selected[item.size + "_min_stock"]
              : item.min;
          selected[item.size + "_max_stock"] =
            isUndefined(item.max) || onlySpaces(item.max)
              ? selected[item.size + "_max_stock"]
              : item.max;
        });
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
          Math.max(Number(l_required), selected["min_stock"]) - l_available
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
              <div style={{ marginTop: "20px" }}>
                { <AgGridComponent
                  columns={colDef}
                  rowdata={rowData}
                  // selectAllHeaderComponent={true}
                  loadTableInstance={(params) => (setAllTableref.current = params)}
                  uniqueRowId={"size"}
                  pagination={false}
                  showSaveTableConfig={false}
                  sideBar={false}
                  getRowStyle={(params) => {
                    if(params?.data?.isRowColor){
                      return {
                        background : "rgb(255,255,0.5)",
                      }
                    }
                  }}
                />}
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
