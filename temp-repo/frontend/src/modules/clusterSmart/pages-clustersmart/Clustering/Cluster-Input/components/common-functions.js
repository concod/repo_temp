import { getStoreChannels } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import { formatStringArray } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
export const configureFiltersResponse = (filters, planInfo) => {
  //This method is used to configure the selected level filters
  //into the format required for the API payload
  return filters.map((filter) => {
    return {
      name: filter.column_name,
      value: planInfo[filter.column_name],
    };
  });
};

//This function is used to configure store dropdown selection
//according to the format required for the custom dropdown
export const configureStoreSelection = (grpCode, storeGrps) => {
  return storeGrps.filter((grp) => {
    return grp.value === grpCode;
  });
};

//Get selected indexes of attributes tables
export const configureAttributeSelection = (metricData) => {
  let selectedRowIds = {};
  metricData.forEach((metric, Idx) => {
    if (metric.is_final) selectedRowIds[Idx] = true;
  });
  return selectedRowIds;
};

//This function is used to get the selected channel on
//initial mount of channel component
export const getSelectedChannel = (planDetails) => {
  if (!planDetails || planDetails.length === 0) {
    return "";
  }
  return planDetails?.data?.channel;
};
/**
 * This function is used to configure attribute table(s) selection according to
 * the payload for the update attributes API
 * @param {*} clusterAttributes
 * @param {*} attribute_type
 * @param {*} selectedAttributes
 * @returns
 */
export const configureAttributeSelectionPayload = (
  clusterAttributes,
  attribute_type,
  selectedAttributes
) => {
  return clusterAttributes?.[attribute_type]?.metrics.map((attrb) => {
    if (
      selectedAttributes.some((sel_attrb) => {
        return sel_attrb.attribute_name === attrb.attribute_name;
      })
    ) {
      return {
        ...attrb,
        is_final: true,
      };
    } else {
      return {
        ...attrb,
        is_final: false,
      };
    }
  });
};

export const getChannelOptions = async (location, screenConfiguration) => {
  const response = await getStoreChannels()();
  let excludeChannels =
    screenConfiguration?.["1.1"]?.["channel_exclude_in_1.1"];
  const channels = response.data.data.channels;
  const excludedChannelsSet = new Set(excludeChannels);
  const includeChannels = [...channels].filter(
    (x) => !excludedChannelsSet.has(x)
  );
  return formatStringArray(includeChannels);
};
