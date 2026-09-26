import { cloneDeep } from "lodash";
import { Dashboard, omniMappingMetrics, OMNI_WEDGE_MAPPING_METRICS } from "modules/assortsmart/constants-assortsmart/stringContants";
import { groupByCustom } from "core/Utils/formatter";

export const getAddRowPayloadData = (globalChoiceAdded, props) => {
    const tableData = cloneDeep(props.omniMappingData.data);
    tableData.forEach((row) => {
      for (const key in row.attribute_value) {
        if (row.attribute_value[key]) {
          if (row.attribute_value[key].toString().indexOf("'") >= 0) {
            row.attribute_value[key] = row.attribute_value[key].replace(
              /'/g,
              '"'
            );
          }
        }
      }
    });
    const omniData = groupByCustom({
      Group: props.omniMappingData.data,
      By: ["source_choice_id"],
    });
    const rowData = omniData[0];
    //let tableItem = {},
      let levels = {};
    for (const item of rowData) {
      let tableItem = {};
      omniMappingMetrics?.forEach((metric)=>{
          if(metric === "source_choice_id"){
              tableItem[metric] = globalChoiceAdded;
          }else{
            tableItem[metric] = item[metric];
          }
      })
      let source_levels = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: "1",
        ...Dashboard.__plan_levels?.forEach((level)=>{
            levels[level] = item[level];
        })
      }
      item["source_levels"] = source_levels;
      tableItem["attribute_value"] = {};
      for (const key in item.attribute_value) {
        if (key === "buy_units" || key === "global_style_number") {
          tableItem["attribute_value"][key] = "0";
        } else {
          tableItem["attribute_value"][key] = null;
        }
      }
      tableItem["attribute_value"]["moq"] = 0;
      tableItem["destination_attribute_value"] = {};
      for (const key in item.destination_attribute_value) {
        tableItem["destination_attribute_value"][key] = null;
      }
      tableData.push(tableItem);
    }
    return tableData;
  };

  export const updateOmniPayload = (moq, props) => {
    const tableData = props.omniMappingData;
    const omniData = cloneDeep(tableData.data);
    let levels = {};
    omniData.forEach((data) => {
      data.attribute_value.moq = parseInt(moq);
      data["source_levels"] = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: "1",
        ...Dashboard.__plan_levels?.forEach((level)=>{
          levels[level] = data[level];
      })
      };
      for (const key in Dashboard.__plan_levels) {
        delete data[key];
      }
    });
    return omniData;
  }

  export const prepareOmniTableData = (omniData, attributeList) => {
    const groupBy_properties = ["source_choice_id"];
    const group_data = groupByCustom({
      Group: omniData,
      By: groupBy_properties,
    });
    let planNameToCode = {},
        planCodes = [];
      group_data.forEach((item) => {
        for (const row of item) {
          planCodes.push(row.destination_plan_code);
        }
      });
      let planCodeData = [...new Set(planCodes)];
      //Map plan names to plan code
      for (let i = 0; i < planCodeData.length; i++) {
        planNameToCode["plan" + (i + 1)] = planCodeData[i];
      }
    // const planNameToCode = props.planNameToCodeData;
    const tabledata = group_data.map((row) => {
      let omniRowObject = {};
      const OmniMappingMetrics = OMNI_WEDGE_MAPPING_METRICS;
      const totalPlans = Object.keys(planNameToCode).length;
      //mapping the plan key
      row.forEach((item) => {
        omniRowObject["global_choice"] = item.source_choice_id;
        omniRowObject["l3_name"] = item.l3_name;
        omniRowObject["global_style"] =
          item.attribute_value.global_style_number;
        //To populate wedge attributes related data
        for (const attributes of attributeList) {
          //TO fetch key e.g.fabrication key from attribtes_fabrication
          const index = attributes.indexOf("_");
          const rowKey = attributes.slice(index + 1);
          omniRowObject[attributes] =
            item.attribute_value[rowKey] != null
              ? item.attribute_value[rowKey]
              : "";
        }
        omniRowObject["overall_buy_units"] =
          item.attribute_value.buy_units != null
            ? Math.round((item.attribute_value.buy_units * 100) / 100).toFixed()
            : "";
        for (let planIndex = 1; planIndex <= totalPlans; planIndex++) {
          if (
            planNameToCode["plan" + planIndex] === item.destination_plan_code
          ) {
            item.planKey = "plan" + planIndex;
          }
        }
      });
      // sorting for getting plan1 first
      row.sort((item1, item2) =>
        item1.planKey.localeCompare(item2.planKey || "-")
      );
      //To format plan level data into table row object
      for (const item of row) {
        const key = item.planKey;
        if (item.destination_plan_code === planNameToCode[key]) {
          omniRowObject[key + "_choice"] =
            item.destination_choice_id !== "null"
              ? item.destination_choice_id
              : "";
          omniRowObject[key + "_units"] =
            item.destination_attribute_value.plan_buy_units != null
              ? Math.round(
                  (item.destination_attribute_value.plan_buy_units * 100) / 100
                ).toFixed()
              : "";
        }
      }
      //Add remaining column metrics after the plan values to have same column order in excel that of table
      row.forEach((item) => {
        for (const metric in OmniMappingMetrics) {
          if (metric !== "overall_buy_units") {
            omniRowObject[metric] =
              item.attribute_value[OmniMappingMetrics[metric]] !== null
                ? item.attribute_value[OmniMappingMetrics[metric]]
                : "";
          }
        }
      });
      return omniRowObject;
    });
    return tabledata;
  };