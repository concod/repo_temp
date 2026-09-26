import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { isEmpty } from "lodash";

export const inventoryData = async (props, p_rowData = {}) => {
  try {
    let response = await props.endPoint(props.body);
    if (response.data.status) {
      let l_columnsToDisplay = response?.data?.data?.columns?.[props.metric];
      let l_rowsToDisplay = response?.data?.data?.data;
      let l_selectedDcs = p_rowData?.data?.dcs?.map((dc) => dc.label);
      if (!isEmpty(p_rowData?.data)) {
        let l_sizeColumn = l_columnsToDisplay?.filter(
          (val) => val.column_name === "sizes"
        )[0];
        const l_filteredSubHeaders = l_sizeColumn.sub_headers.filter(
          (subHeader) =>
            p_rowData?.data?.sizes
              ?.map((val) => val.label)
              ?.includes(subHeader.label)
        );

        l_sizeColumn.sub_headers = l_filteredSubHeaders;
        if (props.metric === "net_available_inventory") {
          l_rowsToDisplay = [];
          const dcs = p_rowData?.data?.dcs;

          for (const subHeader of [
            ...new Set(
              Object?.values(p_rowData?.data?.oh_map)?.flatMap(Object.keys)
            ),
          ]) {
            const foundItem = dcs.find((item) => item.value == subHeader);
            const dcLabel = foundItem ? foundItem.label : "";
            const outputObj = { store_code: dcLabel };
            for (const key in p_rowData?.data?.oh_map) {
              outputObj[`net_available_inventory__${key}`] =
                (p_rowData?.data?.po_map?.[key]?.[subHeader] || 0) +
                (p_rowData?.data?.oh_map?.[key]?.[subHeader] || 0) -
                (p_rowData?.data?.au_map?.[key]?.[subHeader] || 0) -
                (p_rowData?.data?.rq_map?.[key]?.[subHeader] || 0);
            }
            l_rowsToDisplay.push(outputObj);
          }
        }
        l_rowsToDisplay = l_rowsToDisplay?.filter((row) =>
          l_selectedDcs?.includes(row.store_code)
        );
      }
      let l_formattedColumns = agGridColumnFormatter(l_columnsToDisplay);
      let l_data = l_rowsToDisplay;
      const dc_cols = [
        "available_to_allocate",
        "dc_oh_1",
        "dc_oh_qcloc",
        "dc_oh_cwc",
        "oo_dc",
        "it_dc",
        "bulk_remaining",
        "dc_oh_1_wms_location",
        "dc_oh",
      ];
      if (dc_cols.includes(props.metric))
        l_data = l_data?.filter((data) => data.is_dc);
      else l_data = l_data?.filter((data) => !data.is_dc);
      return {
        data: l_data,
        columns: l_formattedColumns,
        error: false,
      };
    } else {
      return { error: true };
    }
  } catch {
    return { error: true };
  }
};
