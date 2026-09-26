import React, { useEffect, useRef, useState } from "react";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { CircularProgress } from "@mui/material";

import { get, isEmpty } from "lodash";
import PropTypes from "prop-types";

import { Panel } from "impact-ui";

import LoadingOverlay from "core/Utils/Loader/loader";
import Table from "core/Utils/agGrid";

import CellRenderer from "../../../../core/Utils/agGrid/cellRenderer";

import * as actions from "../../slice/planningScreen.slice";
import * as tableConfigApi from "./apis/recalculateTableConfig.api";
import * as recalculateConstraintApi from "./apis/recalculate.api";

import findIntersection from "../../budgetTableCalculation/common/findIntersection.util";
import getColumnMaps from "../../../../utils/getColumnMaps.util";
import numberValidation from "../../budgetTableCalculation/common/numberValidation.util";

import {
  RECALCULATE_CONSTANTS_ARHAUS,
  RECALCULATE_CONSTANTS_PARTYCITY,
  RECALCULATE_TABLE_DATA
} from "./constants/recalculate.constants";
import styles from "./Recalculate.module.css";
import { PRE_SEASON_STATUS_CODES } from "../../planningScreen.constant";

const Recalculate = ({
  getRecalculateTableConfig,
  isRecalculatePanelOpen,
  planCode,
  recalculateConstraintReq,
  recalculateTableColDef,
  recalculateTableLoader,
  rowDataInxMapping,
  planStatus,
  tableRef,
  tableRowDataRef,
  versionBudgetTableRowData,
  showHideMetricsData
}) => {
  const dispatch = useDispatch();
  const recalculateTableInstance = useRef([]);
  const tableRows = get(tableRowDataRef, "current", []) || [];

  const [columnDef, setColumnDef] = useState([]);
  const [rowData, setRowData] = useState(RECALCULATE_TABLE_DATA);
  const [isSourceChanged, setIsSourceChanged] = useState(false);
  const [recalCulateData, setRecalCulateData] = useState({});
  const [isChanged, setIsChanged] = useState(false);

  //todo[MTP-53713] - BE should send the KPI name to calculate GM $ and  Sales $
  const getConstantFile = () => {
    const { baseUrl } = window.localStorage;
    if (baseUrl.includes("arhaus")) {
      return RECALCULATE_CONSTANTS_ARHAUS;
    }
    return RECALCULATE_CONSTANTS_PARTYCITY;
  };
  const RECALCULATE_CONSTANTS = getConstantFile();

  const getColumnValue = (row, columnsMap) => {
    const columnKey = Object.keys(columnsMap).filter(
      (i) => columnsMap[i]?.extra?.isGrandTotal === true
    )[0];
    return row && row[columnKey] ? row[columnKey] : null;
  };

  const init = () => {
    if (isEmpty(versionBudgetTableRowData)) return;

    const columnsMap = getColumnMaps(
      get(tableRef, "current.columnApi.columnModel.gridColumnsMap", {}),
      true
    );
    const overallMarginIndex = findIntersection(rowDataInxMapping, [
      RECALCULATE_CONSTANTS.COLUMN_KEY_MARGIN,
      PRE_SEASON_STATUS_CODES.includes(planStatus)
        ? RECALCULATE_CONSTANTS.VERSION_WP
        : RECALCULATE_CONSTANTS.VERSION_WF
    ])?.[0];
    //TY(This Year written sales index)
    const tyWrittenSalesIndex = findIntersection(rowDataInxMapping, [
      RECALCULATE_CONSTANTS.COLUMN_KEY_REVENUE,
      PRE_SEASON_STATUS_CODES.includes(planStatus)
        ? RECALCULATE_CONSTANTS.VERSION_WP
        : RECALCULATE_CONSTANTS.VERSION_WF
    ])?.[0];
    //LY(Last Year written sales index)
    const lyWrittenSalesIndex = findIntersection(rowDataInxMapping, [
      RECALCULATE_CONSTANTS.COLUMN_KEY_REVENUE,
      RECALCULATE_CONSTANTS.VERSION_LY
    ])?.[0];

    //MT(Margin Total)
    const marginTotal = getColumnValue(
      tableRows[overallMarginIndex],
      columnsMap
    );
    //TY(This Year written sales total)
    const tyWrittenSalesTotal = getColumnValue(
      tableRows[tyWrittenSalesIndex],
      columnsMap
    );
    //LY(Last Year written sales total)
    const lyWrittenSalesTotal = getColumnValue(
      tableRows[lyWrittenSalesIndex],
      columnsMap
    );

    //Margin %
    const marginPerc = numberValidation(marginTotal / tyWrittenSalesTotal);
    //Revenue Growth %
    const revenueGrowthPerc = numberValidation(
      (tyWrittenSalesTotal - lyWrittenSalesTotal) / lyWrittenSalesTotal
    );
    // Overall Revenue = LY Revenue * (1 + Revenue Growth %)
    const overallRevenue = numberValidation(lyWrittenSalesTotal);
    // numberValidation(
    //   lyWrittenSalesTotal * (1 + revenueGrowthPerc)
    // );

    setRowData(
      RECALCULATE_TABLE_DATA.map((tableData) => {
        const rowValue = { ...tableData };
        if (tableData?.uniqueId === RECALCULATE_CONSTANTS.UNIQUE_ID_MARGIN) {
          rowValue.targetValue = marginPerc * 100;
        } else {
          rowValue.targetValue = revenueGrowthPerc * 100;
        }
        return rowValue;
      })
    );

    setRecalCulateData({
      gross_margin_per: marginPerc,
      revenue_growth_per: revenueGrowthPerc,
      eop_variance: 0,
      revenue_total: overallRevenue,
      ly_written_sales_total: lyWrittenSalesTotal
    });
  };

  useEffect(() => {
    if (isRecalculatePanelOpen) {
      getRecalculateTableConfig();
      init();
    }
    return () => {
      setIsChanged(false);
    };
  }, [isRecalculatePanelOpen]);

  useEffect(() => {
    if (!isEmpty(recalculateTableColDef)) {
      setColumnDef([
        {
          header: "",
          rowDrag: true,
          column_name: "empty",
          maxWidth: 40,
          suppressMenu: true
        },
        ...recalculateTableColDef
      ]);
    }
  }, [recalculateTableColDef]);

  const loadTableInstance = (params) => {
    recalculateTableInstance.current = params;
  };

  const onRowDragMove = (props) => {
    recalculateTableInstance?.current?.api?.rowModel?.rowsToDisplay.forEach(
      (rowVal) => {
        rowVal.data.priority = rowVal.rowIndex + 1;

        if (
          rowVal.data.uniqueId === RECALCULATE_CONSTANTS.UNIQUE_ID_MARGIN &&
          !isSourceChanged
        ) {
          setIsSourceChanged(rowVal.rowIndex + 1 > 1);
        }
      }
    );
    recalculateTableInstance.current.api.refreshCells({
      force: true
    });
    setIsChanged(true);
  };

  const getRecalConstraintList = () => {
    const list = [];

    recalculateTableInstance?.current?.api?.rowModel?.rowsToDisplay.forEach(
      (rowDetails) => {
        list.push({
          filter_type: "non-cascaded",
          attribute_name: rowDetails?.data?.uniqueId,
          operator: "in",
          priority: rowDetails?.data?.priority,
          thresholdValues: rowDetails?.data?.uniqueId
            ? [rowDetails?.data?.thresholdPercValue / 100]
            : [],
          values: rowDetails?.data?.uniqueId
            ? [rowDetails?.data?.targetValue / 100]
            : []
        });
      }
    );
    return list;
  };

  const getRevValue = () => {
    const row = recalculateTableInstance?.current?.api?.rowModel?.rowsToDisplay.find(
      (row) =>
        row?.data?.uniqueId === RECALCULATE_CONSTANTS.UNIQUE_ID_REVENUE_GROWTH
    );

    return row?.data?.targetValue || null; // Return targetValue or null if row is not found
  };

  const handleRecalculate = () => {
    const rowList = getRecalConstraintList();
    // const updatedRevenueGrowth = getRevValue();
    // let updatedOverallRevenue;
    // if (
    //   updatedRevenueGrowth !==
    //   recalCulateData[RECALCULATE_CONSTANTS.UNIQUE_ID_REVENUE_GROWTH]
    // ) {
    // updatedOverallRevenue = numberValidation(
    //   recalCulateData?.ly_written_sales_total *
    //     (1 + updatedRevenueGrowth / 100)
    // );

    //   setRecalCulateData({
    //     ...recalCulateData,
    //     revenue_total: updatedOverallRevenue
    //   });
    // }

    const totalFiltersList = [
      {
        filter_type: "non-cascaded",
        operator: "in",
        attribute_name: RECALCULATE_CONSTANTS.UNIQUE_ID_EOP,
        values: [recalCulateData[RECALCULATE_CONSTANTS.UNIQUE_ID_EOP]]
      },
      {
        filter_type: "non-cascaded",
        operator: "in",
        attribute_name: RECALCULATE_CONSTANTS.UNIQUE_ID_REVENUE_TOTAL,
        values:
          // updatedRevenueGrowth !==
          // recalCulateData[RECALCULATE_CONSTANTS.UNIQUE_ID_REVENUE_GROWTH]
          //   ? [updatedOverallRevenue]
          // :
          [recalCulateData[RECALCULATE_CONSTANTS.UNIQUE_ID_REVENUE_TOTAL]]
      }
    ];
    const req = [...rowList, ...totalFiltersList];
    recalculateConstraintReq({ planCode, req });
    setIsChanged(false);
  };

  const handleClose = () => {
    dispatch(actions.setIsRecalculatePanelOpen(false));
  };

  const disabledColumn =
    Array.isArray(showHideMetricsData) &&
    showHideMetricsData[1]?.some(
      (item) => item.label.includes("IAF") && !item.isChecked
    );

  return (
    <LoadingOverlay loader={recalculateTableLoader}>
      <div className={styles.panelContainer}>
        <Panel
          isOpen={isRecalculatePanelOpen}
          size="large"
          title={RECALCULATE_CONSTANTS.RECALCULATE_HEADER}
          onClose={handleClose}
          primaryButtonProps={{
            children: RECALCULATE_CONSTANTS.BUTTON_RECALCULATE,
            onClick: handleRecalculate,
            disabled: !isChanged || recalculateTableLoader,
            icon: recalculateTableLoader
              ? () => <CircularProgress size="1rem" />
              : null
          }}
          tertiaryButtonProps={{
            children: RECALCULATE_CONSTANTS.BUTTON_CANCEL,
            onClick: handleClose
          }}
        >
          <h3 className={styles.recalculateHeading}>
            {RECALCULATE_CONSTANTS.SET_PARAMETERS_HEADER}
          </h3>
          <Table
            animateRows={true}
            columns={columnDef}
            loadTableInstance={loadTableInstance}
            pagination={false}
            rowdata={rowData}
            rowDragManaged={true}
            sideBar={false}
            uniqueId="uniqueId"
            uniqueRowId="uniqueId"
            customCellRenderer={(props) => (
              <CellRenderer
                cellData={props}
                column={{
                  ...props.colDef,
                  disabled: !recalCulateData || disabledColumn
                }}
                setIsChanged={setIsChanged}
              />
            )}
            onRowDragMove={onRowDragMove}
            showSearchModalBtn={false}
          />
        </Panel>
      </div>
    </LoadingOverlay>
  );
};

