const SOURCE_DC_KEYS = ["source_dc", "source_dc_code", "from_dc"];
const DESTINATION_DC_KEYS = [
  "destination_dc",
  "destination_dc_code",
  "to_dc",
  "dest_dc",
];

const getRowValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return null;
};

const getTransferEdge = (row) => {
  const sourceDc = getRowValue(row, SOURCE_DC_KEYS);
  const destinationDc = getRowValue(row, DESTINATION_DC_KEYS);
  if (!sourceDc || !destinationDc) {
    return null;
  }
  return { sourceDc, destinationDc };
};

export const hasCircularDcTransfers = (rows = []) => {
  const sourceDcs = new Set();
  const destinationDcs = new Set();

  rows.forEach((row) => {
    const edge = getTransferEdge(row);
    if (!edge) {
      return;
    }

    sourceDcs.add(edge.sourceDc);
    destinationDcs.add(edge.destinationDc);
  });

  for (const sourceDc of sourceDcs) {
    if (destinationDcs.has(sourceDc)) {
      return true;
    }
  }

  return false;
};
