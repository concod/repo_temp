import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { capitalize, cloneDeep, uniqueId } from "lodash";
import { Button } from "impact-ui";
import { Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ReactSelect from "core/Utils/select";
import { getFilterDimensions } from "core/actions/filterAction";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { FILTER_TYPES, FORM_CONSTANT_FIELDS } from "config/constants";
import AgGrid from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";

export const ConfigurationTable = (props) => {
  const globalClasses = globalStyles();
  const {
    dimension,
    subDimension,
    filterOptions,
    savedFilters,
    tableColumnConfig,
  } = { ...props };
  const [selectedSubDimension, setSelectedSubDimension] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [columnConfig, setColumnConfig] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [instanceLoaded, setInstanceLoaded] = useState(false);
  const [savedFiltersUpdated, setSavedFiltersUpdated] = useState(false);
  const tableInstance = useRef();

  /**
   * @function
   * @description Update ref object with table insance
   * @param {Object} instance
   */
  const loadTableInstance = (instance) => {
    tableInstance.current = instance;
    setInstanceLoaded(true);
  };

  /**
   * @function
   * @description Handle first load and setup table and  callbacks to parent to ensure smooth transition
   */
  useEffect(() => {
    setupTableColumns();
    if (props.getValidationFunc) {
      props.getValidationFunc(saveFilterConfigurationChanges);
    }
  }, [rowData]);

  /**
   * @function
   * @description Update table data after columns and table instance is loaded
   */
  useEffect(() => {
    if (columnConfig.length && instanceLoaded && !savedFiltersUpdated) {
      getInitialSetup();
    }
  }, [columnConfig, instanceLoaded]);

  /**
   * @function
   * @description Create a generic dropdown option object
   * @param {String} label
   * @param {String|Number} value
   * @param {String|Number} id
   * @returns {Object}
   */
  const createDropdownObject = (label, value, id) => ({
    label,
    value,
    id,
  });

  /**
   * @function
   * @description Fetch table configuration to setup table columns respective dimension
   */
  const setupTableColumns = () => {
    const colConfig = cloneDeep(tableColumnConfig).map((column) => {
      let config = column;
      switch (config.column_name) {
        case "column_name":
          // Create and assign options array for column_name col defs
          config.options = cloneDeep(filterOptions).map((option) =>
            createDropdownObject(
              option.label,
              option.column_name,
              option.column_name
            )
          );
          break;
        case "display_type":
          // Create and assign options array for display_type col defs using predefined input types
          config.options = FORM_CONSTANT_FIELDS.map((field) =>
            createDropdownObject(
              capitalize(field.replace(/[^\w ]/, " ")),
              field,
              field
            )
          );
          break;
        case "filter_type":
          config.options = FILTER_TYPES;
          break;
        case "level":
        case "display_order":
          if (rowData.length > 0) {
            config.options = updateLevels(rowData);
          }
          break;
      }
      return config;
    });
    setColumnConfig(
      agGridColumnFormatter(colConfig, {}, {}, false, null, false)
    );
  };

  /**
   *
   * @param {array} updatedTableData
   * @returns updated array
   * This function generate level numbers for the number of rows present in the table
   * For example, if there are 3 rows, then this function would return [1,2,3]
   */
  const updateLevels = (updatedTableData) => {
    return updatedTableData?.map((_row, idx) =>
      createDropdownObject(idx + 1 + "", idx + 1, idx + 1)
    );
  };

  /**
   * @function
   * @description Update saved values and prepopulate values to table
   */
  const getInitialSetup = async () => {
    const savedRows = cloneDeep(savedFilters).map((item) => {
      return {
        ...item,
        checkbox_disabled: item.is_hierarchy,
        filter_type: item.type,
        row_id: uniqueId(),
        disableEditSelection: item.is_hierarchy,
      };
    });
    setRowData(savedRows);
    updateDropdownValues(savedRows);
    forceUpdateTable();
    setSavedFiltersUpdated(true);
  };

  /**
   * @function
   * @description Handle selections from table
   * @param {Object} event
   */
  const onSelectionChangeHandler = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  /**
   * @function
   * @description Handle change of Sub-Dimension
   * @param {change} change
   */
  const onSubDimensionChange = (change) => {
    setSelectedSubDimension([change]);
  };

  /**
   * @function
   * @description Add new row to the tabel configuration
   */
  const addNewRow = () => {
    const newRow = cloneDeep({
      column_name: null,
      display_type: null,
      filter_type: null,
      dimension: dimension,
      is_mandatory: false,
      display_order: rowData.length + 1,
      is_disabled: false,
      is_clearable: false,
      row_id: uniqueId(),
    });

    setRowData([...rowData, newRow]);
    updateDropdownValues([...rowData, newRow]);
  };

  /**
   * @function
   * @description Update Column data based on the rowdata updated
   * @param {Array} updatedRowData
   */
  const updateDropdownValues = (updatedRowData) => {
    if (columnConfig?.length) {
      let updatedColumns = cloneDeep(columnConfig);
      const hiddenCols = tableInstance?.current.columnApi
        .getColumnState()
        .filter((col) => col.hide === true);
      updatedColumns.forEach((item) => {
        if (item.accessor === "display_order") {
          item.options = updateLevels(updatedRowData);
        }
        item.is_hidden = hiddenCols.some((col) => col.colId === item.accessor);
        return item;
      });
      setColumnConfig(
        agGridColumnFormatter(updatedColumns, {}, {}, false, null, false)
      );
      forceUpdateTable();
    }
  };

  /**
   * @function
   * @description Handle Preview of the filter configuration configured after validation
   */
  const handlePreview = () => {
    if (!isValidTableData()) {
      return false;
    }
  };

  /**
   * @function
   * @description Update table cells
   */
  const forceUpdateTable = () => {
    tableInstance?.current?.api.refreshCells({
      force: true,
    });
  };

  /**
   * @function
   * @description Handle change of cell values and dynamic changes of cell Data
   * @param {Object} event
   */
  const onCellValueChangeHandler = async (event) => {
    const columnId = event.column.colId;
    const initialValue = event.oldValue;
    const value = event.value;
    const rowIndex = event.rowIndex;
    let cols = rowData.map((item) => {
      if (item.accessor === "display_order") {
        item.options = updateLevels(rowData);
      }
      return item;
    });
    setRowData(cols);
    switch (columnId) {
      case "level":
      case "display_order":
        handleUniqueVal(initialValue, value, columnId, rowIndex);
        break;
      case "column_name":
        if (initialValue === value) {
          break;
        }
        const allSelectedValues = rowData.map((data) => data.column_name);
        const index = allSelectedValues.indexOf(value);
        // remove the lastest value addition and check for any access duplicates
        if (index > -1) {
          allSelectedValues.splice(index, 1);
        }
        // If duplicates found revert back to old value else new value.
        if (allSelectedValues.includes(value)) {
          props.addSnack({
            message: "Please select a unique filter combination.",
            options: {
              variant: "error",
            },
          });
          setRowData((old) =>
            old.map((row, index) => {
              if (index === rowIndex) {
                return {
                  ...row,
                  [columnId]: initialValue,
                };
              }
              return row;
            })
          );
        } else {
          setRowData((old) =>
            old.map((row, index) => {
              if (index === rowIndex) {
                return {
                  ...row,
                  [columnId]: value,
                  ["label"]: filterOptions.filter(
                    (option) => option.column_name === value
                  )[0].label,
                };
              }
              return row;
            })
          );
        }
        break;
      default:
        setRowData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...row,
                [columnId]: value,
              };
            }
            return row;
          })
        );
    }
    forceUpdateTable();
  };

  /**
   * @function
   * @description Update display order when one of the dropdowns get updated
   * @param {Number} initialValue
   * @param {Number} value
   * @param {Number} columnId
   * @param {Number} rowIndex
   */
  const handleUniqueVal = (initialValue, value, columnId, rowIndex) => {
    let max = rowData.length;
    let min = null;
    let oldValue = initialValue;
    if (initialValue === value) {
      forceUpdateTable();
      return;
    }
    if (value > oldValue) {
      //If the value is larger than the current value, we reduce all other rows which are between
      //old value and new value by 1
      //i.e if I change the level from 3 to 5, then exisiting rows which have values of 4,5 will become
      //3 and 4
      min = oldValue;
      max = value;
      setRowData((old) =>
        old.map((row, index) => {
          if (index === rowIndex) {
            //while iterating, if the index is same as edited row, we update with new value
            let finalValue = value;
            return {
              ...row,
              [columnId]: finalValue,
            };
          } else if (row[columnId] > min && row[columnId] <= max) {
            //while iterating, if the index is between min and max, we reduce it by 1
            return {
              ...row,
              [columnId]: row[columnId] - 1,
            };
          }
          return row;
        })
      );
    } else if (value < oldValue) {
      //If the value is lesser than the current value, we reduce all other rows which are between
      //old value and new value by 1
      //i.e if I change the level from 5 to 3, then exisiting rows which have values of 3,4 will become
      //4 and 5
      min = value;
      max = oldValue;
      let finalData = rowData.map((row, index) => {
        if (index === rowIndex) {
          //while iterating, if the index is same as edited row, we update with new value
          let finalValue = value;
          return {
            ...row,
            [columnId]: finalValue,
          };
        } else if (row[columnId] >= min && row[columnId] < max) {
          //while iterating, if the index is between min and max, we increment it by 1
          return {
            ...row,
            [columnId]: row[columnId] + 1,
          };
        }
        return row;
      });
      setRowData(finalData);
    }
  };

  /**
   * @function
   * @description Handle delete rows from the table
   */
  const handleDelete = () => {
    tableInstance.current.api.applyTransaction({ remove: selectedRows });
    handleDisplayOrder();
  };

  /**
   * @function
   * @description Update table rows with appropriate display order when order is null
   */
  const handleDisplayOrder = () => {
    const displayedRowCount =
      tableInstance.current?.api?.getDisplayedRowCount() || 0;
    const remainingRows = [];

    for (let i = 0; i < displayedRowCount; i++) {
      let rowNode = tableInstance.current.api.getDisplayedRowAtIndex(i);
      remainingRows.push(rowNode.data);
    }
    remainingRows.sort((a, b) => a.display_order - b.display_order);
    remainingRows.forEach((row, index) => {
      row.display_order = index + 1;
    });
    setRowData(remainingRows);
  };

  /**
   * @function
   * @description Validate and update parent Component
   */
  const saveFilterConfigurationChanges = async () => {
    handleDisplayOrder();
    const isValid = isValidTableData();
    return {
      isValid,
      data: rowData,
    };
  };

  /**
   * @function
   * @description Validate each row for if something is missing in a
   */
  const isValidTableData = () => {
    // Validation to be added to the table rowData
    let isValid = true;
    const accessorList = columnConfig.map((config) => config.accessor);
    isValid = !rowData.some((row) => {
      return accessorList.some(
        (accessor) => row[accessor] === null || row[accessor] === undefined
      );
    });
    !isValid &&
      props.addSnack({
        message: "Please complete filter configuration to save.",
        options: {
          variant: "error",
        },
      });
    return isValid;
  };

  return (
    <div>
      <div
        className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.marginBottom} ${globalClasses.centerAlign}`}
      >
        <div>
          <Typography variant="h4">Select dimensions for the source</Typography>
          <ReactSelect
            value={selectedSubDimension}
            isMulti={false}
            isSearchable={false}
            placeholder="Please select sub-dimension."
            options={subDimension.map((option) => {
              return {
                label: capitalize(option.replace("_", " ")),
                value: option,
              };
            })}
            onChange={onSubDimensionChange}
            closeMenuOnSelect={false}
          />
        </div>
        <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
          <Button
            onClick={handleDelete}
            icon={DeleteIcon}
            variant="primary"
            disabled={!selectedRows.length}
          />
          <Button onClick={handlePreview} variant="secondary" disabled={true}>
            Preview
          </Button>
        </div>
      </div>
      <div className={globalClasses.marginBottom}>
        <AgGrid
          columns={columnConfig}
          rowdata={rowData}
          uniqueRowId={"row_id"}
          selectAllHeaderComponent={true}
          onSelectionChanged={onSelectionChangeHandler}
          onCellValueChanged={onCellValueChangeHandler}
          loadTableInstance={loadTableInstance}
        />
      </div>
      <Button
        icon={AddIcon}
        onClick={addNewRow}
        variant="primary"
        disabled={rowData.length >= filterOptions.length}
      >
        Add New Label
      </Button>
    </div>
  );
};

const mapStateToProps = (state) => ({});

const mapActionToProps = {
  getFilterDimensions,
  addSnack,
};

export default connect(mapStateToProps, mapActionToProps)(ConfigurationTable);
