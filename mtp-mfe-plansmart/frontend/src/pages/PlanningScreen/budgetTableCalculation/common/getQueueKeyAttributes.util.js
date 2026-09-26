import { get } from "lodash";

export default function ({ queueKey }) {
  const hasProductParent = this.rowData[queueKey.rowInx].parent_index >= 0;

  const hasChannelParent = this.channelRollUpMapping[queueKey.colId];

  const hasProductChild =
    get(this.rowData[queueKey.rowInx], "children_indexes", []).length > 0;

  const isHighestProductHierarchy = !hasProductParent && hasChannelParent;

  const isIntermediateProductHierarchy =
    hasProductParent && hasProductChild && hasChannelParent;

  const hasChannelChild = this.channelRollDownMapping[queueKey.colId];

  const isHighestChannelHierarchy = hasProductParent && !hasChannelParent;

  const isIntermediateChannelHierarchy =
    hasChannelParent && hasChannelChild && hasProductParent;

  return {
    hasProductParent,
    hasChannelParent,
    isHighestProductHierarchy,
    isIntermediateProductHierarchy,
    hasChannelChild,
    isHighestChannelHierarchy,
    isIntermediateChannelHierarchy
  };
}
