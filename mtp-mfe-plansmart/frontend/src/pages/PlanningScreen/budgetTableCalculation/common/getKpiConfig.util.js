/**
 * Fetches KPI configuration based on the row index.
 * @param {Object} params - The parameters object.
 * @param {number} params.rowInx - Index of the row to retrieve KPI configuration.
 * @returns {Object} The KPI configuration for the specified row.
 * @description
 *   - Retrieves the row data using the provided index.
 *   - Uses the metric key from the row data to fetch the KPI configuration.
 */
function getKpiConfig({ rowInx }) {
  const row = this.rowData[rowInx];
  return this.kpiConfig[row.metric_key];
}

export default getKpiConfig;
