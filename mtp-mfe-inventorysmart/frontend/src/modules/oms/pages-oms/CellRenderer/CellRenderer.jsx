import { get, isNumber, isObject, isString } from "lodash";
import PropTypes from "prop-types";
import React, { useRef } from "react";
import { Tooltip } from "impact-ui-v3";
import { useCellRendererEnv } from "./CellRendererEnvContext";
import InputCell from "./InputCell";
import {
  cellRenderedValidation,
  getFormattedValue,
  getGroupNodeTotalValue,
  getIsPaginationEnabled,
} from "./cellRenderer.util";
import {
  CONTRIBUTION_KEY,
  GRAND_TOTAL_KEY,
  GRAND_TOTAL_ACCESSOR,
  STATIC_VALUE,
  VARIANCE_PERCENT_KEY,
  VARIANCE_ABSOLUTE_KEY,
} from "./cellRenderer.constants";

function CellRenderer(props) {
  const {
    colDef,
    data: propsData,
    value: propsValue,
    node,
    currentVersion,
  } = props;

  const {
    planKpiConfig = {},
    editMode,
    orderTableLoader,
    rowDimensions,
    isKPIWiseRows,
    orderTableResp = {},
    pivotPayload,
    pivotDescriptionData,
  } = useCellRendererEnv();

  const totalColumnChildMapping = get(orderTableResp, "totalColumnChildMapping", []);

  let data = propsData;
  let cellValue = data?.[colDef.accessor] ?? propsValue;
  const isGroupNode = get(node, "group", false);
  const isEditable = get(colDef, "is_editable", false);
  const isPagination = getIsPaginationEnabled();

  if (isGroupNode && isEditable && !isPagination) {
    cellValue = getGroupNodeTotalValue(node, colDef, rowDimensions, false);
    data = getGroupNodeTotalValue(node, colDef, rowDimensions, true);
  }

  let value = cellValue;
  let cellMetaData = {};

  if (isObject(cellValue)) {
    value = cellValue.value;
    cellMetaData = cellValue;
    if (!colDef.is_editable) {
      value = get(cellValue, "label", "");
    }
  }

  const inputRef = useRef(null);
  const metricKey = pivotPayload?.kpi_wise_rows
    ? get(data, "measurement.kpi", "")
    : get(colDef, "measurement.kpi", "");

  const kpiConfig = get(planKpiConfig, metricKey, {});

  const version = pivotPayload?.kpi_wise_rows
    ? get(data, "measurement.version", "")
    : get(colDef, "measurement.version", "");

  const isGrandTotal = pivotPayload?.kpi_wise_rows
    ? get(colDef, "accessor", "") === GRAND_TOTAL_ACCESSOR
    : get(data, GRAND_TOTAL_KEY, false);

  const isContribution = get(cellMetaData, CONTRIBUTION_KEY, false);
  const isVariance =
    get(cellMetaData, VARIANCE_ABSOLUTE_KEY, false) ||
    get(cellMetaData, VARIANCE_PERCENT_KEY, false);
  const isCellBold = get(colDef, "extra.is_bold", false);
  const isColumnEditable = get(colDef, "is_editable", false);

  const enrichedProps = { ...props, pivotPayload, pivotDescriptionData };
  const { shouldRenderInputCell, displayStaticValue, shouldRenderLockIcon } =
    cellRenderedValidation({
      isColumnEditable,
      isGrandTotal,
      props: enrichedProps,
      kpiConfig,
      data,
      colDef,
      totalColumnChildMapping,
      currentVersion,
      isKPIWiseRows,
      cellMetaData,
    });

  const isActualized = get(cellMetaData, "is_actualized", false);

  let renderedValue;

  if (value === null && isEditable) {
    renderedValue = STATIC_VALUE;
  } else if (
    editMode &&
    shouldRenderInputCell &&
    isNumber(value) &&
    !isActualized
  ) {
    renderedValue = (
      <InputCell
        {...props}
        value={value}
        planKpiConfig={planKpiConfig}
        inputRef={inputRef}
        isContribution={isContribution}
        isVariance={isVariance}
        isCellBold={isCellBold}
        metricKey={metricKey}
        version={version}
        cellLoaderStatus={orderTableLoader}
        cellMetaData={cellMetaData}
        isLockable={shouldRenderLockIcon}
      />
    );
  } else if (isString(value) || displayStaticValue !== null) {
    renderedValue = (
      <div style={{ textAlign: "left", width: "100%" }}>
        {displayStaticValue !== null ? displayStaticValue : value}
      </div>
    );
  } else {
    renderedValue = (
      <div style={{ fontWeight: isCellBold ? "700" : "400", width: "100%" }}>
        {(isNumber(value) || isString(value)) &&
          getFormattedValue({
            inputValue: value,
            version,
            planKpiConfig,
            metricKey,
            isContribution,
            cellMetaData,
          })}
      </div>
    );
  }

  return (
    <Tooltip title={value ?? ""} placement="top">
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {renderedValue}
      </div>
    </Tooltip>
  );
}

CellRenderer.propTypes = {
  value: PropTypes.number,
  colDef: PropTypes.object,
  data: PropTypes.object,
  currentVersion: PropTypes.string,
};

function areCellPropsEqual(prev, next) {
  return (
    prev.value === next.value &&
    prev.colDef?.accessor === next.colDef?.accessor &&
    prev.colDef?.is_editable === next.colDef?.is_editable &&
    prev.node?.rowIndex === next.node?.rowIndex &&
    prev.data?.unique_id === next.data?.unique_id &&
    prev.data === next.data &&
    prev.currentVersion === next.currentVersion
  );
}

export default React.memo(CellRenderer, areCellPropsEqual);
