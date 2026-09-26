import { useEffect, useState } from "react";
import { cloneDeep, isEmpty } from "lodash";
import { getColumnsAg } from "core/actions/tableColumnActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  RETAIL_EVENTS_DEFAULT_COLUMNS,
  RETAIL_EVENTS_TABLE_NAME,
} from "../constants";

/**
 * Loads grid columns from the backend table-fields API and falls back to
 * RETAIL_EVENTS_DEFAULT_COLUMNS when none is configured.
 * @param {string} [tableName=RETAIL_EVENTS_TABLE_NAME]
 * @param {(column) => column} [decorate] optional per-column override
 */
export const useRetailEventsColumns = (
  tableName = RETAIL_EVENTS_TABLE_NAME,
  decorate
) => {
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    let isActive = true;

    const loadColumns = async () => {
      let loaded = [];
      try {
        loaded = await getColumnsAg(`table_name=${tableName}`)();
      } catch {
        // no backend table config — use the FE fallback below
      }
      if (isEmpty(loaded)) {
        loaded = agGridColumnFormatter(cloneDeep(RETAIL_EVENTS_DEFAULT_COLUMNS));
      }
      if (isActive) setColumns(decorate ? loaded.map(decorate) : loaded);
    };

    loadColumns();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  return columns;
};
