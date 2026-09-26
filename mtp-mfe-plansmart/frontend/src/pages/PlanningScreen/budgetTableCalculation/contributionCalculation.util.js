import { get } from "lodash";
import numberValidation from "./common/numberValidation.util";

export default function ({ rowData, refreshCells }) {
  const updatedRowData = rowData;

  const { columnDef, parentRowIndex } = refreshCells;

  const caluculatePercentage = (cellValue, totalValue) => {
    return numberValidation(
      cellValue !== 0 ? (cellValue / totalValue) * 100 : 0
    );
  };

  const calculateRollDown = (column, rowData, rowIndex) => {
    const channelContriRollDown = get(this.channelRollDownMapping, column);

    if (!channelContriRollDown) return;

    channelContriRollDown.forEach((child) => {
      const channelValue = get(rowData[rowIndex], child);
      const parentChannelValue = get(rowData[rowIndex], column);

      const channelContribution = get(this.channelContributionMapping, child);
      updatedRowData[rowIndex] = {
        ...updatedRowData[rowIndex],
        [channelContribution]: caluculatePercentage(
          channelValue,
          parentChannelValue
        )
      };
    });
  };

  parentRowIndex.forEach((parentIndex) => {
    const changedRow = rowData[parentIndex];
    columnDef.forEach((column) => {
      const productContributionKey = get(
        this.productContributionMapping,
        column
      );
      const children = changedRow?.children_indexes;
      const productTotal = get(changedRow, column);
      // Parent Channel Roll Down
      calculateRollDown(column, rowData, parentIndex);

      if (children && children.length > 0) {
        children.forEach((childIndex) => {
          // Child Product Roll Down
          const productValue = get(rowData[childIndex], column);

          updatedRowData[childIndex] = {
            ...updatedRowData[childIndex],
            [productContributionKey]: caluculatePercentage(
              productValue,
              productTotal
            )
          };

          // Child Channel Roll Down
          calculateRollDown(column, rowData, childIndex);
        });
      }
    });
  });

  return updatedRowData;
}
