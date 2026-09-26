/**
 * Shared helpers for parent/child  table row selections (onSelectionChanged).
 */

export const getChildRowFields = (node) => ({
  key: node.data?.key,
  start_date: node.data?.start_date,
  end_date: node.data?.end_date,
  wos: node.data?.wos,
  min_stock: node.data?.min_stock,
  max_stock: node.data?.max_stock,
  parent: node.parent?.data?.key,
});

export const getPartiallySelectedParentIds = (api) => {
  const ids = new Set();
  api?.forEachNode?.((node) => {
    if (node.selected && node.level !== 0 && node.parent) {
      ids.add(node.parent.id);
    }
  });
  return ids;
};

export const isParentRowByLevel = (node) => node?.level === 0;

export const getRulesParentRowFields = (node) => ({
  rule_code: node.data?.rule_code,
  psa_code: node.data?.psa_code,
  rcl_code: node.data?.rcl_code,
  is_default: node.data?.is_default,
  is_article_level: node.data?.is_article_level,
});

export const getExceptionStoreParentRowFields = (node) => ({
  rule_code: node.data?.rule_code,
  psa_code: node.data?.psa_code,
  store_code: node.data?.store_code,
});

const EMPTY_SELECTION = {
  selectedRows: [],
  deSelections: [],
  nestedSelection: [],
  selectedParents: [],
  allSelectedNodes: [],
  hasSelectedChildRow: false,
};

export const collectConstraintGridSelection = ({
  api,
  event,
  isParentRow,
  getParentRowFields,
  deselectionFields = ["rule_code", "psa_code"],
}) => {
  if (!api?.forEachNode) {
    return EMPTY_SELECTION;
  }

  const parentNodesById = new Map();
  const addedParentIds = new Set();
  const partiallySelectedParentIds = new Set();
  const allSelectedNodes = [];
  const deselectedChildren = [];

  api.forEachNode((node) => {
    const isParent = isParentRow(node);

    if (isParent) {
      parentNodesById.set(node.id, node);
      if (node.selected) {
        addedParentIds.add(node.id);
        allSelectedNodes.push({
          key: node.data?.key,
          isParent,
          ...getParentRowFields(node),
        });
      }
      return;
    }

    if (node.selected) {
      if (node.parent) {
        partiallySelectedParentIds.add(node.parent.id);
      }
      allSelectedNodes.push({ isParent, ...getChildRowFields(node) });
      return;
    }

    if (node.data) {
      deselectedChildren.push(getChildRowFields(node));
    }
  });

  // Adding partially selected parents
  partiallySelectedParentIds.forEach((parentId) => {
    if (addedParentIds.has(parentId)) {
      return;
    }
    const parentNode = parentNodesById.get(parentId);
    if (!parentNode) {
      return;
    }
    allSelectedNodes.push({
      key: parentNode.data?.key,
      isParent: true,
      ...getParentRowFields(parentNode),
    });
  });

  const selectedParents = allSelectedNodes.filter((node) => node.isParent);
  const hasSelectedChildRow = allSelectedNodes.some((node) => !node.isParent);

  const selectedRows = selectedParents.map(
    ({ key, isParent, ...ruleFields }) => ruleFields
  );

  const isDeselectedRow = (node) =>
    !node.selected &&
    deselectionFields.every((field) => node.data?.[field]);

  const deSelections =
    event?.api
      ?.getRenderedNodes()
      ?.filter(isDeselectedRow)
      ?.map((rowNode) =>
        Object.fromEntries(
          deselectionFields.map((field) => [field, rowNode.data?.[field]])
        )
      ) ?? [];

  const nestedSelection = selectedParents.map((parent) => ({
    ...parent,
    constraint: deselectedChildren.filter(
      (child) => child.parent === parent.key
    ),
  }));

  return {
    selectedRows,
    deSelections,
    nestedSelection: hasSelectedChildRow ? nestedSelection : [],
    selectedParents,
    allSelectedNodes,
    hasSelectedChildRow,
  };
};
