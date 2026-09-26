import {
  Button,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { useConstraintsStyles } from "./constraints-style";
import { checkValidation } from "./config";
import Table from "./view-table";
import StoreModalTable from "./store-table";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty, min } from "lodash";
import {
  getStoreTableData,
  getStoreGradeTableData,
  saveStoreTableData,
  setConstraintsLoader,
  getStoreGroupTableData,
  setAllTableData,
  getStoreGradeAggregateData,
  getStoreGroupAggregateData,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  tableArticleFilter,
  tableStoreCodeFilter,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import SetallMultirowForm from "core/Utils/agGrid/setall-multirow-form";
import { fetchGradeListInventory } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";

const ConstraintsTables = (props) => {
  const [dimension, setDimension] = useState("store");
  const [finalColumn, updatefinalColumn] = useState([]);
  const [storeColumns, setStoreColumn] = useState([]);
  const [storeGradeColumn, setStoreGradeColumn] = useState([]);
  const [storeGroupColumn, setStoreGroupColumn] = useState([]);
  const [tableInstance, setTableInstance] = useState(null);
  const [showStoreModalTable, updateShowStoreModalTable] = useState(false);
  const [clickedRowData, updateClickedRowData] = useState([]);
  const [editedRows, setEditedRows] = useState([]);
  const [editedStoreGradeRows, setEditedStoreGradeRows] = useState([]);
  const [storeFilterBody, setStoreFilterBody] = useState([]);
  const [editableSetAllFields, setEditableSetAllFields] = useState([]);

  const [editedStoreGroupRows, setEditedStoreGroupRows] = useState([]);
  const [showloading, setShowloading] = useState(false);
  const [viewBy, setViewBy] = useState([]);
  const [setAll, toggleSetAll] = useState(false);

  const offsetValues = useRef({});
  const classes = useConstraintsStyles();
  const filterDependencies = useRef({});
  const showEmptyRows = useRef({});
  const dimensionValue = useRef({});
  const setNewTableInstance = (params) => {
    setTableInstance(params);
  };
  const storePopupClick = (params) => {
    let finalCellData = params.cellData.node?.parent?.data
      ? { ...params.cellData.node.parent.data, ...params.cellData.data }
      : params.cellData.data;
    updateClickedRowData(finalCellData);
    updateShowStoreModalTable(true);
  };

  const setDynamicRenderer = (cellProps, extraProps, item) => {
    if (cellProps.node.level > 0) {
      return (
        <CellRenderers
          cellData={cellProps}
          column={item}
          extraProps={extraProps}
          // actions={actions}
        ></CellRenderers>
      );
    }
    return " ";
  };

  const setStoreGradeCols = (columns) => {
    return columns.map((item) => {
      if (item.type === "link") {
        item.onClick = storePopupClick;
      }
      if (
        item.accessor === "min_store" ||
        item.accessor === "max_store" ||
        item.accessor === "wos"
      ) {
        item.cellRenderer = (cellProps, extraProps) => {
          return setDynamicRenderer(cellProps, extraProps, item);
        };
      }
      if (item.accessor === "article") {
        item.cellRenderer = "agGroupCellRenderer";
      }
      return item;
    });
  };

  useEffect(() => {
    setShowloading(true);
    const setTableConfig = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_store_list"
      );
      let storeGradeCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_sg_list"
      );
      let storeGroupCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_sgs_list"
      );
      let viewBySegment = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_view_by"
      );
      viewBySegment = viewBySegment.map((item) => {
        return {
          label: item.label,
          value: item.column_name,
        };
      });

      storeGroupCols = setStoreGradeCols(storeGroupCols);
      storeGradeCols = setStoreGradeCols(storeGradeCols);
      //  modifying table config, if the logged user does not have edit permission make editable fields non editable
      let permissionCheck = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
        "edit"
      );
      if (!permissionCheck) {
        storeCols.forEach((item) => {
          if (item.is_editable) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
        storeGradeCols.forEach((item) => {
          if (
            ["wos", "min_store", "max_store"].indexOf(item.column_name) > -1
          ) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
        storeGroupCols.forEach((item) => {
          if (
            ["wos", "min_store", "max_store"].indexOf(item.column_name) > -1
          ) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
      }

      if (props.isRedirectedFromDifferentPage) {
        localStorage.removeItem("selectedFiltersDependency");
        localStorage.removeItem("selectedArticles");
        localStorage.removeItem("storeCodes");
      }
      editableFieldsList(storeCols);

      updatefinalColumn(storeCols);
      setStoreColumn(storeCols);
      setStoreGradeColumn(storeGradeCols);
      setStoreGroupColumn(storeGroupCols);
      setViewBy(viewBySegment);
      setShowloading(false);
    };
    setTableConfig();
    dimensionValue.current = "store";
  }, []);

  const dimensionHandleChange = (event) => {
    let finalCols = setColumn(event.target.value);
    updatefinalColumn(finalCols);
    setEditedRows([]);
    setEditedStoreGradeRows([]);
    setDimension(event.target.value);
    dimensionValue.current = event.target.value;
  };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const setColumn = (updatedDimension) => {
    let finalDimension = updatedDimension ? updatedDimension : dimension;
    switch (finalDimension) {
      case "store":
        return storeColumns;
      case "store_group":
        return storeGroupColumn;
      case "store_grade":
        return storeGradeColumn;
      default:
        return storeColumns;
    }
  };
  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencies.current = props.filterDependency;
      tableInstance?.api?.refreshServerSideStore({ purge: true });
    } else {
      filterDependencies.current = {};
    }
  }, [props.filterDependency]);

  const setRequestBody = (manualbody, pageIndex, filterDependencyBody) => {
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };

    let payloadFilter = filterDependencies.current;
    if (pageIndex === 0 && props.isRedirectedFromDifferentPage) {
      let articleFilter = tableArticleFilter;
      let storeCodeFilter = tableStoreCodeFilter;

      const isArticleFilterApplied = payloadFilter.find(
        (filter) => filter.attribute_name === articleFilter.attribute_name
      );
      const isStoreCodeFilterApplied = payloadFilter.find(
        (filter) => filter.attribute_name === storeCodeFilter.attribute_name
      );

      if (!isArticleFilterApplied) {
        articleFilter.values = [...props.selectedConstraintArticles];

        articleFilter?.values?.length > 0 && payloadFilter.push(articleFilter);
      }

      if (!isStoreCodeFilterApplied) {
        storeCodeFilter.values = [...props.selectedStoreCodes];

        storeCodeFilter?.values?.length > 0 &&
          payloadFilter.push(storeCodeFilter);
      }
    }
    let limit =
      Object.keys(offsetValues.current).length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetValues.current }
        : { limit: 10, page: pageIndex + 1 };
    return {
      filters: payloadFilter,
      meta: {
        ...manualFilterbody,
        limit,
      },
    };
  };

  const manualCallBackStore = async (manualbody, pageIndex, params) => {
    try {
      let reqBody = setRequestBody(
        manualbody,
        pageIndex,
        props.filterDependencyBody
      );
      if (isEmpty(showEmptyRows?.current)) {
        let { data: storeData } = await props.getStoreTableData(
          "store",
          reqBody
        );
        storeData.data.table_data = storeData?.data?.table_data.map((item) => {
          item.uniqueKey = `${item.product_code} + ${item.store_code}`;
          return item;
        });
        if (storeData.data?.table_config) {
          let col = agGridColumnFormatter(
            storeData.data?.table_config,
            null,
            null
          );

          let permissionCheck = canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
            "edit"
          );
          if (!permissionCheck) {
            col.forEach((item) => {
              if (item.is_editable) {
                item.is_editable = false;
                item.editable = false;
                item.cellRenderer = null;
              }
            });
          }
          setStoreColumn(col);
          if (dimensionValue.current === "store") {
            updatefinalColumn(col);
          }
        }
        let formattedData = agGridRowFormatter(
          storeData.data.table_data,
          params?.api?.checkConfiguration,
          "uniqueKey"
        );
        let manualFilterbody = manualbody
          ? manualbody
          : { range: [], sort: [], search: [] };

        offsetValues.current = {
          offset: storeData.data.offset,
          sub_offset: storeData.data.sub_offset,
        };

        setStoreFilterBody(manualFilterbody);
        showEmptyRows.current = {};
        return {
          data: formattedData,
          // totalCount: storeData?.total
        };
      } else {
        showEmptyRows.current = {};
        return {
          data: [],
          // totalCount: storeData?.total
        };
      }
    } catch (err) {
      return { data: [], totalCount: 0 };
    }
  };

  const manualCallBackStoreGroup = async (
    manualbody,
    pageIndex,
    filterDependencyBody
  ) => {
    try {
      let reqBody = setRequestBody(manualbody, pageIndex, filterDependencyBody);
      reqBody.application_code = 1;
      let { data: storeData } = await props.getStoreGroupTableData(reqBody);
      storeData.data.data = storeData.data.data.map((item) => {
        item.sub_row = true;
        return item;
      });
      offsetValues.current = {
        offset: storeData.data.offset,
        sub_offset: storeData.data.sub_offset,
      };

      return { data: storeData.data.data, totalCount: storeData?.total };
    } catch (err) {
      return { data: [], totalCount: 0 };
    }
  };

  const manualCallBackStoreGrade = async (
    manualbody,
    pageIndex,
    filterDependencyBody
  ) => {
    try {
      let reqBody = setRequestBody(manualbody, pageIndex, filterDependencyBody);
      let { data: storeData } = await props.getStoreGradeTableData(reqBody);
      storeData.data.data = storeData.data.data.map((item) => {
        item.sub_row = true;
        return item;
      });
      offsetValues.current = {
        offset: storeData.data.offset,
        sub_offset: storeData.data.sub_offset,
      };
      return { data: storeData.data.data, totalCount: storeData?.total };
    } catch (err) {
      return { data: [], totalCount: 0 };
    }
  };

  const onCellValueChanged = (params) => {
    checkValidation(params.data, params);

    setEditedRows((editedRows) => {
      let updatedRows = [];
      if (editedRows.length > 0) {
        let checkAlreadyExists = editedRows.some(
          (item) =>
            item.store_code === params.data.store_code &&
            item.product_code === params.data.product_code
        );
        if (checkAlreadyExists) {
          updatedRows = editedRows.map((item) => {
            if (
              item.store_code === params.data.store_code &&
              item.product_code === params.data.product_code
            ) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };

  const onBlur = async (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    cellData,
    tableType
  ) => {
    if (tableType === "store") {
      onCellValueChanged(cellData);
    } else if (tableType === "store_grade") {
      onStoreGradeCellValueChanged(cellData);
    } else if (tableType === "store_group") {
      onStoreGroupCellValueChanged(cellData);
    }
  };

  const setPostRequestBody = (arr, storeLevel) => {
    return arr.map((item) => {
      return {
        product_code: item.product_code,
        min: Number(item.min_store),
        wos: Number(item.wos),
        max: Number(item.max_store),
        stores: storeLevel ? [item.store_code] : item.store_codes,
      };
    });
  };

  const onSaveRequest = async () => {
    props.setConstraintsLoader(true);
    try {
      let reqBody = [];
      if (editedRows.length > 0) {
        reqBody = setPostRequestBody(editedRows, true);
      } else if (editedStoreGradeRows.length > 0) {
        reqBody = setPostRequestBody(editedStoreGradeRows);
      } else if (editedStoreGroupRows.length > 0) {
        reqBody = setPostRequestBody(editedStoreGroupRows);
      }
      if (reqBody.length > 0) {
        await props.saveStoreTableData({ data: reqBody });
        displaySnackMessages("Data saved successfully", "success");
        setEditedRows([]);
        setEditedStoreGradeRows([]);
        setEditedStoreGroupRows([]);
        tableInstance.api.refreshServerSideStore({ route: [], purge: true });
      } else {
        displaySnackMessages("No change to save", "error");
      }
      props.setConstraintsLoader(false);
    } catch (err) {
      props.setConstraintsLoader(false);
      displaySnackMessages("Error while saving", "error");
    }
  };

  const onStoreGradeCellValueChanged = (params) => {
    checkValidation(params.data, params);

    setEditedStoreGradeRows((editedStoreGradeRows) => {
      let updatedRows = [];
      if (editedStoreGradeRows.length > 0) {
        let checkAlreadyExists = editedStoreGradeRows.some(
          (item) =>
            item.store_grade === params.data.store_grade &&
            item.product_code === params.data.product_code
        );
        if (checkAlreadyExists) {
          updatedRows = editedStoreGradeRows.map((item) => {
            if (
              item.store_grade === params.data.store_grade &&
              item.product_code === params.data.product_code
            ) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedStoreGradeRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };
  const modalClose = (success) => {
    if (success) {
      tableInstance.api.refreshServerSideStore({ route: [], purge: true });
    }
    updateShowStoreModalTable(false);
  };

  const setAllRequest = () => {
    let checkSelection =
      tableInstance?.api?.getSelectedNodes()?.length > 0 ? true : false;
    if (checkSelection) {
      toggleSetAll(true);
      // tableInstance.trigerSetAll(true);
      // let selectAllFlag = checkSetAllFlag();
      // selectAllFlag
      //   ? tableInstance.trigerSetAll(true)
      //   : displaySnackMessages(
      //       "Set all is not valid for whole data set",
      //       "error"
      //     );
    } else {
      displaySnackMessages("Please select atleast one row", "error");
    }
  };

  const checkSetAllFlag = () => {
    let flag = false;
    if (tableInstance && tableInstance?.api?.checkConfiguration?.length > 1) {
      flag =
        tableInstance.api?.checkConfiguration[
          tableInstance.api?.checkConfiguration?.length - 2
        ].checkAll;
    }
    return !flag;
  };

  const onStoreGroupCellValueChanged = (params) => {
    checkValidation(params.data, params);
    setEditedStoreGroupRows((editedStoreGroupRows) => {
      let updatedRows = [];
      if (editedStoreGroupRows.length > 0) {
        let checkAlreadyExists = editedStoreGroupRows.some(
          (item) =>
            item.store_group_name === params.data.store_group_name &&
            item.product_code === params.data.product_code
        );
        if (checkAlreadyExists) {
          updatedRows = editedStoreGroupRows.map((item) => {
            if (
              item.store_group_name === params.data.store_group_name &&
              item.product_code === params.data.product_code
            ) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedStoreGroupRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };

  const onSetAllApply = async (rows, params) => {
    try {
      setShowloading(true);
      let checkAll =
        params.api.checkConfiguration.length > 1
          ? params.api.checkConfiguration[
              params.api.checkConfiguration.length - 2
            ].checkAll
          : false;
      if (checkAll) {
        let reqBody = {
          filters: props.filterDependency,
          meta: storeFilterBody,
          values: {
            min: rows.min_store ? Number(rows.min_store) : null,
            wos: rows.wos ? Number(rows.wos) : null,
            max: rows.max_store ? Number(rows.max_store) : null,
          },
        };
        await props.setAllTableData(reqBody);
        showEmptyRows.current = { showEmptyRows: true };
        setShowloading(false);
        tableInstance.api.deselectAll(true);
        tableInstance.api.refreshServerSideStore({ purge: true });
        return {
          message:
            "Saved request is running in background. Please refresh the table once a notification is received",
          type: "info",
        };
      } else {
        let reqBody = params.api.getSelectedNodes().map((item) => {
          let row = item.data;
          return {
            product_code: row.product_code,
            min: rows.min_store ? Number(rows.min_store) : row.min_store,
            wos: rows.wos ? Number(rows.wos) : row.wos,
            max: rows.max_store ? Number(rows.max_store) : row.max_store,
            stores: [row.store_code],
          };
        });
        await props.saveStoreTableData({ data: reqBody });
        setShowloading(false);
        tableInstance.api.deselectAll(true);
        tableInstance.api.refreshServerSideStore({ purge: true });
        return { message: "Data saved successfully" };
      }
    } catch (err) {
      setShowloading(false);
      displaySnackMessages("Error while saving", "error");
    }
  };
  const checkFlagEdit = () => {
    if (dimension === "store_grade") {
      return editedStoreGradeRows.some(
        (item) =>
          item.store_grade === clickedRowData.store_grade &&
          item.product_code === clickedRowData.product_code
      );
    }
    if (dimension === "store_group") {
      return editedStoreGroupRows.some(
        (item) =>
          item.store_group_name === clickedRowData.store_group_name &&
          item.product_code === clickedRowData.product_code
      );
    }
  };

  const setAggregateBody = (params) => {
    return {
      filters: filterDependencies.current,
      product_code: params.parentNode.data.product_code,
      article: params.parentNode.data.article,
    };
  };
  const getStoreGradeSubRowsRequest = async (params) => {
    let reqBody = setAggregateBody(params);
    let { data } = await props.getStoreGradeAggregateData(reqBody);
    return {
      data: data.data,
      totalCount: data.data?.length || 0,
    };
  };
  const getStoreGroupSubRowsRequest = async (params) => {
    let reqBody = setAggregateBody(params);
    reqBody.application_code = 1;
    let { data } = await props.getStoreGroupAggregateData(reqBody);
    return {
      data: data.data,
      totalCount: data.data?.length || 0,
    };
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };
  const editableFieldsList = async (cols) => {
    const cloneStoreColumns = cloneDeep(cols);
    let editableFields = cloneStoreColumns.filter(
      (item) => !item.is_hidden && item.is_editable && !item.system_field
    );

    editableFields = editableFields.map((item) => {
      if (item.type === "int") {
        item.type = "IntegerField";
        // item.disablePast = false; //making it to false as per signet's requirement
      }
      return item;
    });
    const { data } = await fetchGradeListInventory();
    let store_gradeField = {
      accessor: "grade",
      column_name: "grade",
      label: "Store Grade",
      type: "list",
      isMulti: false,
    };

    store_gradeField.options = data.data.map((item) => {
      return {
        label: item.name,
        id: item.name,
        value: item.name,
      };
    });
    editableFields.push(store_gradeField);
    setEditableSetAllFields([
      {
        fields: editableFields,
        addRowLabel: "Add Store Grade",
        id: "grade",
        rowCount: 0,
        hideRowLabel: false,
      },
    ]);
    return [
      {
        fields: editableFields,
        addRowLabel: "Add Store_grade",
        id: "grade",
        rowCount: 0,
        hideRowLabel: false,
      },
    ];
  };
  const onNewSetAllApply = async (rows, params) => {
    let storeGradeFlag = false;
    let selectedGrades = rows.map((item) => item.grade);
    storeGradeFlag = selectedGrades.some((element, index) => {
      return selectedGrades.indexOf(element) !== index;
    });
    if (storeGradeFlag) {
      displaySnackMessages(
        "Please enter unique values in store grade",
        "error"
      );
      throw Error("Date is not  correct");
    } else {
      let checkAll =
        tableInstance.api.checkConfiguration.length > 1
          ? tableInstance.api.checkConfiguration[
              tableInstance.api.checkConfiguration.length - 2
            ].checkAll
          : false;
      let reqBody = null;
      if (checkAll) {
        reqBody = {
          filters: props.filterDependency,
          meta: storeFilterBody,
          values: rows.map((item) => {
            return {
              min: item.min_store,
              max: item.max_store,
              wos: item.wos,
              store_grade: item.grade ? item.grade : "",
            };
          }),
        };
      } else {
        let selectedRowsCode = tableInstance.api
          .getSelectedNodes()
          .map((item) => {
            return item.data.mapping_code;
          });

        let selected_rows = {
          attribute_name: "mapping_code",
          dimension: "custom",
          filter_type: "cascaded",
          operator: "in",
          system_filter: true,
          values: selectedRowsCode,
        };
        reqBody = {
          filters: [...props.filterDependency, selected_rows],
          meta: storeFilterBody,
          values: rows.map((item) => {
            return {
              min: item.min_store,
              max: item.max_store,
              wos: item.wos,
              store_grade: item.grade ? item.grade : "",
            };
          }),
        };
      }
      await props.setAllTableData(reqBody);
      setShowloading(false);
      tableInstance.api.refreshServerSideStore({ purge: true });
      toggleSetAll(false);
      displaySnackMessages(
        "Saved request is running in background. Please refresh the table once a notification is received",
        "info"
      );
    }
  };
  const formatSetAllData = (input, fieldRowId) => {
    let setAllOutput = [];
    for (let i = 0; i <= fieldRowId; i++) {
      const unique_delimiter = "_" + i;
      let row = {};
      Object.keys(input).forEach((key) => {
        if (key.endsWith(unique_delimiter)) {
          let finalKey = key.replace(unique_delimiter, "");
          row[finalKey] = input[key];
        }
      });
      setAllOutput.push(row);
    }

    return setAllOutput;
  };
  return (
    <div className={classes.paddingContent}>
      <CustomAccordion label="Store Data" defaultExpanded={true}>
        <LoadingOverlay loader={showloading}>
          {viewBy.length > 0 && (
            <div className={classes.constraintsToolbar}>
              <Grid
                className={classes.radioBtnsHeader}
                container
                direction="row"
                alignItems="center"
              >
                <span>View By : </span>
                <RadioGroup
                  row
                  aria-label="gender"
                  name="controlled-radio-buttons-group"
                  value={dimension}
                  onChange={dimensionHandleChange}
                >
                  {viewBy.map((item) => {
                    return (
                      <FormControlLabel
                        value={item.value}
                        control={<Radio color="primary" />}
                        label={item.label}
                      />
                    );
                  })}
                </RadioGroup>
              </Grid>
              {dimension === "store" && (
                <div>
                  <Button
                    onClick={setAllRequest}
                    color="primary"
                    variant="contained"
                    disabled={
                      !canTakeActionOnModules(
                        INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
                        "edit"
                      )
                    }
                  >
                    Set All
                  </Button>
                </div>
              )}
            </div>
          )}
          {setAll && (
            <SetallMultirowForm
              updateDefaultValue={false}
              setDefaultDateFieldValues={true}
              onApply={onNewSetAllApply}
              fieldList={editableSetAllFields}
              handleModalClose={() => toggleSetAll(false)}
              formatMultiRowData={formatSetAllData}
              // additionalContainer={
              //   isMultipleStatus && (
              //     <ConflictResolutionModal
              //       resolutionType={resolutionType}
              //       setResolutionType={setResolutionType}
              //     />
              //   )
              // }
              maxFieldsInRow={4}
              isMultipleStatus={true}
            />
          )}
          {finalColumn.length > 0 && (
            <Table
              columns={finalColumn}
              loadTableInstance={setNewTableInstance}
              dimension={dimension}
              manualCallBackStore={manualCallBackStore}
              manualCallBackStoreGrade={manualCallBackStoreGrade}
              manualCallBackStoreGroup={manualCallBackStoreGroup}
              onBlur={onBlur}
              onSetAllApply={onSetAllApply}
              getStoreGradeSubRowsRequest={getStoreGradeSubRowsRequest}
              getStoreGroupSubRowsRequest={getStoreGroupSubRowsRequest}
              inventorysmartModulesPermission={
                props.inventorysmartModulesPermission
                  ?.inventorysmart_constraints
              }
            />
          )}
          {showStoreModalTable && (
            <StoreModalTable
              formvalues={clickedRowData}
              displaySnackMessages={displaySnackMessages}
              onCancel={modalClose}
              flagEdit={checkFlagEdit()}
              canTakeActionOnModules={canTakeActionOnModules}
            />
          )}
          <div className={classes.footer}>
            <Button
              onClick={() => {
                onSaveRequest();
              }}
              color="primary"
              variant="contained"
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
                  "create"
                )
              }
            >
              Apply
            </Button>
          </div>
        </LoadingOverlay>
      </CustomAccordion>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedConstraintArticles:
      store.inventorysmartReducer.inventorySmartConstraints
        .selectedConstraintArticles,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    selectedStoreCodes:
      store.inventorysmartReducer.inventorySmartConstraints.selectedStoreCodes,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setConstraintsLoader: (payload) => dispatch(setConstraintsLoader(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreTableData: (dimension, payload) =>
    dispatch(getStoreTableData(dimension, payload)),
  getStoreGradeTableData: (payload) =>
    dispatch(getStoreGradeTableData(payload)),
  getStoreGroupTableData: (payload) =>
    dispatch(getStoreGroupTableData(payload)),
  setAllTableData: (payload) => dispatch(setAllTableData(payload)),
  saveStoreTableData: (payload) => dispatch(saveStoreTableData(payload)),
  getStoreGradeAggregateData: (payload) =>
    dispatch(getStoreGradeAggregateData(payload)),
  getStoreGroupAggregateData: (payload) =>
    dispatch(getStoreGroupAggregateData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ConstraintsTables);
