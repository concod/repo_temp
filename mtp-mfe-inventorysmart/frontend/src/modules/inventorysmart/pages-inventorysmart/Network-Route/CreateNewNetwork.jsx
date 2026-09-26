import { Grid, IconButton, Typography, Checkbox } from "@mui/material";
import { useRef, useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Button } from "impact-ui-v3";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import Form from "core/Utils/form";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  createNetworkRoute,
  getDropDownOptions,
  getNetworkRouteByID,
  updateNetworkRoute,
} from "modules/inventorysmart/services-inventorysmart/Network-Route/network-route";
import Delete from "@mui/icons-material/Delete";
import { getColumnsAg } from "core/actions/tableColumnActions";
import SetAllModal from "./SetAllModal";
import DeleteIcon from "@mui/icons-material/Delete";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
  },
  mainForm: {
    display: "flex",
    alignItems: "self-end",
    marginTop: "2rem",
    background: "white",
    padding: "1rem",
  },
  basicForm: {
    display: "flex",
    alignItems: "self-end",
    padding: "1rem",
    background: "white",
  },
  button: {
    // height: "20%",
    marginLeft: "1rem",
  },
}));

const CreateNewSupplyRoutePopUp = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [formData, setFormData] = useState({});
  const [basicFormData, setBasicFormData] = useState({});
  const [loader, setLoader] = useState(true);
  const [defaultValues, setDefaultValues] = useState({
    destination_node_toggle: "store",
    source_node_toggle: "store",
  });
  const [supplyRouteTableData, setSupplyRouteTableData] = useState([]);
  const [supplyRouteTableColumns, setSupplyRouteTableColumns] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [openSetAll, setOpenSetAll] = useState(false);
  const [selectedRow, setSelectedRows] = useState([]);
  let skuIdSelectArray = [
    { label: "Vendor-DC", value: "Vendor-DC" },
    { label: "DC-DC", value: "DC-DC" },
    { label: "DC-Store", value: "DC-Store" },
    { label: "Store-Store", value: "Store-Store" },
  ];

  const SupplyRouteTypeFields = [
    {
      accessor: "supply_route_type",
      field_type: "dropdown",
      label: "Select Supply Route Type",
      required: true,
      options: skuIdSelectArray,
      isMulti: false,
      isSearchable: false,
      isClearable: true,
    },
    {
      accessor: "source_node",
      field_type: "dropdown",
      label: "Source Node",
      required: true,
      options: [],
      isMulti: true,
      isSearchable: true,
      isClearable: true,
    },
    {
      accessor: "destination_node",
      field_type: "dropdown",
      label: "Destination Node",
      required: true,
      options: [],
      isMulti: true,
      isSearchable: true,
      isClearable: true,
    },
  ];

  const [field, setField] = useState(SupplyRouteTypeFields);
  const [basicFormField, setBasicFormFields] = useState([]);
  const [mainFormFields, setMainFormFields] = useState([]);
  const tableGridInstance = useRef();
  const onCancel = () => {};

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const handleChange = async (data, id, formField, e) => {
    if (id === "supply_route_type" || id === "source_node") {
      let final_option = formField.options.filter(
        (item) => item.value === data[id]
      );
      let finalObj =
        id === "supply_route_type"
          ? { name: data.name, supply_route_type: data.supply_route_type }
          : { ...formData, ...data };
      finalObj[`${id}_options`] = final_option;
      setFormData(finalObj);
    } else {
      setFormData({ ...formData, ...data });
    }

    try {
      let finalFormFields = [...mainFormFields];

      if (id === "supply_route_type") {
        // fetch dynamic options for source and destination

        setLoader(true);
        let source = "",
          destination = "";
        let selectedOption = formField.options.filter(
          (item) => item.value === data[id]
        );
        destination = selectedOption[0]?.destination_type;
        source = selectedOption[0]?.source_type;
        let reqBodyforSource = {
          table_name: "supply_node",
          column_names: ["supply_node_id", "name", "code"],
          filter_condition: [
            {
              filter_id: "type",
              values: [source],
              operator: "IN",
            },
          ],
        };
        let { data: sourceOptionsData } = await props.getDropDownOptions(
          reqBodyforSource
        );
        let sourceOptions = sourceOptionsData.data.map((item) => {
          return {
            label: item.code,
            value: item.supply_node_id,
            ...item,
          };
        });
        let reqBodyforDestination = {
          table_name: "supply_node",
          column_names: ["supply_node_id", "name", "code"],
          filter_condition: [
            {
              filter_id: "type",
              values: [destination],
              operator: "IN",
            },
          ],
        };
        let { data: destinationOptionsData } = await props.getDropDownOptions(
          reqBodyforDestination
        );
        let destinationOptions = destinationOptionsData.data.map((item) => {
          return {
            label: item.code,
            value: item.supply_node_id,
            ...item,
          };
        });
        finalFormFields = finalFormFields.map((item) => {
          if (item.accessor === "source_node") {
            item.options = [...sourceOptions];
          }
          if (item.accessor === "destination_node") {
            item.options = [...destinationOptions];
          }
          return item;
        });
        setMainFormFields(finalFormFields);
      }
      if (id === "destination_node") {
        finalFormFields = finalFormFields.map((item) => {
          if (item.accessor === "source_node") {
            item.options = item.options.filter(
              (item) => data?.[id].indexOf(item.value) === -1
            );
          }
          return item;
        });
      }
      if (id === "source_node") {
        finalFormFields = finalFormFields.map((item) => {
          if (item.accessor === "destination_node") {
            item.options = item.options.filter(
              (item) => item.value !== data?.[id]
            );
          }
          return item;
        });
      }
    } catch (err) {
      handleErrorMessage(ERROR_MESSAGE);
    } finally {
      setLoader(false);
    }
  };
  const handleChangeForBasicForm = async (data, id, formField, e) => {
    setBasicFormData(data);
  };

  const handleGenerateSupplyRouteData = async (selectedNetwork) => {
    let selectedNetworkID = selectedNetwork
      ? selectedNetwork
      : basicFormData.copy_network;
    try {
      let { data } = await props.getNetworkRouteByID(selectedNetworkID);

      let tableRows = data.data[0].routes.map((item) => {
        item.supply_route_type = item.route_type_id;
        item.source_node = item.source_node_id;
        item.destination_node = item.destination_node_id;
        item.shipping_mode = item.shipping_mode;
        item.route_type_name = item.route_type_name;
        item.shipping_mode = item.shipping_mode;
        item.unique_id = `${item.route_type_id}+${item.source_node}+${item.destination_node}+${item.shipping_mode}`;
        item.tempkey = `${item.route_type_id}+${item.source_node}+${item.destination_node}`;
        item.prioritykey = `${item.destination_node}`;

        return item;
      });

      let primaryData = groupRowsByMultipleKeys(tableRows, ["tempkey"]);

      let primaryDataIds = {};
      Object.keys(primaryData).forEach((key) => {
        primaryData[key].forEach((item, index) => {
          primaryDataIds[item.unique_id] = {
            is_primary: index === 0 ? true : false,
            disablePrimary: primaryData[key]?.length > 1 ? false : true,
          };
        });
      });
      tableRows = tableRows.map((item) => {
        item.is_primary = primaryDataIds[item.unique_id]?.is_primary;
        item.disablePrimary = primaryDataIds[item.unique_id]?.disablePrimary;
        return item;
      });
      setSupplyRouteTableData([...tableRows]);
      // tableGridInstance.current.api.setRowData([...tableRows]);
    } catch (err) {}
  };
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        let networkCols = await props.getColumnsAg("table_name=supply_route");

        networkCols = networkCols
          .filter((item) => item.column_name !== "is_primary")
          .map((item) => {
            if (
              item.column_name === "priority" ||
              item.column_name === "lead_time"
            ) {
              item.is_editable = true;
            }
            return item;
          });
        networkCols = agGridColumnFormatter(networkCols);

        let primaryCol = {
          headerName: "Primary Shipping Mode",
          minWidth: 150,
          cellRenderer: (params, extraProps) => {
            return (
              <Checkbox
                color="primary"
                className={classes.checkbox}
                checked={params?.data?.is_primary || false}
                disabled={checkPrimaryRow(params)}
                size="small"
                onClick={(e) => {
                  handleChangeToggle(e, params);
                }}
              />
            );
          },
          editable: false,
          colId: "is_primary",
        };

        let actionCol = {
          headerName: "Action",
          minWidth: 150,
          cellRenderer: (params, extraProps) => {
            return (
              <Button
                size="small"
                variant="outlined"
                title="Edit"
                onClick={(e) => {
                  onDeleteClick(params, e);
                }}
                icon={<Delete fontSize="small" />}
              ></Button>
            );
          },
          editable: false,
          colId: "action",
        };
        networkCols = [...networkCols, primaryCol, actionCol];
        setSupplyRouteTableColumns(networkCols);
      } catch (error) {
        handleErrorMessage(ERROR_MESSAGE);
      }
    };
    const setDropDownOptions = async () => {
      try {
        let basicformFields = [
          {
            accessor: "network_name",
            field_type: "TextField",
            label: "Network Name",
            required: true,
            isDisabled: props.selectedNetwork ? true : false,
          },
          {
            accessor: "copy_network",
            field_type: "dropdown",
            label: "Copy From",
            required: false,
            options: [],
            isSearchable: true,
            isClearable: true,
          },
        ];
        let mainFormField = [
          {
            accessor: "supply_route_type",
            field_type: "dropdown",
            label: "Supply Route Type",
            options: [],
            isMulti: false,
            isSearchable: false,
          },
          {
            accessor: "source_node",
            field_type: "dropdown",
            label: "Source Node",
            options: [],
            isSearchable: true,
          },
          {
            accessor: "destination_node",
            field_type: "dropdown",
            label: "Destination Node",

            options: [],
            isMulti: true,
            isSearchable: true,
          },
          {
            accessor: "shipping_node",
            field_type: "dropdown",
            label: "Shipping Node",
            options: [
              { label: "air", value: "air" },
              { label: "truck", value: "truck" },
              { label: "ship", value: "ship" },
            ],
            // isMulti: true,
            isSearchable: true,
          },
        ];

        let requestBodyForAllNetwork = {
          table_name: "supply_network",
          column_names: ["network_id", "network_name"],
        };
        let { data } = await props.getDropDownOptions(requestBodyForAllNetwork);
        basicformFields[1].options = data.data.map((item) => {
          return { label: item.network_name, value: item.network_id };
        });
        let requestBodyForSupplyRouteType = {
          table_name: "supply_route_definition",
          column_names: [
            "supply_route_id",
            "supply_route_name",
            "source_type",
            "destination_type",
          ],
        };
        let { data: supplyRoutes } = await props.getDropDownOptions(
          requestBodyForSupplyRouteType
        );
        mainFormField[0].options = supplyRoutes.data.map((item) => {
          return {
            label: item.supply_route_name,
            value: item.supply_route_id,
            isDisabled: item.supply_route_name === "Store-Store" ? true : false,
            ...item,
          };
        });

        if (props.selectedNetwork) {
          handleGenerateSupplyRouteData(props.selectedNetwork.network_id);
          setBasicFormData({
            network_name: props.selectedNetwork.network_name,
          });
        }

        setBasicFormFields(basicformFields);
        setMainFormFields(mainFormField);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        setLoader(false);
      }
    };
    fetchFilters();
    setDropDownOptions();

    return () => {
      props.resetSupplyRouteState();
    };
  }, []);

  const handleChangeToggle = (e, params) => {
    let checked = e.target.checked;
    let colId = params.column.colId;
    let totalRows = [];
    params.api.forEachNode((item) => {
      totalRows.push(item.data);
    });

    let primaryRows = totalRows
      .filter((item) => item.tempkey === params.data.tempkey)
      .map((item) => item.tempkey);
    totalRows = totalRows.map((item) => {
      if (primaryRows.indexOf(item.tempkey) > -1) {
        if (item.unique_id === params.data.unique_id) {
          item.is_primary = checked;
        } else {
          item.is_primary = !checked;
        }
      }
      return item;
    });
    setSupplyRouteTableData([...totalRows]);
    tableGridInstance.current.api.setRowData([...totalRows]);
    tableGridInstance.current.api.refreshCells({
      columns: ["priority", "is_primary"],
    });
  };
  const checkPrimaryRow = (params) => {
    return params?.data?.disablePrimary;
  };

  const hasDuplicateKey = (arr, key) => {
    const seen = new Set();

    for (const obj of arr) {
      if (obj.hasOwnProperty(key)) {
        if (seen.has(obj[key])) {
          return true; // Duplicate found
        }
        seen.add(obj[key]);
      }
    }

    return false; // No duplicates found
  };
  const checkValidation = (totalRows) => {
    if (!props.selectedNetwork && !basicFormData.network_name) {
      return {
        error: true,
        message: "Please enter network name.",
      };
    } else {
      let groupedData = groupRowsByMultipleKeys(totalRows, [
        "destination_node",
      ]);

      let priorityIdsfail = {};
      let keys = Object.keys(groupedData).map((key) => key);

      Object.keys(groupedData).every((key) => {
        priorityIdsfail = hasDuplicateKey(groupedData[key], "priority");
        if (priorityIdsfail) {
          return false;
        } else {
          return true;
        }
      });
      if (priorityIdsfail) {
        return {
          error: true,
          message: "There is duplicate Priority.",
        };
      } else {
        return {
          error: false,
          message: "There is duplicate Priority.",
        };
      }
    }
  };
  const handleSaveButton = async () => {
    setTableLoader(true);
    let data = supplyRouteTableData?.map((item) => {
      return {
        route_type_id: item?.supply_route_type,
        source_node_id: item?.source_node,
        destination_node_id: item?.destination_node,
        shipping_mode: item?.shipping_mode,
        is_primary: item?.is_primary,
        priority: item?.priority,
        lead_time: item?.lead_time || 0,
      };
    });
    try {
      const isDataValid = checkValidation(supplyRouteTableData);
      if (isDataValid.error) {
        displaySnackMessages(isDataValid.message, "error");
      } else {
        let payloadData = {
          routes: data,
        };
        let saveNetworkData = {};
        if (props.selectedNetwork) {
          payloadData.network_id = props.selectedNetwork.network_id;

          saveNetworkData = await props.updateNetworkRoute(payloadData);
        } else {
          payloadData.network_name = basicFormData.network_name;
          saveNetworkData = await props.createNetworkRoute(payloadData);
        }
        if (saveNetworkData?.data?.status) {
          displaySnackMessages("Saved Successfully", "success");
          props.closeCreateNewPopup(false);
        }
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setTableLoader(false);
    }
  };

  const groupRowsByMultipleKeys = (array, keys) => {
    return array.reduce((result, item) => {
      let currentLevel = result;

      keys.forEach((key, index) => {
        const groupKey = item[key];

        if (!currentLevel[groupKey]) {
          currentLevel[groupKey] = index === keys.length - 1 ? [] : {}; // Create an object or array at the final level
        }

        if (index === keys.length - 1) {
          currentLevel[groupKey].push(item); // Push item to the final group
        } else {
          currentLevel = currentLevel[groupKey]; // Move deeper in the hierarchy
        }
      });

      return result;
    }, {});
  };

  const onDeleteClick = (params, filteredRows) => {
    let totalRows = [];
    if (Array.isArray(filteredRows)) {
      totalRows = filteredRows;
    } else {
      params.api.forEachNode((item) => {
        totalRows.push(item.data);
      });

      totalRows = totalRows.filter(
        (item) => item.unique_id !== params.data.unique_id
      );
    }
    let groupedData = groupRowsByMultipleKeys(totalRows, [
      "destination_node",
      "source_node",
    ]);
    let primaryData = groupRowsByMultipleKeys(totalRows, ["tempkey"]);
    let priorityIds = {};
    
    //preserve existing priorities for remaining rows
    totalRows.forEach((item) => {
      priorityIds[item.unique_id] = item.priority;
    });

    let primaryDataIds = {};
    Object.keys(primaryData).forEach((key) => {
      primaryData[key].forEach((item, index) => {
        primaryDataIds[item.unique_id] = {
          is_primary: index === 0 ? true : false,
          disablePrimary: primaryData[key]?.length > 1 ? false : true,
        };
      });
    });
    totalRows = totalRows.map((item) => {
      item.priority = priorityIds[item.unique_id];
      if (params.data.is_primary) {
        item.is_primary = primaryDataIds[item.unique_id]?.is_primary;
      }
      item.disablePrimary = primaryDataIds[item.unique_id]?.disablePrimary;

      return item;
    });

    setSupplyRouteTableData([...totalRows]);
    tableGridInstance.current.api.setRowData([...totalRows]);
    tableGridInstance.current.api.refreshCells({
      columns: ["priority", "is_primary"],
    });
  };
  const setLeadTimeValue = (shipNode) => {
    // default lead time values based upon ship mode
    if (shipNode === "air") {
      return 10;
    }
    if (shipNode === "truck") {
      return 20;
    }
    if (shipNode === "ship") {
      return 15;
    }
  };
  const addNewRow = () => {
    let l_newdestination_node_options =
      formData.destination_node_options?.length > 0 ? true : false;

    let l_supply_route_type = formData.supply_route_type ? true : false;
    let l_source_node = formData.source_node ? true : false;
    let l_shipping_mode = formData.shipping_node ? true : false;
    let validate =
      l_shipping_mode &&
      l_newdestination_node_options &&
      l_supply_route_type &&
      l_source_node;
    if (validate) {
      try {
        let newRows = [];
        let finalRows = [];
        newRows = formData.destination_node_options.map((item, index) => {
          return {
            supply_route_type: formData.supply_route_type,
            route_type_name:
              formData.supply_route_type_options[0].supply_route_name,
            source_node: formData.source_node,
            source_node_name: formData.source_node_options[0].code,
            destination_node: item.value,
            destination_node_name: item.label,
            priority: 1,
          };
        });

        let updatedRows = newRows.map((item, index) => {
          let shipping_nodes = formData.shipping_node;
          item.shipping_mode = shipping_nodes;
          item.unique_id = `${item.supply_route_type}+${item.source_node}+${item.destination_node}+${shipping_nodes}`;
          item.tempkey = `${item.supply_route_type}+${item.source_node}+${item.destination_node}`;
          item.prioritykey = `${item.destination_node}+${item.source_node}`;
          item.lead_time = setLeadTimeValue(formData.shipping_node);
          return item;
        });

        finalRows = [...updatedRows];
        let alreadyExits = supplyRouteTableData.map((item) => item.unique_id);

        finalRows = finalRows.filter(
          (item) => alreadyExits.indexOf(item.unique_id) === -1
        );

        let total_rows = [...supplyRouteTableData, ...finalRows];

        let groupedData = groupRowsByMultipleKeys(total_rows, [
          "destination_node",
          "source_node",
        ]);
        let primaryData = groupRowsByMultipleKeys(total_rows, ["tempkey"]);
        let priorityIds = {};
        
        //existing source nodes from supplyRouteTableData and their priorities
        let existingSourceNodePriorities = {};
        let maxExistingPriority = 0;
        
        supplyRouteTableData.forEach(row => {
          if (row.source_node && row.priority) {
            existingSourceNodePriorities[row.source_node] = row.priority;
            maxExistingPriority = Math.max(maxExistingPriority, row.priority);
          }
        });
        
        //unique source nodes from total_rows in order they appear
        let allSourceNodes = [];
        let seenSourceNodes = new Set();
        total_rows.forEach(row => {
          if (!seenSourceNodes.has(row.source_node)) {
            allSourceNodes.push(row.source_node);
            seenSourceNodes.add(row.source_node);
          }
        });

        let sourceNodeToPriority = {};
        let currentPriority = 1;
        
        allSourceNodes.forEach(sourceNode => {
          if (existingSourceNodePriorities[sourceNode]) {
            sourceNodeToPriority[sourceNode] = existingSourceNodePriorities[sourceNode];
          } else {
            //new source node, assign next available priority
            sourceNodeToPriority[sourceNode] = maxExistingPriority + currentPriority;
            currentPriority++;
          }
        });
        
        total_rows.forEach((item) => {
          priorityIds[item.unique_id] = sourceNodeToPriority[item.source_node];
        });
        let primaryDataIds = {};
        Object.keys(primaryData).forEach((key) => {
          primaryData[key].forEach((item, index) => {
            primaryDataIds[item.unique_id] = {
              is_primary: index === 0 ? true : false,
              disablePrimary: primaryData[key]?.length > 1 ? false : true,
            };
          });
        });
        total_rows = total_rows.map((item) => {
          item.priority = priorityIds[item.unique_id];
          item.is_primary = primaryDataIds[item.unique_id]?.is_primary;
          item.disablePrimary = primaryDataIds[item.unique_id]?.disablePrimary;
          return item;
        });

        setSupplyRouteTableData([...total_rows]);
        tableGridInstance.current.api.setRowData([...total_rows]);
        tableGridInstance.current.api.refreshCells({
          columns: ["priority", "is_primary"],
        });
      } catch (err) {
        displaySnackMessages("Error while adding rows", "error");
      }
    } else {
      displaySnackMessages("please Enter values in the all the field", "error");
    }
  };
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };
  const onDeleteProduct = () => {
    let filteredRows = [];
    let totalRows = tableGridInstance.current.api
      .getRenderedNodes()
      .map((item) => {
        return item.data;
      });
    let selectedRows = selectedRow.map((item) => item.unique_id);
    filteredRows = totalRows.filter(
      (item) => selectedRows.indexOf(item.unique_id) === -1
    );
    onDeleteClick(null, filteredRows);
  };
  const getTopRightOptions = () => {
    return [
      <Button
        variant="primary"
        size="large"
        disabled={selectedRow?.length > 0 ? false : true}
        onClick={() => setOpenSetAll(true)}
      >
        Set All
      </Button>,
      <Button
        variant="tertiary"
        id="delete-rules"
        size="large"
        onClick={onDeleteProduct}
        title={"Delete Rules"}
        disabled={selectedRow?.length > 0 ? false : true}
      >
        <DeleteIcon />
      </Button>,
    ];
  };
  const onSelectionChanged = (data) => {
    let selectedRows = [];
    tableGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0)
        node.selected &&
          selectedRows.push({
            ...node.data,
          });
    });
    setSelectedRows(selectedRows);
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (colDef.column_name === "priority") {
      if (newValue > supplyRouteTableData.length) {
        const correctedValue = supplyRouteTableData.length;
        data.priority = correctedValue;
        tableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: [
            "priority"
          ],
        });

        displaySnackMessages(
          `Priority value cannot exceed ${supplyRouteTableData.length}. Value has been set to ${correctedValue}.`,
          "error"
        );
      }
    }
  };

  return (
    <>
      {" "}
      <Typography variant="h5" gutterBottom>
        Create New Network
      </Typography>
      <Loader loader={loader} minHeight="100px">
        <div className={classes.basicForm}>
          <div>
            <Form
              layout={"vertical"}
              maxFieldsInRow={2}
              handleChange={handleChangeForBasicForm}
              fields={basicFormField}
              updateDefaultValue={false}
              defaultValues={basicFormData}
              labelWidthSpan={4}
              spacing={1}
            ></Form>
          </div>
          {basicFormData?.copy_network && (
            <div className={classes.button}>
              <Button
                variant="primary"
                id="scenarioApplyBtn"
                onClick={() => handleGenerateSupplyRouteData()}
              >
                Apply
              </Button>
            </div>
          )}
        </div>

        <div className={classes.mainForm}>
          <div>
            <Form
              layout={"vertical"}
              maxFieldsInRow={5}
              handleChange={handleChange}
              fields={mainFormFields}
              updateDefaultValue={false}
              defaultValues={formData}
              labelWidthSpan={4}
              spacing={1}
            ></Form>
          </div>
          <div className={classes.button}>
            <Button variant="primary" onClick={() => addNewRow()}>
              + Add New
            </Button>
          </div>
        </div>
      </Loader>
      <Loader loader={tableLoader} minHeight={"260px"}>
        <div className={classNames(globalClasses.marginVertical1rem)}>
          <AgGridComponent
            columns={supplyRouteTableColumns}
            rowdata={supplyRouteTableData}
            selectAllHeaderComponent={true}
            hideSelectAllRecords={true}
            topRightOptions={getTopRightOptions()}
            // pagination={true}
            uniqueRowId={"unique_id"}
            onSelectionChanged={(data) => onSelectionChanged(data)}
            sizeColumnsToFitFlags
            loadTableInstance={loadTableInstance}
            onCellValueChanged={onCellValueChanged}
          />
        </div>

        {openSetAll && (
          <SetAllModal
            tableGridInstance={tableGridInstance}
            tableHeader={"Supply-Routes"}
            displaySnackMessages={displaySnackMessages}
            onCancel={() => {
              setOpenSetAll(false);
            }}
          />
        )}
      </Loader>
      <div className={classes.basicForm}>
        <Button
          variant="primary"
          disabled={supplyRouteTableData.length === 0}
          onClick={() => handleSaveButton()}
        >
          Save
        </Button>
        <div className={classes.button}>
          <Button
            variant="primary"
            id="scenarioApplyBtn"
            className={classes.button}
            onClick={() => props.closeCreateNewPopup(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getDropDownOptions: (payload) => dispatch(getDropDownOptions(payload)),
  getNetworkRouteByID: (payload) => dispatch(getNetworkRouteByID(payload)),
  createNetworkRoute: (payload) => dispatch(createNetworkRoute(payload)),
  updateNetworkRoute: (payload) => dispatch(updateNetworkRoute(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
});

export default connect(null, mapDispatchToProps)(CreateNewSupplyRoutePopUp);
