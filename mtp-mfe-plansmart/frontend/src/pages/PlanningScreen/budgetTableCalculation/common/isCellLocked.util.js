import { find, get, includes } from "lodash";

export default function ({ accessor, rowInx }) {
  if (get(this.lockedCells, accessor, -1)) {
    return includes(this.lockedCells[accessor], rowInx);
  }

  return false;
}
