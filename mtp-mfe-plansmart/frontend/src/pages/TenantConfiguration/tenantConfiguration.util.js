import CellRenderers from "core/Utils/agGrid/cellRenderer";
import get from "lodash/get";

export const customCellRenderer = (cellProps) => {
  const lockDropdownList = get(cellProps, "data.lock_and_hold_options", []);
  return (
    <CellRenderers
      cellData={cellProps}
      column={{
        ...cellProps,
        type: "list",
        options: lockDropdownList
      }}
    ></CellRenderers>
  );
};

export const getDependencyAsStr = (dependentKpi) =>
  dependentKpi.map((data) => data).join(", ");

export const metricDataParser = (tableData) => {
  const result = [];
  tableData.forEach((rowValue) => {
    const obj = { ...rowValue };
    obj.metric = rowValue.value;
    obj.lock_and_hold_options.forEach((dependencyValue) => {
      if (rowValue.lock_and_hold_id == dependencyValue.id) {
        obj.dependency = getDependencyAsStr(dependencyValue.dependent_kpi);
        obj.dependent_kpi = dependencyValue.dependent_kpi;
        obj.lock = dependencyValue.label;
      }
    });
    result.push(obj);
  });
  return result;
};
