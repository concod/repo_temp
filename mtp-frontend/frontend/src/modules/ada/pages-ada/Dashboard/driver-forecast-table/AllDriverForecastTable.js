import React, { forwardRef, useMemo } from "react";
import { useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";

const AllDriverForecastTable = (props, ref) => {
  const classes = useStyles();

  const {
    showPrevious,
    onDriverForecastValueChange,
    columnData,
    historicAllDriverForecastColumnData,
    rowdata,
  } = props;

  let {
    allDriverForecastRef,
    promoTypeTableInstance,
    bottomGrid,
    topGrid,
  } = ref;

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const loadTableInstance = (params) => {
    allDriverForecastRef.current = params;
  };

  const rowClassRules = useMemo(() => {
    return {
      [classes.referenceRow]: (params) => {
        return showPrevious;
      },
    };
  }, [classes.referenceRow, showPrevious]);

  const onBlur = async (_, row, column, isChanged) => {
    if (!isChanged) return;
    let newColId = column?.colId;
    let colData = row[newColId];
    // let promoTypeRowNode = promoTypeTableInstance.current.api.getRowNode(
    //   "promo_type"
    // );
    // let promoTypeColId = column?.colId;

    // let promoTypeColData = promoTypeRowNode?.data?.[promoTypeColId];
    onDriverForecastValueChange(+colData, newColId);
  };

  const columnDataHandler = () => {
    let cols = [
      columnData?.[0],
      columnData?.[1],
      ...historicAllDriverForecastColumnData,
      ...(columnData.slice(2) || []),
    ]?.filter((el) => el);
    if (allDriverForecastRef.current?.api) {
      allDriverForecastRef.current.api.setColumnDefs(cols);
    }
    return cols;
  };

  const getRowStyle = (params) => {
    if (params.rowIndex !== 0) {
      return {
        pointerEvents: "none",
        background: adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_promo_type
          ? colours.alabaster
          : colours.white,
      };
    }
  };

  function renderCells(cellProps) {
    if (
      (typeof cellProps.colDef.disabled === "function" &&
        cellProps.colDef.disabled(cellProps.data, cellProps.colDef)) ||
      cellProps.colDef.disabled === true
    ) {
      return (
        <div
          style={{
            background: "#f5f5f5",
            paddingRight: "17px",
          }}
        >
          {cellProps.value}
        </div>
      );
    }

    return null;
  }

  return (
    <div className={classes.comparisonTable}>
      <AgGridComponent
        // getRowStyle={getRowStyle}
        loadTableInstance={loadTableInstance}
        uniqueRowId="row"
        pagination={false}
        sizeColumnsToFitFlag
        minWidth={200}
        // headerHeight="0"
        rowdata={rowdata}
        columns={columnDataHandler()}
        rowClassRules={rowClassRules}
        showColumnPanel={false}
        onBlur={onBlur}
        // tableRef={topGrid}
        customCellRenderer={(cellProps) => {
          const renderedCell = renderCells(cellProps);
          if (renderedCell) return renderedCell;
        }}
        // alignedGrids={bottomGrid.current ? [bottomGrid.current] : undefined}
      />
    </div>
  );
};

export default forwardRef(AllDriverForecastTable);

const useStyles = makeStyles((theme) => ({
  referenceRow: {
    pointerEvents: "none",
    background: "rgb(217, 219, 222, 0.5)!important",
  },

  total: {
    flex: "none",
    "& .ag-root-wrapper": {
      borderTop: "none",
      height: "auto",
      minHeight: "84px",
    },
    "& .ag-header.ag-pivot-off": {
      height: "1px !important" /* Removes the fixed height */,
      minHeight: "1px !important" /* Ensures no minimum height restriction */,
    },
  },
  totalRow: {
    fontWeight: "bold",
    "& a": {
      color: "#181d1f",
    },
  },
}));
