import { Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { Panel, Popover, Input, Tooltip, Button } from "impact-ui-v3";
import Form from "core/Utils/form";
import { useEffect, useRef, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty, isUndefined } from "lodash";
import { onlySpaces } from "../helperFunctions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import colours from "core/Styles/colours";
import { MIN_MAX_VALIDATION, MAX_MIN_VALIDATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const useStyles = makeStyles(() => ({
  setAllDetailsPanel: {
    width: "45vw",
    fontFamily: "Manrope",
    "& .impact_drawer_container_large": {
      width: "45vw",
    },
    "& .impact_accordion_main_container": {
      background: "#fff !important",
    },
  },
}));

const StoreSetAllModal = (props) => {
  const ref = useRef();
  const rowDataRef = useRef([]);
  const [formData, setFormData] = useState({});
  const [validation, setValidation] = useState({
    inValidMin: false,
    inValidMax: false,
  });
  const classes = useStyles();
  const [rowData, setRowData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [storeSetallFields, setStoreSetallFields] = useState([]);
  const [showSetAll, setShowSetAll] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [setAllSelections, setSetAllSelections] = useState([]);
  const [setAllValues, setSetAllValues] = useState({
    min: '',
    max: ''
  });
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
  const {
    setShowSetAllModal,
    agGridInstance,
    setSelectedRows,
    showSizeLevelBulkEdit,
  } = props;
  useEffect(() => {
    let instance = agGridInstance.current.api.getSelectedNodes();
    readyTheRows(instance);
    let store_fields = [
      // {
      //   label: dynamicLabelsBasedOnTenant("aps"),
      //   accessor: "aps",
      //   field_type: "IntegerField",
      //   value_type: "number",
      //   no_negative_values: true,
      // },
      {
        label: props.wosLable ? props.wosLable : "WOS",
        accessor: "wos_rounded",
        field_type: "IntegerField",
        value_type: "number",
        no_negative_values: true,
        minValue: "0",
      },
      // {
      //   label: "ROS",
      //   accessor: "aps/ros",
      //   field_type: "IntegerField",
      //   value_type: "number",
      //   no_negative_values: true,
      // },
    ];
    //For other Clients
    if (!showSizeLevelBulkEdit) {
      store_fields.push(
        {
          label: dynamicLabelsBasedOnTenant("min") || "Min",
          accessor: "min",
          field_type: "IntegerField",
          value_type: "number",
          no_negative_values: true,
          minValue: "0",
        },
        {
          label: dynamicLabelsBasedOnTenant("max") || "Max",
          accessor: "max",
          field_type: "IntegerField",
          value_type: "number",
          no_negative_values: true,
          minValue: "0",
        }
      );
    }
    setStoreSetallFields(store_fields);
    setShowForm(true);
  }, []);

  const readyTheRows = (instances) => {
    let sizes = instances[0]?.data?.size_desc;
    const rows = sizes?.map((item) => {
      return {
        sizeKey: item,
        size: replaceSpecialCharacter(item),
      };
    });
    rowDataRef.current = rows;
    setRowData(rows);
  };

  const handleChange = (data) => {
    setFormData(data);
  };

  const onSelectionChanged = (params) => {
    const selectedRows = params.api.getSelectedRows(); 
    setSetAllSelections(selectedRows);
  };

  const onCellValueChanged = (params) => {
    const { data, colDef, newValue } = params;
    rowDataRef.current = rowDataRef.current.map(row => {
      if (row.sizeKey === data.sizeKey) {
        return { ...row, [colDef.field]: newValue };
      }
      return row;
    });
  };

  const handleSetAllApply = () => {
    setShowSetAll(false);
    setAnchorEl(null);
    if (ref.current) {
      const selectedNodes = ref.current.api.getSelectedNodes();
      const updatedRowData = rowDataRef.current.map(row => {
        const isSelected = selectedNodes.some(node => node.data.sizeKey === row.sizeKey);
        if (isSelected) {
          const updatedRow = { ...row };
          if (setAllValues.min !== '') {
            updatedRow.min = parseInt(setAllValues.min);
          }
          if (setAllValues.max !== '') {
            updatedRow.max = parseInt(setAllValues.max);
          }
          return updatedRow;
        }
        return row;
      });
      rowDataRef.current = updatedRowData;
      setRowData(updatedRowData);
      ref.current.api.setGridOption('rowData', updatedRowData);
    }
    setSetAllValues({ min: '', max: ''});
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const getTopLeftOptions = () => {
       let options = []
         options.push(
           <Tooltip
             title={`Set All for selected sizes\nwill override grid edits`}
             orientation="top"
             variant="primary"
           >
             <Button
               icon={<InfoIcon fontSize="small" />}
               iconPlacement="left"
               size="small"
               type="default"
               variant="text"
             />
           </Tooltip>
         );
       
       return options
     }
  const getTopRightOptions = () => {
    let options = [];
    if (setAllSelections.length > 0) {
      options.push(
        <>
          <Button
            size="large"
            type="default"
            variant="primary"
            id="StoreDCSetAll"
            aria-describedby="StoreDCSetAll"
            onClick={(event) => {
              setAnchorEl(event.currentTarget);
              setShowSetAll(true);
            }}
          >
            Set All
          </Button>
          <Popover
            id="StoreDCSetAll"
            anchorEl={anchorEl}
            anchorOrigin={{
              horizontal: "left",
              vertical: "bottom",
            }}
            onClose={() => {
              setShowSetAll(false);
              setAnchorEl(null);
            }}
            onPrimaryButtonClick={handleSetAllApply}
            onSecondaryButtonClick={() => {
              setShowSetAll(false);
              setAnchorEl(null);
              setSetAllValues({ min: '', max: '' });
            }}
            open={showSetAll}
            primaryButtonLabel="Apply"
            secondaryButtonLabel="Cancel"
            title="Apply to selected sizes"
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                width: 270,
              }}
            >
              <Input
                label="Min"
                placeholder="Enter min value"
                type="number"
                value={setAllValues.min}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (value.length <= 5 && /^\d+$/.test(value))) {
                    setSetAllValues(prev => ({ ...prev, min: value }));
                  }
                }}
                style={{ flex: 1 }}
              />
              <Input 
                label="Max" 
                placeholder="Enter max value"
                type="number"
                value={setAllValues.max}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (value.length <= 5 && /^\d+$/.test(value))) {
                    setSetAllValues(prev => ({ ...prev, max: value }));
                  }
                }}
                style={{ flex: 1 }}
              />
            </div>
          </Popover>
        </>
      );
    }
    return options;
  };

  const onApply = async () => {
    // when both Min and Max are provided
    if (formData.wos_rounded && Number(formData.wos_rounded) > 52) {
      props.displaySnackMessages(
        `Please Enter ${props.wosLable ? props.wosLable : "WOS"} less than 52`,
        "error"
      );
      return;
    }
    if (
      formData.min &&
      formData.max &&
      parseInt(formData.min) >= parseInt(formData.max)
    ) {
      setValidation({ inValidMin: true, inValidMax: false });
      return;
    }
    if (
      formData.min &&
      formData.max &&
      parseInt(formData.max) <= parseInt(formData.min)
    ) {
      setValidation({ inValidMin: false, inValidMax: true });
      return;
    }
    let selections = agGridInstance.current.api
      .getSelectedNodes()
      ?.filter((val) => val.displayed);

    // when only Min is provided
    if (
      formData.min &&
      !formData.max &&
      selections.some(
        (selectedRow) =>
          parseInt(formData.min) > parseInt(selectedRow.data.max_stock)
      )
    ) {
      setValidation({ inValidMin: true, inValidMax: false });
      return;
    }
    // when only Max is provided:
    if (
      !formData.min &&
      formData.max &&
      selections.some(
        (selectedRow) =>
          parseInt(formData.max) < parseInt(selectedRow.data.min_stock)
      )
    ) {
      setValidation({ inValidMin: false, inValidMax: true });
      return;
    }

    if (showSizeLevelBulkEdit) {
      let l_validation = false;

      for (let i = 0; i < rowDataRef.current.length; i++) {

        if (rowDataRef.current[i].min && rowDataRef.current[i].max) {
          if (rowDataRef.current[i].min > rowDataRef.current[i].max) {
            l_validation = true;
            break;
          }
        }
      }

      if (l_validation) {
        setValidation({ inValidMin: true, inValidMax: false });
        return;
      }

      // Check for min/max validation
      let minMaxValidationFailed = false;
      for (const row of selections) {
        const selected = row.data;
        if (showSizeLevelBulkEdit) {
          for (const item of rowDataRef.current) {
            const sizeField = item.sizeKey;
            const newMin =
              isUndefined(item.min) || onlySpaces(item.min)
                ? selected[sizeField + "_min_stock"]
                : item.min;
            const newMax =
              isUndefined(item.max) || onlySpaces(item.max)
                ? selected[sizeField + "_max_stock"]
                : item.max;
            if (newMin > newMax) {
              setValidation({ inValidMin: true, inValidMax: false});
              minMaxValidationFailed = true;
              break;
            }
          }
          if (minMaxValidationFailed) break;
        }
      }

      if (minMaxValidationFailed) {
        return;
      }
    }

    selections.forEach((row) => {
      const selected = row.data;
      if (!isEmpty(formData.wos_rounded)) {
        selected["wos_rounded"] = formData.wos_rounded;
        selected.isWosEdited = true;
      }
      if (!isEmpty(formData.min) || !isEmpty(formData.max)) {
        selected.minMaxEdited = true;
      }
      !isEmpty(formData["aps/ros"]) &&
        (selected["aps/ros"] = formData["aps/ros"]);

      if (showSizeLevelBulkEdit) {
        rowDataRef.current.forEach((item) => {
          const sizeField = item.sizeKey;
          selected[sizeField + "_min_stock"] =
            isUndefined(item.min) || onlySpaces(item.min)
              ? selected[sizeField + "_min_stock"]
              : item.min;
          selected[sizeField + "_max_stock"] =
            isUndefined(item.max) || onlySpaces(item.max)
              ? selected[sizeField + "_max_stock"]
              : item.max;
        });

        let aggmin = 0,
          aggmax = 0;
        Object.keys(selected).forEach((key) => {
          if (key.includes("_min_stock") && !key.includes("original")) {
            aggmin = aggmin + selected[key];
          }
          if (key.includes("_max_stock") && !key.includes("original")) {
            aggmax = aggmax + selected[key];
          }
        });
        selected["min_stock_sum"] = aggmin;
        selected["max_stock_sum"] = aggmax;
      }

      !isEmpty(formData.min) && (selected["min_stock"] = formData.min);
      !isEmpty(formData.max) && (selected["max_stock"] = formData.max);
    });
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

    if (props.buildSetAllEditsPayload && props.applySetAllWithEdits) {
      const totalRows =
        agGridInstance.current?.api?.getDisplayedRowCount() || 0;
      const setAllEdits = props.buildSetAllEditsPayload(
        formData,
        selections,
        rowDataRef.current,
        totalRows,
        showSizeLevelBulkEdit
      );

      if (!isEmpty(setAllEdits)) {
        await props.applySetAllWithEdits(setAllEdits);
      }
    }
  };

  return (
    <Panel
      title="Set All"
      size="large"
      anchor="right"
      className={classes.setAllDetailsPanel}
      onClose={onCancel}
      aria-labelledby="customized-dialog-title"
      open={props.showSetAllModal}
      primaryButtonLabel={"Apply"}
      onPrimaryButtonClick={onApply}
      onSecondaryButtonClick={onCancel}
      secondaryButtonLabel={"Cancel"}
    >
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
                <AgGridComponent
                  columns={colDef}
                  rowdata={rowData}
                  selectAllHeaderComponent={true}
                  loadTableInstance={(params) => (ref.current = params)}
                  uniqueRowId={"sizeKey"}
                  pagination={false}
                  showSaveTableConfig={false}
                  sideBar={false}
                  onSelectionChanged={onSelectionChanged}
                  onCellValueChanged={onCellValueChanged}
                  tableHeader="Size Constraints"
                  topRightOptions={getTopRightOptions()}
                  topLeftOptions={getTopLeftOptions()}
                />
              </div>
            )}
          </>
        )}

        {validation.inValidMin && (
          <Typography align="center" color={colours.valencia}>
            {MIN_MAX_VALIDATION}
          </Typography>
        )}
        {validation.inValidMax && (
          <Typography align="center" color={colours.valencia}>
            {MAX_MIN_VALIDATION}
          </Typography>
        )}
    </Panel>
  );
};

export default StoreSetAllModal;