const mapState = (state) => ({
  isRecalculatePanelOpen: actions.isRecalculatePanelOpenSelector(state),
  recalculateTableLoader: actions.recalculateTableLoaderSelector(state),
  recalculateTableColDef: actions.recalculateTableConfigSelector(state),
  rowDataInxMapping: actions.rowDataInxMappingSelector(state),
  versionBudgetTableRowData: actions.versionDataMergeSelector(state),
  showHideMetricsData: actions.showHideMetricsDataSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators(
      { ...actions, ...recalculateConstraintApi, ...tableConfigApi },
      dispatch
    )
  };
};

Recalculate.propTypes = {
  getRecalculateTableConfig: PropTypes.func,
  isRecalculatePanelOpen: PropTypes.bool,
  planCode: PropTypes.string,
  planStatus: PropTypes.number,
  recalculateConstraintReq: PropTypes.func,
  recalculateTableColDef: PropTypes.array,
  recalculateTableLoader: PropTypes.bool,
  rowDataInxMapping: PropTypes.any,
  showHideMetricsData: PropTypes.array,
  tableRef: PropTypes.object,
  tableRowDataRef: PropTypes.shape({
    current: PropTypes.any
  }),
  versionBudgetTableRowData: PropTypes.array
};

export default connect(mapState, mapDispatch)(Recalculate);
