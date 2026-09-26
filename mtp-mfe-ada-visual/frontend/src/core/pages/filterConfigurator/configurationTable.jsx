import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { capitalize, cloneDeep, uniqueId, isEmpty } from "lodash";
import { Button } from "impact-ui-v3";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { FILTER_TYPES } from "config/constants";
import { FORM_CONSTANT_FIELDS } from "./constants";
import AgGrid from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import Form from "core/Utils/form";
import CellRenderers from "core/Utils/agGrid/cellRenderer";

export const ConfigurationTable = (props) => {
  const globalClasses = globalStyles();
  const {
    dimension,
    subDimension,
    filterOptions,
    savedFilters,
    tableColumnConfig,
    globalSavedFilters,
    handleAddNewRow,
    handleDeleteRows,
    handleDisplayOrderChange,
  } = { ...props };
  const [selectedSubDimension, setSelectedSubDimension] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [columnConfig, setColumnConfig] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [instanceLoaded, setInstanceLoaded] = useState(false);
  const [savedFiltersUpdated, setSavedFiltersUpdated] = useState(false);
  const [currentGlobalFilters, setCurrentGlobalFilters] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [disblePreview, setDisblePreview] = useState(false);
  const [previewFormData, setPreviewFormData] = useState([]);
  const [is_tool_edited, setIsToolEdited] = useState(false);
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
   * @description Calls the initial setup function to configure the table when globalSavedFilters is updated
   */
  useEffect(() => {
    if (columnConfig.length && instanceLoaded) {
      getInitialSetup();
    }
  }, [globalSavedFilters]);

  /**
   * @function
   * @description Handle first load and setup table and  callbacks to parent to ensure smooth transition
   */
  useEffect(() => {
    isValidTableData();
    updatePreviewData();
     if (props.getValidationFunc) {
      props.getValidationFunc(saveFilterConfigurationChanges);
    }
  }, [rowData]);
  useEffect(() => {
    if (tableColumnConfig.length > 0) {
      setupTableColumns();
    }
  }, [tableColumnConfig, filterOptions]); // Re-run when tableColumnConfig or filterOptions changes

  /**
   * @function
   * @description Updates the row data in the table based on changes in the overall filters state.
   */
  useEffect(() => {
    if (!isEmpty(currentGlobalFilters)) {
      const rowDataUpdate = currentGlobalFilters.filter(
        (newFilter) => newFilter.dimension === dimension
      );
      setRowData(rowDataUpdate);
    }
  }, [currentGlobalFilters]);

  /**
   * @function
   * @description Update filter Data for preview secation
   */
  const updatePreviewData = () => {
    const formData = rowData
      .map((data) => {
        return {
          ...data,
          accessor: data.column_name,
          field_type: data.display_type,
          options: [],
        };
      })
      .sort((a, b) => a.display_order - b.display_order);
    setPreviewFormData(formData);
  };

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
      if (config.label === "Functionality") {
        config.is_hidden = true;
      }
      switch (config.column_name) {
        case "column_name":
          // Create and assign options array for column_name col defs
          config.options = (filterOptions || []).length > 0 ? cloneDeep(filterOptions).map((option) =>
            createDropdownObject(
              option.label,
              option.column_name,
              option.column_name
            )
          ) : [];
          config.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={config}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
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
          config.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={config}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
          break;
        case "filter_type":
          config.options = FILTER_TYPES;
          config.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={config}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
          break;
        case "level":
        case "display_order":
          if (rowData.length > 0) {
            config.options = updateLevels(rowData);
            config.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={config}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
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
    const updatedLevels =
      (currentGlobalFilters?.length || 0) > (updatedTableData?.length || 0)
        ? currentGlobalFilters
        : updatedTableData;

    return updatedLevels?.map((_row, idx) =>
      createDropdownObject(idx + 1 + "", idx + 1, idx + 1)
    );
  };

  /**
   * @function
   * @description Update saved values and prepopulate values to table
   */
  const getInitialSetup = async () => {
    const createFilterRow = (item) => ({
      ...item,
      //commenting greying out logic.
      //checkbox_disabled: item.is_hierarchy,
      filter_type: item.type,
      row_id: uniqueId(),
      //disableEditSelection: item.is_hierarchy,
      //commenting out the below lines as it is showing same data across all dimensions tab
      // dimension: capitalize(subDimension[0]?.replace("_", " ")) || dimension,
    });

    const savedRows = cloneDeep(savedFilters).map(createFilterRow);

    if (!isEmpty(globalSavedFilters)) {
      const updatedOverallFilters = cloneDeep(globalSavedFilters).map(
        createFilterRow
      );
      setCurrentGlobalFilters(updatedOverallFilters);
    }
    //commenting out the below lines as it is showing same data across all dimensions tab
    // Should be resolved later with saved values
    // setSelectedSubDimension(
    //   subDimension.map((dim) => {
    //     return {
    //       value: dim,
    //       label: capitalize(dim.replace("_", " ")),
    //     };
    //   })
    // );
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
    // Temporary hardcoded data
    const newRow = cloneDeep({
      column_name: null,
      display_type: "dropdown",
      filter_type: 'cascaded',
      dimension:
        capitalize(selectedSubDimension[0]?.value?.replace("_", " ")) ||
        dimension,
      is_mandatory: false,
      display_order: rowData.length + 1,
      is_disabled: false,
      is_clearable: true,
      row_id: uniqueId(),
      label: "",
      is_multiple_selection: false,
    });
    setRowData((prevRowData) => {
      const updatedRowData = [...prevRowData, newRow];

      if (!isEmpty(globalSavedFilters)) {
        const newRowForOverAllFilter = {
          ...newRow,
          display_order: currentGlobalFilters.length + 1,
        };
        handleAddNewRow(currentGlobalFilters, newRowForOverAllFilter);
      }

      updateDropdownValues(updatedRowData);
      return updatedRowData;
    });
    setIsToolEdited(true);
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
    setOpenModal(true);
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
    setIsToolEdited(true);
    switch (columnId) {
      case "level":
      case "display_order":
        if (!isEmpty(globalSavedFilters)) {
          handleDisplayOrderChange(initialValue, value);
        } else {
          handleUniqueVal(initialValue, value, columnId, rowIndex);
        }
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
      case "is_mandatory":
        setRowData((old) =>
          old.map((row, index) => {
            if (index === rowIndex && value) {
              return {
                ...row,
                [columnId]: value,
                ["is_disabled"]: !value,
              };
            }
            return row;
          })
        );
        break;
      case "is_disabled":
        setRowData((old) =>
          old.map((row, index) => {
            if (index === rowIndex && value) {
              return {
                ...row,
                [columnId]: value,
                ["is_mandatory"]: !value,
              };
            }
            return row;
          })
        );
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
    if (!isEmpty(globalSavedFilters)) {
      handleDeleteRows(selectedRows);
    } else {
      tableInstance.current.api.applyTransaction({ remove: selectedRows });
      handleDisplayOrder();
    }
    setIsToolEdited(true);
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

    if (isEmpty(globalSavedFilters)) {
      remainingRows.forEach((row, index) => {
        row.display_order = index + 1;
      });
    }

    setRowData(remainingRows);
  };

  /**
   * @function
   * @description Validate and update parent Component
   */
  const saveFilterConfigurationChanges = async () => {
    handleDisplayOrder();
    const isValid = isValidTableData();
    const updatedRowData = rowData.map((row) => {
      return {
        ...row,
        dimension: dimension,
      };
    });
    !isValid &&
      props.addSnack({
        message: "Please complete filter configuration to save.",
        options: {
          variant: "error",
        },
      });
    return {
      isValid,
      data: updatedRowData,
      is_tool_edited: is_tool_edited
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
    setDisblePreview(!isValid);
    return isValid;
  };

  const getTopRightOptions = ()=>{
    let options = [
            <Button
            onClick={handleDelete}
            icon={<DeleteIcon fontSize="large"></DeleteIcon>}
            variant="primary"
            disabled={!selectedRows.length}
          />,
          <Button
            onClick={handlePreview}
            variant="secondary"
            disabled={rowData.length && disblePreview}
          >
            Preview
          </Button>
    ]
    return options
  }

  return (
    <div>
      <FilterModal
        open={openModal}
        isModalFixedTop={true}
        closeOnOverlayClick={() => setOpenModal(false)}
        disableBreadcrumbSpacing={true}
      >
        <Form
          layout={"vertical"}
          maxFieldsInRow={2}
          handleChange={() => {}}
          fields={previewFormData}
          updateDefaultValue={false}
          defaultValues={[]}
          disabledFields={true}
        ></Form>
      </FilterModal>
        <AgGrid
        height = {'350px'}
        topRightOptions = {getTopRightOptions()}
        bottomLeftOptions = {    <Button
        icon={<AddIcon fontSize="large"></AddIcon>}
        onClick={addNewRow}
        variant="primary"
        disabled={rowData.length >= filterOptions.length}
      >
        Add New Label
      </Button>}
          columns={columnConfig}
          rowdata={rowData}
          uniqueRowId={"row_id"}
          selectAllHeaderComponent={true}
          onSelectionChanged={onSelectionChangeHandler}
          onCellValueChanged={onCellValueChangeHandler}
          loadTableInstance={loadTableInstance}
        />
    </div>
  );
};

const mapStateToProps = (state) => ({});

const mapActionToProps = {
  addSnack,
};

export default connect(mapStateToProps, mapActionToProps)(ConfigurationTable);
