import {
  Container,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
} from "@mui/material";
import { UNIT_DEFN_ATTRIBUTE_TYPES } from "../../../../config/constants";
import {
  setUnitAttributeType,
  setAttributeData,
  setLastEditedDetails,
} from "../product-unit-definition-service";
import { connect } from "react-redux";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import { useEffect, useState, useRef } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { getAttributeCellDisabled } from "./common-functions";
import AgGridTable from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { cloneDeep } from "lodash";

const AttributesMapper = (props) => {
  const globalClasses = globalStyles();
  useEffect(() => {
    if (props.unit_type === "eaches") {
      props.setUnitAttributeType("different size - different color");
    }
  }, [props.unit_type]);
  const onChange = (event) => {
    props.setUnitAttributeType(event.target.value);
  };
  return (
    <Container maxWidth={false}>
      <Container classes={{ root: globalClasses.centerAlign }}>
        <AttributeTypeSelection
          id="productUnitDefnTypeComp"
          onChange={onChange}
          value={props.attributeType}
          unit_type={props.unit_type}
        />
      </Container>
      <Container>
        <AttributesTable
          id="productUnitDefnAttrbTableComp"
          type={props.attributeType}
          unit_type={props.unit_type}
          sizes={props.attributes_sizes}
          colors={props.attributes_colors}
          setAttributeData={props.setAttributeData}
          metrics={props.metrics}
          setLastEditedDetails={props.setLastEditedDetails}
          lastEditedData={props.lastEditedData}
          lastEditedType={props.lastEditedType}
          isMetricCopied={props.isMetricCopied}
          {...props}
        />
      </Container>
    </Container>
  );
};

const AttributeTypeSelection = (props) => {
  const disableTypes = (value) => {
    if (
      props.unit_type === "eaches" &&
      value !== "different size - different color"
    ) {
      return true;
    }
    return false;
  };
  return (
    <>
      <RadioGroup
        id="productUnitDefnTypeRadioGrp"
        value={props.value}
        onChange={props.onChange}
        row
        aria-label="unit-type"
        name="row-radio-buttons-group"
      >
        {UNIT_DEFN_ATTRIBUTE_TYPES.map((type, idx) => {
          return (
            <FormControlLabel
              key={`productUnitDefnTypeLabel${type.value}`}
              id={`productUnitDefnTypeLabel${type.value}`}
              value={type.value}
              control={
                <Radio
                  id={`productUnitDefnTypeRadio${type.value}`}
                  size="small"
                  disabled={disableTypes(type.value)}
                  color="primary"
                />
              }
              label={type.label}
            />
          );
        })}
      </RadioGroup>
    </>
  );
};

