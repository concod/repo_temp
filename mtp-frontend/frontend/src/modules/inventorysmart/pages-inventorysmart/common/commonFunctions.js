import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep, isEmpty } from "lodash";
import { checkSizes } from "../Create-Allocation/helperFunctions";

export const inventoryData = async (props, p_rowData = {}, p_type, isPO = false) => {
  try {
    let response ; 
    if (isPO) {
      response = await props.endPoint(props);
    } else {
      response = await props.endPoint(props.body);
    }
    if (response.data.status) {
      
      if (isPO) {
        let l_columnsToDisplay = response?.data?.data?.table_config;
        let l_rowsToDisplay = response?.data?.data?.table_data;

        return {
          data: l_rowsToDisplay,
          columns: agGridColumnFormatter(l_columnsToDisplay),
          error: false,
        };
      }
      
      let l_columnsToDisplay = response?.data?.data?.columns?.[props.metric];
      let l_rowsToDisplay = response?.data?.data?.data;
      let l_selectedDcs = p_rowData?.data?.dcs?.map((dc) => dc.label);
      if (!isEmpty(p_rowData?.data)) {
        let copyOfColumnsToDisplay = cloneDeep(l_columnsToDisplay)
        let l_sizeColumn = copyOfColumnsToDisplay?.filter(
          (val) => val.column_name === "sizes"
        )[0];
        // pr to be reverted when we add pack id in sizes column
        let l_filteredSubHeaders = [];
        if (p_rowData?.data?.pack_type_id) {
          l_filteredSubHeaders = response?.data?.data?.columns?.[
            "dc_oh"
          ]?.filter((val) => val.column_name === "sizes")[0]?.sub_headers;
        } else {
          l_filteredSubHeaders = l_sizeColumn.sub_headers.filter((subHeader) =>
            p_rowData?.data?.sizes
              ?.map((val) => val.label)
              ?.includes(subHeader.label)
          );
        }

        l_sizeColumn.sub_headers = l_filteredSubHeaders;
        if (props.dcCodeMapping ) {
          l_rowsToDisplay = [];
          const dcs = p_rowData?.data?.dcs;
          const subHeaders = [...new Set(Object?.values(p_rowData?.data?.oh_map)?.flatMap(Object.keys))];

          const calculateAvailableToAllocate = (key, subHeader) => {
            if (p_type === "userReserve") {
              // If the user is coming from user reserve screen, then we need to use rq_map_no_purge
              if (p_rowData?.data?.inventory_source?.[0]?.value === "reserved") {
                return p_rowData?.data?.rq_map_no_purge?.[key]?.[subHeader] || 0;
              } else {
                return p_rowData?.data?.rq_map?.[key]?.[subHeader] || 0;
              }
            } else {
              let allSizesSelected = p_rowData?.data?.pack_configuration? checkSizes(p_rowData?.data?.pack_configuration, p_rowData?.size) : [];

              if (allSizesSelected) {
                return p_rowData?.data?.oh_map?.[key]?.[subHeader] || 0;
              } else {
                return p_rowData?.data?.oh_eaches_map?.[key]?.[subHeader] || 0;
              }
            }
          };

          for (const subHeader of subHeaders) {
            const foundItem = dcs.find((item) => item.value == subHeader);
            const dcLabel = foundItem ? foundItem.label : "";
            const outputObj = { ["store_code"]: dcLabel };

            for (const key of p_rowData?.size) {
              outputObj[`available_to_allocate__${key}`] = calculateAvailableToAllocate(key, subHeader);
            }

            if (p_rowData?.data?.pack_type_id) {
              const packRelatedKeys = Object.keys(p_rowData?.data?.oh_map).filter(item => !p_rowData?.size.includes(item));
              for (const key of packRelatedKeys) {
                outputObj[`available_to_allocate__${key}`] = calculateAvailableToAllocate(key, subHeader);
              }
            }

            l_rowsToDisplay.push(outputObj);
          }
        }
        if (props.metric === "net_available_inventory") {
          l_rowsToDisplay = [];
          const dcs = p_rowData?.data?.dcs;
          const subHeaders = [...new Set(Object?.values(p_rowData?.data?.oh_map)?.flatMap(Object.keys))];

          const calculateInventory = (key, subHeader) => {
            if (p_type === "userReserve") {
               // If the user is coming from user reserve screen, then we need to use rq_map_no_purge
               if (p_rowData?.data?.inventory_source?.[0]?.value === "reserved") {
                return p_rowData?.data?.rq_map_no_purge?.[key]?.[subHeader] || 0;
              } else {
                return p_rowData?.data?.rq_map?.[key]?.[subHeader] || 0;
              }
            } else {
              let allSizesSelected = p_rowData?.data?.pack_configuration ? checkSizes(p_rowData?.data?.pack_configuration, p_rowData?.size): [];

              if (allSizesSelected) {
                return (
                  (p_rowData?.data?.po_map?.[key]?.[subHeader] || 0) +
                  (p_rowData?.data?.oh_map?.[key]?.[subHeader] || 0) -
                  (p_rowData?.data?.au_map?.[key]?.[subHeader] || 0) -
                  (p_rowData?.data?.rq_map?.[key]?.[subHeader] || 0)
                );
              } else {
                return (
                  (p_rowData?.data?.po_eaches_map?.[key]?.[subHeader] || 0) +
                  (p_rowData?.data?.oh_eaches_map?.[key]?.[subHeader] || 0) -
                  (p_rowData?.data?.rq_map_eaches?.[key]?.[subHeader] || 0) -
                  (p_rowData?.data?.au_eaches_map?.[key]?.[subHeader] || 0)
                );
              }
            }
          };

          for (const subHeader of subHeaders) {
            const foundItem = dcs.find((item) => item.value == subHeader);
            const dcLabel = foundItem ? foundItem.label : "";
            const outputObj = { ["store_code"]: dcLabel };

            for (const key of p_rowData?.size) {
              outputObj[`net_available_inventory__${key}`] = calculateInventory(key, subHeader);
            }

            if (p_rowData?.data?.pack_type_id) {
              const packRelatedKeys = Object.keys(p_rowData?.data?.oh_map).filter(item => !p_rowData?.size.includes(item));
              for (const key of packRelatedKeys) {
                outputObj[`net_available_inventory__${key}`] = calculateInventory(key, subHeader);
              }
            }

            l_rowsToDisplay.push(outputObj);
          }
        }
          l_rowsToDisplay = l_rowsToDisplay?.filter((row) =>
            l_selectedDcs?.includes(row?.["store_code"])
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
      if (!p_rowData?.data?.pack_type_id) {
        if (dc_cols.includes(props.metric) && !props.dcCodeMapping)
          l_data = l_data?.filter((data) => data.is_dc);
        else l_data = l_data?.filter((data) => !data.is_dc);
      }

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
