import { get, includes } from "lodash";
import { DEFAULT_CURRENT_VERSION } from "../budgetTableCalculation.constant";
import { channelBusinessUnitMapping } from "../../apis/budgetTable.data";

export default function ({ kpi, column, row }) {
  const currentColDef = column
    ? this.columnsMap[column]
    : this.changedColumnDef;

  const currentRow = row ? row : this.currentRow;

  const kpiConfig = get(this.kpiConfigV2, kpi);

  const version = get(currentRow, "plan_version", DEFAULT_CURRENT_VERSION);
  let currentColumnChannel = get(currentColDef, "extra.channel", false);

  // TODO: remove this when business unit is added to column config
  if (get(channelBusinessUnitMapping, currentColumnChannel, false)) {
    currentColumnChannel = channelBusinessUnitMapping[currentColumnChannel];
  }

  const channelEligibility = Object.keys(
    get(kpiConfig, `editable.${version}`, [])
  );

  return (
    currentColumnChannel && includes(channelEligibility, currentColumnChannel)
  );
}