const AttributesTable = (props) => {
  const globalClasses = globalStyles();
  const [columns, setcolumns] = useState([]);
  const [rowdata, setrowdata] = useState([]);
  const attributesTableRef = useRef(null);

  const getAllRows = () => {
    let rowData = [];
    attributesTableRef.current.api.forEachNode((node) =>
      rowData.push(node.data)
    );
    return rowData;
  };
  const calculateTotal = (data) => {
    let total = 0;
    props.sizes.forEach((size, sizeIdx) => {
      props.colors.forEach((clr, clrIdx) => {
        const val =
          data[sizeIdx][clr.value] === "" || data[sizeIdx][clr.value] === 0
            ? 0
            : parseInt(data[sizeIdx][clr.value]);
        total = total + val;
      });
    });
    return total;
  };

  const getCellProperties = (
    functionType,
    cellData,
    currentCol,
    columnType
  ) => {
    if (!attributesTableRef.current) {
      return false;
    }
    let columns = [];
    let rowNode = {};
    //If we called the function from disabled property, we enter into this if block
    if (functionType === "toCheckDisability") {
      //In disabled function, we only get data and column definition as params
      //So we fetch the rowNode data and all the columns using table reference
      rowNode = attributesTableRef.current.api.getRowNode(cellData.size);
      columns = attributesTableRef.current.columnApi.getAllColumns();
    } else {
      //If the function is called at cell renderer level, we get entire table reference as cellProps
      //So we get rowNode data and columns using these cellProps only
      rowNode = { ...cellData };
      columns = cellData.columnApi.getAllColumns();
    }
    //This function returns the cell Properties for every cell
    //Properties are
    //               1. placeholder - this appears beside total if we are using single size or all-size
    //               2. isDisabled - this key will either disable or enable the cell
    // parameters passed to this function are
    //               1. rowNode or cellData
    //               2. if the column type is of "color" or "total" - color columns are columns under colors
    //                  where as total column is the last column
    //               3. Fetch all the rows of the table using getAllRows function and pass as rowdata param
    //               4. Pass all the columns
    //               5. Pass the column to which cell belongs to
    return getAttributeCellDisabled(
      rowNode,
      columnType,
      getAllRows(),
      columns,
      currentCol
    );
  };
  useEffect(() => {
    if (props.colors.length > 0) {
      let COLUMNS = [
        {
          HeaderName: "Size",
          accessor: "size",
          field: "size",
          isFixed: true,
          sticky: "left",
          disableSortBy: true,
        },
      ];
      const color_columns = props.colors.map((color) => {
        let column = {
          HeaderName: color.label,
          field: color.value,
          formatter: "roundOff",
          isFixed: true,
          type: "int",
          disableSortBy: true,
          onlyPositiveNumbers: true,
          is_editable: true,
          disabled: (data, item) => {
            const cellProperties = getCellProperties(
              "toCheckDisability",
              data,
              item,
              "color"
            );
            return cellProperties.isDisabled;
          },
        };
        return {
          ...column,
          cellRenderer: (cellProps, extraProps) => {
            let updatedextraProps = { ...extraProps };
            let updatedcellProps = { ...cellProps };
            const cellProperties = getCellProperties(
              "toGetPlaceholder",
              cellProps,
              cellProps.colDef,
              "color"
            );
            return (
              <>
                <Grid container spacing={1}>
                  <Grid
                    item
                    xs={
                      !cellProperties.placeholder ||
                      cellProperties.placeholder === ""
                        ? 12
                        : 9
                    }
                  >
                    <CellRenderer
                      cellData={updatedcellProps}
                      column={column}
                      extraProps={updatedextraProps}
                    />
                  </Grid>
                  {cellProperties.placeholder !== "" && (
                    <Grid item className={globalClasses.centerAlign}>
                      <Grid container>{cellProperties.placeholder}</Grid>
                    </Grid>
                  )}
                </Grid>
              </>
            );
          },
        };
      });
      let totalColumn = {
        HeaderName: "Per Combination",
        accessor: "total",
        field: "total",
        isFixed: true,
        type: "int",
        is_editable: true,
        disableSortBy: true,
        onlyPositiveNumbers: true,
        disabled: (data, item) => {
          const cellProperties = getCellProperties(
            "toCheckDisability",
            data,
            item,
            "total"
          );
          return cellProperties.isDisabled;
        },
      };
      COLUMNS = [
        ...COLUMNS,
        ...color_columns,
        {
          ...totalColumn,
          cellRenderer: (cellProps, extraProps) => {
            let updatedextraProps = { ...extraProps };
            let updatedcellProps = { ...cellProps };
            const cellProperties = getCellProperties(
              "toGetPlaceholder",
              cellProps,
              cellProps.colDef,
              "total"
            );
            return (
              <>
                <Grid container spacing={1}>
                  <Grid item xs={cellProperties.placeholder === "" ? 12 : 9}>
                    <CellRenderer
                      cellData={updatedcellProps}
                      column={totalColumn}
                      extraProps={updatedextraProps}
                    />
                  </Grid>
                  {cellProperties.placeholder !== "" && (
                    <Grid item className={globalClasses.centerAlign}>
                      <Grid container>{cellProperties.placeholder}</Grid>
                    </Grid>
                  )}
                </Grid>
              </>
            );
          },
        },
      ];
      setcolumns(COLUMNS);
    }
  }, [props.colors, props.type, props.unit_type]);

  useEffect(() => {
    if (props.lastEditedType === props.type || props.isMetricCopied) {
      const unitType = props.lastEditedData[0].unit_type;
      let updatedData = [...props.lastEditedData];
      if (props.unit_type !== unitType) {
        updatedData = props.lastEditedData.map((data) => {
          return {
            ...data,
            unit_type: props.unit_type,
          };
        });
      }
      props.setLastEditedDetails(updatedData, props.lastEditedType);
      setrowdata(updatedData);
    } else {
      let rows = props.sizes.map((size) => {
        let colorsObj = {};
        props.colors.map((color) => {
          colorsObj[color.value] = 0;
          return null;
        });
        return {
          size: size.value,
          metrics: props.metrics,
          unit_type: props.unit_type,
          attributeType: props.type,
          ...colorsObj,
          total: 0,
        };
      });
      let tempColorsObj = {};
      props.colors.map((color) => {
        tempColorsObj[color.value] = 0;
        return null;
      });
      rows.push({
        size: "Total",
        unit_type: props.unit_type,
        attributeType: props.type,
        metrics: props.metrics,
        ...tempColorsObj,
        total: 0,
      });
      setrowdata(rows);
    }
  }, [props.sizes, props.type, props.unit_type, props.isMetricCopied]);

  useEffect(() => {
    props.setAttributeData(rowdata);
  }, [rowdata]);

  const onCellValueChanged = (params) => {
    let { colDef, data, newValue, rowIndex } = params;
    if (isNaN(newValue)) {
      newValue = 0;
    }
    const copyRowData = cloneDeep(rowdata);
    let updatedRowData = copyRowData.map((eachrow, index) => {
      if (index === rowIndex) {
        let updatedRowObj = { ...eachrow };
        if (data.unit_type === "eaches" && newValue > 1) {
          props.addSnack({
            message: "Eaches can't have more than 1 unit",
            options: {
              variant: "error",
            },
          });
        }
        if (data.attributeType === "single size - all colors") {
          props.colors.forEach((clr) => {
            if (
              data.metrics.filter(
                (metric) =>
                  metric["color"] === clr.value && metric["size"] === data.size
              ).length > 0
            ) {
              updatedRowObj[clr.value] = newValue;
            }
          });
        }
        return {
          ...updatedRowObj,
          [colDef.field]: newValue,
        };
      } else {
        if (data.attributeType === "all size - single color") {
          let updatedRowObj = { ...eachrow };
          if (
            data.metrics.filter(
              (metric) =>
                metric["color"] === colDef.field &&
                metric["size"] === eachrow.size
            ).length > 0
          ) {
            updatedRowObj[colDef.field] = newValue;
          }
          return updatedRowObj;
        }
      }
      return eachrow;
    });
    updatedRowData[updatedRowData.length - 1]["total"] =
      calculateTotal(updatedRowData);
    props.setLastEditedDetails(updatedRowData, updatedRowData[0].attributeType);
    setrowdata(updatedRowData);
    params.api.refreshCells({ force: true });
  };

  return (
    <>
      {columns.length > 0 && (
        <AgGridTable
          columns={cloneDeep(columns)}
          rowdata={cloneDeep(rowdata)}
          uniqueRowId={"size"}
          loadTableInstance={(params) => (attributesTableRef.current = params)}
          onCellValueChanged={onCellValueChanged}
        />
      )}
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    attributeType: state.UnitDefnReducer.attributeType,
    attributes_sizes: state.UnitDefnReducer.attributes_sizes,
    attributes_colors: state.UnitDefnReducer.attributes_colors,
    unit_type: state.UnitDefnReducer.unitDefnType,
    metrics: state.UnitDefnReducer.metrics,
    lastEditedData: state.UnitDefnReducer.lastEditedData,
    lastEditedType: state.UnitDefnReducer.lastEditedType,
    isMetricCopied: state.UnitDefnReducer.isMetricCopied,
  };
};
const mapActionsToProps = {
  setUnitAttributeType,
  setAttributeData,
  setLastEditedDetails,
  addSnack,
};
export default connect(mapStateToProps, mapActionsToProps)(AttributesMapper);
