import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { BottomSheet, Button } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "actions/tableColumnActions";
import { useExceptionStyles } from "../../Exceptions-stores/exceptionStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isNull } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { getExceptionListOnClick } from "../../../services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { addUniqueKeyToSubrows } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import moment from "moment";
import { statusBadgeCellRenderer, transformMinDistribution } from "./ruleGroupUtils";
import {
  injectStatusColumn,
  wrapColumnsWithEmptyCell,
  isConstraintColumn,
  isConstraintChildRow,
  applyNumericColumnAlignment,
  renderReadOnlyConstraintValue,
} from "../landing-screen/constraintsCommonUtils";
import { cellStyles } from "./ruleGroupStyles";

const EXCEPTIONS_TABLE_NAME = "exception_stores_table";

const renderConstraintCell = (cellProps, column) => {
  if (!isConstraintChildRow(cellProps)) return <>{"-"}</>;
  const dateColumns = ["start_date", "end_date"];
  if (dateColumns.includes(column.column_name)) {
    const tenantDateFormat =
      column?.extra?.dateFormat ||
      localStorage.getItem("tenantDateFormat") ||
      "MM-DD-YYYY";
    return (
      <div>
        {cellProps?.value
          ? moment(cellProps.value).format(tenantDateFormat)
          : ""}
      </div>
    );
  }
  return <div>{cellProps?.value || ""}</div>;
};

const applyExceptionColumnRenderers = (data) => {
  data.is_editable = false;
  data.editable = false;

  applyNumericColumnAlignment(data);

  if (data?.column_name === "rule_code") {
    data.cellRenderer = "agGroupCellRenderer";
    data.rowGroup = true;
  }
  if (data?.column_name === "exception_rule_name") {
    data.cellRenderer = (cellProps) => {
      if (cellProps.node.level !== 0) return <></>;
      return <div>{cellProps?.value || ""}</div>;
    };
  }
  if (isConstraintColumn(data)) {
    data.cellRenderer = (cellProps) => renderConstraintCell(cellProps, data);
  }
  if (data?.column_name === "end_date") {
    data.disablePast = true;
  }
  if (data?.column_name === "min_distribution") {
    data.is_aggregated = false;
    data.width = 470;
    data.minWidth = 200;
    data.extra = { ...data.extra, width: 470 };
    data.cellRenderer = (cellProps) => {
      if (!isConstraintChildRow(cellProps)) {
        return <>{"-"}</>;
      }
      return renderReadOnlyConstraintValue(cellProps, data);
    };
  }
  if (data?.column_name === "status") {
    data.cellRenderer = statusBadgeCellRenderer;
  }
  if (data?.column_name === "action") {
    data.suppressMenu = true;
    data.is_hidden = true;
  }

  const nestedColumns = data?.children?.length
    ? data.children
    : data?.sub_headers;
  nestedColumns?.forEach(applyExceptionColumnRenderers);
};

const ExceptionDetailsBottomSheet = (props) => {
  const { open, onClose, ruleData, filters } = props;

  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const agGridInstance = useRef(null);
  const columnsFetched = useRef(false);
  const useStyles = useExceptionStyles();
  

  useEffect(() => {
    if (open) {
      if (!columnsFetched.current) {
        fetchColumns();
      }
    }
  }, [open]);

  const fetchColumns = async () => {
    try {
      columnsFetched.current = true;
      const rawColumns = await getColumnsAg(
        `table_name=${EXCEPTIONS_TABLE_NAME}`
      )();
      const columnsWithStatus = injectStatusColumn(rawColumns);
      columnsWithStatus?.forEach(applyExceptionColumnRenderers);
      let formattedColumns = agGridColumnFormatter(columnsWithStatus);
      formattedColumns?.forEach((col) => {
        if (col.column_name === "status") {
          col.cellRenderer = statusBadgeCellRenderer;
        }
      });
      wrapColumnsWithEmptyCell(formattedColumns);
      setColumns(formattedColumns || []);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    const body = {
      rule_code: ruleData?.rule_code,
      psa_code: ruleData?.psa_code,
      meta: {
        ...manualbody,
        limit: {
          limit: props.pageSize || 100,
          page: isNull(pageIndex) ? 1 : pageIndex + 1,
        },
      },
    };

    try {
      setLoading(true);
      const response = await getExceptionListOnClick(body);
      setLoading(false);

      if (!response?.data?.data?.length) {
        return { data: [], totalCount: 0 };
      }

      response.data.data = transformMinDistribution(response.data.data, {
        isNewConstraintsFlow: props.showNewConstraintFlow,
      });
      let result = addUniqueKeyToSubrows(cloneDeep(response.data.data));
      let formattedData;

      if (pageIndex) {
        formattedData = agGridRowFormatter(
          result,
          params?.api?.checkConfiguration,
          "key"
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = result;
      }

      return {
        data: formattedData,
        totalCount: response.data.total || response.data.data.length,
      };
    } catch (e) {
      setLoading(false);
      handleErrorMessage(e, props);
      return { data: [], totalCount: 0 };
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  if (!open) return null;

  return (
    <BottomSheet
      title="Exceptions"
      open={open}
      onClose={onClose}
      withExpandIcon={false}
      maxHeight={`calc(100vh - 200px)`}
      footerOptions={
        <div style={cellStyles.bottomSheetFooter}>
          <Button variant="text" onClick={onClose}>
            Back
          </Button>
        </div>
      }
      className={useStyles.exceptionBottomSheet}
    >
      <Loader loader={loading}>
        <AgGridComponent
          tableHeader={"Details"}
          columns={columns}
          uniqueRowId={"key"}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={props.pageSize || 100}
          disablePaginationForSinglePage={true}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex, params) =>
            manualCallBack(body, pageIndex, params)
          }
          skipAutoSizeColumn={true}
          hideChildSelection={true}
          groupDisplayType={"custom"}
          suppressAggFuncInHeader={true}
          childKey={"data"}
          treeData={true}
          purgeClosedRowNodes={true}
          paginationPageSize={props.pageSize || 100}
          cardContainer={false}
          isInsideBottomSheet
          isBottomSheetExpanded={true}
          tableName={EXCEPTIONS_TABLE_NAME}
        />
      </Loader>
    </BottomSheet>
  );
};

const mapStateToProps = (store) => ({
  pageSize:
    store.inventorysmartReducer.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  showNewConstraintFlow:
    store.inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
});

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExceptionDetailsBottomSheet);
