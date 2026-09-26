import React, { useEffect, useMemo, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { parseShortcutString, formatShortcutDisplay } from "impact-ui-v3";
import { MOD_ORDER, MOD_LABEL, SPECIAL_KEY_DISPLAY, KEYBOARD_SHORTCUTS_TABLE_NAME } from "../../keyboardShortcutsConstants";
import "../keyboardshortcuts.scss";
import { useSelector } from "react-redux";
import { formatShortcutsTableData } from "../../utils";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Loader from "core/Utils/Loader/loader";

const ShortcutKbdCell = ({ value }) => {
  if (!value) return null;

  const parsed = parseShortcutString(value.replace("Control","Ctrl"));
  if (value === " ") {
    parsed.combos[0].key = "Space";
  }

  if (parsed.isSequence) {
    return (
      <span className="keyboard-shortcut-kbd keyboard-shortcut-kbd--sequence">
        <span className="keyboard-shortcut-kbd__key">{formatShortcutDisplay(value)}</span>
      </span>
    );
  }

  const combo = parsed?.combos?.[0];
  const parts = [];

  MOD_ORDER.forEach((m) => {
    if (combo.modifiers.has(m)) parts.push(MOD_LABEL[m]);
  });

  if (combo.key) {
    const lower = combo.key.toLowerCase();
    const display = SPECIAL_KEY_DISPLAY[lower]
      || (combo.key.length === 1 ? combo.key.toUpperCase() : combo.key.charAt(0).toUpperCase() + combo.key.slice(1));
    parts.push(display);
  }

  return (
    <span className="keyboard-shortcut-kbd">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="keyboard-shortcut-kbd__key">
          {part}
        </span>
      ))}
    </span>
  );
};

const ShortcutsTablePanel = ({ tabValue }) => {
  const shortcutsData = useSelector((state) => state?.tenantConfigReducer?.keyboardShortcuts);
  const [columnDefs, setColumnDefs] = useState([]);
  useEffect(() => {
    if (columnDefs.length === 0) {
      (async () => {
        const cols = await getColumnsAg(`table_name=${KEYBOARD_SHORTCUTS_TABLE_NAME}`)();
        const formattedCols = cols?.reduce((acc, col) => {
          if (col?.column_name === "action_title") return acc;
          if (col?.column_name === "keys") {
            acc.push({
              ...col,
              cellRenderer: (params) => <ShortcutKbdCell value={params.value} />,
              minWidth: 160,
              maxWidth: 240,
            });
          } else if (col?.column_name === "action") {
            acc.push({ ...col, flex: 1 });
          } else if (col?.column_name === "action_description") {
            acc.push({ ...col, minWidth: 220 });
          } else {
            acc.push(col);
          }
          return acc;
        }, []);
        setColumnDefs(formattedCols);
      })();
    }
  }, []);
  const rowData = useMemo(() => formatShortcutsTableData(shortcutsData, tabValue), [shortcutsData, tabValue]);
  const tableHeight = useMemo(() => {
    const rowHeight = 46;
    let maxRowsToDisplay = document.documentElement.clientHeight > 900 ? 15 : 13
    if (rowData?.length > maxRowsToDisplay) {
      return `${maxRowsToDisplay * rowHeight}px`;
    } else {
      return `${rowData.length * rowHeight}px`;
    }
  }, [rowData]);

  return (
    <>{!!columnDefs?.length ?
      <AgGridComponent
        gridId={`keyboard-shortcuts-grid-${tabValue}`}
        columns={columnDefs}
        rowdata={rowData}
        hideMarginBottom
        hideTableFormat
        hideTableActions
        hideTableSetting
        hideFontSize
        hideNumericFormat
        cardContainer={false}
        pagination={false}
        height={tableHeight}
      /> : <Loader loader={true} applyDefaultCenterStyle />
    }
    </>
  );
};

export default ShortcutsTablePanel;
