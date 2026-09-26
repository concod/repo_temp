import React, { useEffect, useMemo, useState, useCallback,useRef } from "react";
import Loader from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "../../../../../core/Utils/agGrid/column-formatter";
import { fetchTableConfigData } from "modules/oms/services-oms/Ordering-Configurator/ordering-configurator-service.js";
import { connect, useDispatch } from "react-redux";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { Button } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { saveScreenConfiguration } from "modules/oms/services-oms/Ordering-Configurator/ordering-configurator-service.js";
import { disableJustCache } from "core/Utils/axios";
import { Typography, Box } from "@mui/material";



const TableConfigTable = (props) => {
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [originalRowData, setOriginalRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [instanceLoaded, setInstanceLoaded] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [hasEmptyLabel, setHasEmptyLabel] = useState(false);
  // const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const tableInstance = useRef();
  const lastEmptyWarnRef = useRef(null);
  const classes = useStyles();

  // const hasChanges = useMemo(() => {
  //   if (originalRowData.length !== rowData.length) {
  //     return true;
  //   }
  //   return false
    
  // }, [originalRowData, rowData]);
 

  const fetchData = async () => {
    setLoading(true);
    setInstanceLoaded(false)
   disableJustCache()
    try {
      // TODO: Replace with real API calls to fetch table config data and columns
      let columnData = [
        {
          sub_headers: [],
          tc_code: 198,
          label: "Label",
          column_name: "label",
          dimension: "Others",
          type: "str",
          is_frozen: false,
          is_editable: true,
          is_aggregated: true,
          order_of_display: 3,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "71280",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: true,
          extra: {
            labelHirarchy: "false",
          },
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Column Name",
          column_name: "column_name",
          dimension: "Others",
          type: "str",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 2,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "71268",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {
           
          },
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Dimension",
          column_name: "dimension",
          dimension: "Others",
          type: "str",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 1,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "71279",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Type",
          column_name: "type",
          dimension: "Others",
          type: "str",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 6,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "7271",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },  
       
        {
          sub_headers: [],
          tc_code: 198,
          label: "Editable",
          column_name: "is_editable",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 4,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "727227",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Searchable",
          column_name: "is_searchable",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 4,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "727227",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Sortable",
          column_name: "is_sortable",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 4,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "727227",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Hidden",
          column_name: "is_hidden",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 4,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "727227",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Freeze",
          column_name: "is_frozen",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 4,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "727227",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        
        

      ];
      let formattedColumns = agGridColumnFormatter(columnData);
      if(formattedColumns)
      {
        var tableName = localStorage.getItem("module_tc_name")
      }
      let dataResponse = await props.fetchTableConfigData(tableName)
      setColumnDefs(formattedColumns);
      if(dataResponse.data.status)
      {
        console.log("dataResponse",dataResponse)
        let sub_headers =[]
        const updatedHeaders = dataResponse?.data?.data.map((data) => {
          if (Array.isArray(data?.sub_headers) && data.sub_headers.length !== 0) {
            const parentTcMappingCode = data.tc_mapping_code;
            const updatedSubHeaders = data.sub_headers.map((subHeader) => ({
              ...subHeader,
              child_tc_mapping_code: parentTcMappingCode,
            }));
            sub_headers.push(...updatedSubHeaders);
            return {
              ...data,
              sub_headers: updatedSubHeaders,
            };
          }
          return data;
        });
        var flattenedData = [...updatedHeaders, ...sub_headers]
        flattenedData.sort((a, b) => a.order_of_display - b.order_of_display);
      
        
      }
      const updatedData = flattenedData.map((item, index) => ({
        ...item,
        row_id: index + 1  // unique key starting from 1
      }));
      
      
      setOriginalRowData(updatedData);
      setRowData(updatedData);
    } catch (e) {
      console.log('error',e)
      // no-op for now
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
   // console.log("dataResponse",rowData)
    fetchData();
  }, []);

  const loadTableInstance = (instance) => {
    tableInstance.current = instance;
    //setInstanceLoaded(true);
  };

  const onCellValueChangeHandler = async (event) => {
    const columnId = event.column.colId;
    const initialValue = event.oldValue;
    const value = event.value;
    const rowIndex = event.rowIndex; // not used for updates; row_id is used instead for stability
    setButtonDisabled(true)
    // handle normal label change
    if (columnId === "label") {
      
      const currentRowId = event?.data?.row_id;
      const newLabel = value;
      const prevLabel = initialValue;
      const warnKey = `${currentRowId}:${String(newLabel ?? "").trim()}`;
      // update only local state; grid already has the edit
      setRowData((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((r) => r?.row_id === currentRowId);
        if (idx > -1) {
          next[idx] = {
            ...next[idx],
            label: newLabel,
          };
        }
        const hasEmpty = next.some(r => !String(r?.label ?? "").trim());
        setHasEmptyLabel(hasEmpty);
        // show warning only when transitioning from non-empty -> empty
        const becameEmpty = !String(newLabel ?? "").trim() && !!String(prevLabel ?? "").trim();
        if (becameEmpty && lastEmptyWarnRef.current !== warnKey) {
          props?.addSnack?.({
            message: "Label cannot be empty",
            options: { variant: "warning" },
          });
          lastEmptyWarnRef.current = warnKey;
        }
        return next;
      });
      return;
    }


    // handle boolean toggles without reload
    if (
      ["is_editable", "is_frozen", "is_hidden","is_searchable","is_sortable"].includes(
        columnId
      )
    ) {
      const currentRowId = event?.data?.row_id;
      // coerce to boolean if needed
      let boolVal = value;
      if (typeof boolVal !== "boolean") {
        if (typeof boolVal === "string") {
          boolVal = boolVal.toLowerCase() === "true";
        } else {
          boolVal = !!boolVal;
        }
      }
      // grid already set the value; just sync local state
      setRowData((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((r) => r?.row_id === currentRowId);
        if (idx > -1) {
          next[idx] = {
            ...next[idx],
            [columnId]: boolVal,
          };
        }
        return next;
      });
      return;
    }
  };

  const saveConfiguration = async () => {
    try{
      // block save if any label is empty
      const hasEmpty = rowData.some(r => !String(r?.label ?? "").trim());
      if (hasEmpty) {
        setHasEmptyLabel(true);
        props?.addSnack?.({
          message: "Please fill all labels before saving",
          options: { variant: "warning" },
        });
        return;
      }

      const cleanedRowData = rowData.map(row => {
        // if(row?.sub_headers?.length !== 0)
        // {
        //   row.sub_headers = []
        // }
        const {  row_id, ...cleanedRow } = row;
        return cleanedRow;
      });
      const payload = {
        //table_name: localStorage.getItem("module_fc_name"),
        table_configurations: cleanedRowData
      }
      let saveData = await props.saveScreenConfiguration(payload);
      if(saveData?.data?.status)
      {
        setButtonDisabled(false)
        setInstanceLoaded(true)
        tableInstance?.current?.api.refreshCells({
          force: true,
        });
        props?.addSnack?.({
          message: "Table Configuration saved successfully",
          options: { variant: "success" },
        });
       // window.location.reload()
      }
    }
    catch(error)
    {
      console.log("error",error)
      setButtonDisabled(false)
      props?.addSnack?.({
        message: "Something went wrong",
        options: { variant: "error" },
      });
    }
  }

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <>
        <Button
          variant="secondary"
          color="primary"
          className={classes.button}
          onClick={() => saveConfiguration()}
          disabled ={!buttonDisabled || hasEmptyLabel}
        >
          Save
        </Button>
        {/* <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={() => addingNewFilter()}
        >
          Add New label
        </Button>
        <Button
          onClick={() => onDeleteHandler()}
          size="large"
          disabled={selectedRows.length === 0}
          icon={<DeleteIcon />}
          variant="secondary"
          color="primary"
          sx={{
            minWidth: "20px",
            marginRight: "10px",
          }}
        /> */}
      </>
    );
    return options;
  };

  console.log('tableData',rowData)
  return (
    <Loader loader={loading} minHeight={"260px"}>
      {rowData?.length !==0 ?
      <div className="ag-theme-alpine" style={{ height: 500, width: "100%" }}>
        <AgGridTable
          rowdata={rowData}
          columns={columnDefs}
          //defaultColDef={defaultColDef}
          pagination={true}
          // paginationPageSize={pageSize}
          suppressPaginationPanel={false}
          animateRows={true}
          uniqueRowId={"row_id"}
          onCellValueChanged={onCellValueChangeHandler}
          loadTableInstance={loadTableInstance}
          topRightOptions={getTopRightOptions()}
          tableHeader={ props.moduleName ? `${props.moduleName} Screen Table Configuration` : 'Screen Table Configuration'}
        />
      </div>
      :
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        width="100%"
      >
        <Typography variant="h6" color="text.secondary" style={{marginRight:"9%"}}>
          No table configuration available for {props.moduleName}
        </Typography>
      </Box>
}
    </Loader>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  fetchTableConfigData: (payload) => dispatch(fetchTableConfigData(payload)),
  saveScreenConfiguration: (payload) => dispatch(saveScreenConfiguration(payload))
});
export default connect(null, mapDispatchToProps)(TableConfigTable);

