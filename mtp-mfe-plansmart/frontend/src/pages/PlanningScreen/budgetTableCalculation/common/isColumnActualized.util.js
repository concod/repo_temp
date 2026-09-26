import { get } from "lodash";

export default function ({ column }) {
  const columnDef = this.columnsMap[column];

  return get(columnDef, "extra.is_actualized", false);
}
