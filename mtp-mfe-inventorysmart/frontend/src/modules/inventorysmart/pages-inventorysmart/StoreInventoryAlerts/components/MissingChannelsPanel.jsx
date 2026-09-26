import React, { useMemo, useCallback } from "react";
import { Panel, OldTable, Badge, useTranslation } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getAllColumnsWidth, getGridWidth } from "core/Utils/agGrid/table-functions";
import { MISSING_CHANNELS_COLUMN_CONFIG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import ConstraintOverflowTooltip from "../../Constraints/landing-screen/ConstraintOverflowTooltip";

const renderMissingChannelBadge = (params) =>
  params?.value ? (
    <Badge label={params.value} color="error" variant="subtle" size="small" />
  ) : null;

const PAGE_SIZE = 10;

const INNER_GRID_ROW_HEIGHT = 46;
const INNER_GRID_MAX_ROWS = 10;
const INNER_GRID_EMPTY_HEIGHT = "140px";

const getGridHeight = (rowCount) => {
  if (rowCount === 0) return INNER_GRID_EMPTY_HEIGHT;
  const visibleRows = Math.min(rowCount, INNER_GRID_MAX_ROWS);
  // Increase buffer from 60px to 120px to ensure footer/pagination and all rows are visible
  return `${visibleRows * INNER_GRID_ROW_HEIGHT + 120}px`;
};

const MissingChannelsPanel = ({ open, onClose, missingRows = [] }) => {
  const { t } = useTranslation();

  const columns = useMemo(() => {
    const configWithLabels = MISSING_CHANNELS_COLUMN_CONFIG.map((column) => ({
      ...column,
      label: t(column.labelKey),
    }));
    const formattedColumns = agGridColumnFormatter(
      cloneDeep(configWithLabels)
    );
    return formattedColumns.map((column) => {
      if (column.column_name === "missing_channel") {
        return { ...column, cellRenderer: renderMissingChannelBadge };
      }
      return {
        ...column,
        cellRenderer: (params) => <ConstraintOverflowTooltip {...params} />,
      };
    });
  }, [t]);

  const fitColumnsIfSpaceAvailable = useCallback((params) => {
    if (!params?.api) return;
    if (getAllColumnsWidth(params) <= getGridWidth(params)) {
      params.api.sizeColumnsToFit();
    }
  }, []);

  const isSinglePage = missingRows.length <= PAGE_SIZE;

  return (
    <Panel
      title={`${t("inventorysmart.missingChannelsDrawerTitle")} (${missingRows.length})`}
      anchor="right"
      width={800}
      open={open}
      onClose={onClose}
    >
      <div className={isSinglePage ? "hide-pagination" : ""}>
        <OldTable
          viewPoint="list"
          cardContainer
          tableHeader={t("inventorysmart.missingChannelsListHeading")}
          columnDefs={columns}
          rowData={missingRows}
          hideTableSetting
          hideTableFormat
          hideTableActions
          hideRowHeightOptionMenu
          hidePaginationPageSizeSelector
          hideNumericFormat
          hideFontSize
          suppressColumnMenu
          defaultPageSize={PAGE_SIZE}
          paginationPageSizeSelector={[PAGE_SIZE]}
          pagination
          domLayout="autoHeight"
          height={getGridHeight(missingRows.length)}
          onFirstDataRendered={fitColumnsIfSpaceAvailable}
          onGridSizeChanged={fitColumnsIfSpaceAvailable}
        />
      </div>
    </Panel>
  );
};

export default MissingChannelsPanel;
