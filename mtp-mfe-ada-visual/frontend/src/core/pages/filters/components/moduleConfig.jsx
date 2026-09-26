import { connect } from "react-redux";
import ReactSelect from "../../../Utils/select";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import { useEffect, useState, useRef } from "react";
import {
  FILTER_TYPES,
  FORM_CONSTANT_FIELDS,
} from "../../../../config/constants";
import {
  setModuleConfigData,
  clearModuleConfigData,
  getFilterfields,
  getFilteredFields,
  setFilteredFields,
  getFilterDimensions,
} from "../../../actions/filterAction";
import { flattenSelectedFiltersData } from "./common-functions";
import makeStyles from "@mui/styles/makeStyles";
import Container from "@mui/material/Container";
import { capitalize, isEmpty } from "lodash";
import { addSnack } from "../../../actions/snackbarActions";
import AgGrid from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles({
  select: {
    width: "70%",
  },
  moduleConfig: {
    margin: "20px 0px",
  },
  header: {
    marginBottom: 1,
  },
});

const ModuleConfig = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const addNewRow = () => {
    const newRow = {
      level: selectedFiltersTableData.length + 1,
      display_type: "dropdown",
      filter_type: "cascaded",
      column_name: "",
      is_mandatory: false,
      display_order: selectedFiltersTableData.length + 1,
      is_disabled: false,
      is_clearable: false,
    };
    setselectedFiltersTableData([...selectedFiltersTableData, newRow]);
  };

  const handleDelete = (index) => {
    let rowData =
      moduleConfigTableRef?.current?.api?.rowModel?.rowsToDisplay?.map(
        (item) => item.data
      ) || [];
    rowData.splice(index, 1);
    rowData = rowData.map((item, idx) => {
      const item_level = idx + 1;
      return {
        ...item,
        level: item_level,
      };
    });
    setselectedFiltersTableData(rowData);
    forceUpdateTable();
  };

  const sortedData = (data) => {
    if (data) {
      return data.sort((a, b) => {
        if (a.level < b.level) return -1;
        return a.level > b.level ? 1 : 0;
      });
    }
    return [];
  };

  const selectedRowHandler = (event) => {
    const selectedFilters = event.api.getSelectedRows();
    setselectedRows(selectedFilters);
  };

  const checkDisabledRows = (filterData) => {
    return filterData.map((filter) => {
      if (
        props.mandatoryFilters.some(
          (mand_filter) => mand_filter.column_name === filter.column_name
        )
      ) {
        filter.disabledRowCheckbox = true;
      }
      return filter;
    });
  };

  const onRowsDelete = () => {
    //Remove all selected rows from selected row data
    let updatedRowData = selectedFiltersTableData.filter((row) => {
      return !selectedRows.some((selectedrow) => {
        return selectedrow.column_name === row.column_name;
      });
    });
    updatedRowData = updatedRowData.map((item, idx) => {
      const item_level = idx + 1;
      return {
        ...item,
        level: item_level,
      };
    });
    //Add all selected rows to options
    setselectedFiltersTableData(updatedRowData);
    moduleConfigTableRef?.current?.api.deselectAll();
    forceUpdateTable();
  };

  /**
   * State variables
   */
  const [selectedFiltersTableData, setselectedFiltersTableData] = useState([]);
  const [
    selectedFiltersTableColumns,
    setselectedFiltersTableColumns,
  ] = useState([]);
  const [selectedRows, setselectedRows] = useState([]);
  const moduleConfigTableRef = useRef(null);

  /**
   *
   * @param {array} updatedTableData
   * @returns updated array
   * This function generate level numbers for the number of rows present in the table
   * For example, if there are 3 rows, then this function would return [1,2,3]
   */
  const updateLevels = (updatedTableData) => {
    return updatedTableData?.map((_row, idx) => {
      return {
        label: idx + 1 + "",
        value: idx + 1,
        id: idx + 1,
      };
    });
  };

  useEffect(() => {
    let cols = selectedFiltersTableColumns.map((item) => {
      if (item.accessor === "level" || item.accessor === "display_order") {
        item.options = updateLevels(selectedFiltersTableData);
      }
      return item;
    });
    const dimensions = [];
    selectedFiltersTableData.forEach((filter) => {
      if (filter.dimension && !dimensions.includes(filter.dimension)) {
        dimensions.push(filter.dimension);
      }
    });
    props.clearModuleConfigData();
    dimensions.forEach((dimension) => {
      const filters = selectedFiltersTableData
        .filter((filter) => filter.dimension === dimension)
        .map((filter) => ({
          level: filter.level,
          display_type: filter.display_type,
          dimension: dimension,
          filter_type: filter.filter_type,
          column_name: filter.selected_column_name,
          is_mandatory: filter.is_mandatory,
          display_order: filter.display_order,
          is_disabled: filter.is_disabled,
          is_clearable: filter.is_clearable,
          label: filter.label || filter.selected_column_name,
        }));
      props.setModuleConfigData(filters, dimension);
    });
    forceUpdateTable();
  }, [selectedFiltersTableData]);

  useEffect(() => {
    if (!isEmpty(props.editModuleConfigData)) {
      const tableData = sortedData(
        checkDisabledRows(
          flattenSelectedFiltersData(props.editModuleConfigData)
        ).map((filter) => {
          const options = props.filterfields
            .filter(
              (option) =>
                option.dimension === filter.dimension && option.label != ""
            )
            .map((option) => {
              return {
                label: capitalize(option.label),
                value: option.column_name,
                dimension: option.dimension,
              };
            });
          return {
            level: filter.level,
            display_type: filter.display_type,
            dimension: filter.dimension,
            filter_type: filter.filter_type,
            column_name: options,
            selected_column_name: filter.column_name,
            is_mandatory: filter.is_mandatory,
            display_order: filter.display_order,
            is_disabled: filter.is_disabled,
            is_clearable: filter.is_clearable,
            label: filter.label,
          };
        })
      );
      if (tableData.length) {
        setselectedFiltersTableData(tableData);
      }
    }
  }, [props.editModuleConfigData]);

  useEffect(() => {
    const fetchInitialData = async () => {
      //fetch the table config
      let createUpdateTableConfig = await props.getColumnsAg(
        "table_name=filter_config_create_update_table"
      );
      const options = await getFilterDimensions();
      createUpdateTableConfig = createUpdateTableConfig.map((column) => {
        switch (column.field) {
          case "display_type":
            column.options = FORM_CONSTANT_FIELDS.map((field) => {
              return {
                label: capitalize(field.replace(/[^\w ]/, " ")),
                value: field,
                id: field,
              };
            });
            break;
          case "dimension":
            column.options = options.data?.data?.map((dimentionType) => {
              return {
                label: capitalize(dimentionType.name),
                value: dimentionType.name,
                id: dimentionType.name,
              };
            });
            break;
          case "filter_type":
            column.options = FILTER_TYPES;
            break;
          case "level":
          case "display_order":
            if (selectedFiltersTableData.length > 0) {
              column.options = updateLevels(selectedFiltersTableData);
            }
            break;
        }
        return column;
      });
      setselectedFiltersTableColumns(createUpdateTableConfig);
    };
    fetchInitialData();
  }, []);

  const handleDropDown = (e, instance) => {
    let cellNode = instance.data;
    let colId = instance.colDef.column_name;
    const rowsToDisplay =
      moduleConfigTableRef?.current.api.rowModel.rowsToDisplay;
    const isRepeated = rowsToDisplay.some((node) => {
      if (
        node.rowIndex !== instance.rowIndex &&
        node.data.dimension === e.dimension &&
        node.data.selected_column_name === e.value
      ) {
        props.addSnack({
          message: "Please select a unique filter combination.",
          options: {
            variant: "error",
          },
        });
        return true;
      } else return false;
    });
    if (!isRepeated) {
      const filterConfig = rowsToDisplay.map((filter) => {
        return filter.rowIndex === instance.rowIndex
          ? {
              ...filter.data,
              [`selected_${colId}`]: e.value,
              ["label"]: e.label,
            }
          : filter.data;
      });
      cellNode[`selected_${colId}`] = e.value;
      cellNode["label"] = e.label;
      setselectedFiltersTableData(filterConfig);
    }
    forceUpdateTable();
  };

  const customCellRenderer = (cellProps) => {
    const { colDef } = cellProps;
    if (colDef.accessor.includes("column_name")) {
      colDef.cellRenderer = (instance) => {
        return (
          <div style={{ width: "100%" }}>
            <ReactSelect
              menuShouldBlockScroll={true}
              menuPortalTarget={document.body}
              name={colDef.accessor}
              isMulti={colDef.isMulti}
              isSearchable={false}
              options={instance?.data?.[colDef.accessor] || []}
              value={(instance?.data?.[colDef.accessor] || [])?.filter(
                (item) =>
                  item.value === instance?.data?.[`selected_${colDef.accessor}`]
              )}
              data-testid={`select${colDef.name}`}
              onChange={(option) => handleDropDown(option, instance)}
              isDisabled={colDef.disabled}
            />
          </div>
        );
      };
    }
  };

  const onCellValueChanged = async (event) => {
    const columnId = event.column.colId;
    const initialValue = event.oldValue;
    const value = event.value;
    const rowIndex = event.rowIndex;
    let cols = selectedFiltersTableColumns.map((item) => {
      if (item.accessor === "level" || item.accessor === "display_order") {
        item.options = updateLevels(selectedFiltersTableData);
      }
      return item;
    });

    setselectedFiltersTableColumns(cols);
    switch (columnId) {
      case "level":
      case "display_order":
        handleUniqueVal(initialValue, value, columnId, rowIndex);
        break;
      case "dimension":
        const newOptions = props.filterfields
          .filter((option) => option.dimension === value && option.label != "")
          .map((option) => {
            return {
              label: capitalize(option.label),
              value: option.column_name,
              dimension: option.dimension,
            };
          });

        setselectedFiltersTableData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...row,
                ["column_name"]: newOptions,
                ["selected_column_name"]: "",
                ["label"]: "",
              };
            }
            return row;
          })
        );
        break;
      default:
        setselectedFiltersTableData((old) =>
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

  const handleUniqueVal = (initialValue, value, columnId, rowIndex) => {
    let max = selectedFiltersTableData.length;
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
      setselectedFiltersTableData((old) =>
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
      let finalData = selectedFiltersTableData.map((row, index) => {
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
      setselectedFiltersTableData(finalData);
    }
  };

  const forceUpdateTable = () => {
    moduleConfigTableRef?.current?.api.refreshCells({
      force: true,
    });
  };

  return (
    <>
      <Container classes={{ root: classes.moduleConfig }}>
        <Grid
          className={globalClasses.marginBottom}
          container
          spacing={2}
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
        >
          <Grid item>
            <Button variant="contained" color="primary" onClick={onRowsDelete}>
              Delete
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" onClick={addNewRow}>
              Add
            </Button>
          </Grid>
        </Grid>

        {selectedFiltersTableData.length ? (
          <AgGrid
            columns={selectedFiltersTableColumns}
            rowdata={selectedFiltersTableData}
            uniqueRowId={"level"}
            selectAllHeaderComponent={true}
            onSelectionChanged={selectedRowHandler}
            onCellValueChanged={onCellValueChanged}
            customCellRenderer={(cellProps) => customCellRenderer(cellProps)}
            callDeleteApi={(data) => handleDelete(data.rowIndex)}
            loadTableInstance={(tableInstance) => {
              moduleConfigTableRef.current = tableInstance;
              forceUpdateTable();
            }}
          />
        ) : null}
      </Container>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    filterfields: state.filterElementsReducer.filterfields,
    selectedModuleConfigData:
      state.filterElementsReducer.selectedModuleConfigData,
    createdConfigs: state.filterElementsReducer.createdConfigs,
    mandatoryFilters: state.filterElementsReducer.mandatoryFilterFields,
    editModuleConfigData: state.filterElementsReducer.editModuleConfigData,
  };
};
const ActionsToProps = {
  setModuleConfigData,
  clearModuleConfigData,
  getFilterfields,
  getFilteredFields,
  setFilteredFields,
  getColumnsAg,
  getFilterDimensions,
  addSnack,
};
export default connect(mapStateToProps, ActionsToProps)(ModuleConfig);
