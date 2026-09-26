import { useEffect, useState, useCallback, useRef } from "react";
import { Checkbox } from "impact-ui-v3";
import { computeSelectionState, handleHeaderCheckboxChange } from "./utils";
import isFunction from "lodash/isFunction";
import { SELECTION_TYPES } from "../../constants";

const SelectAllComponentV3 = (props) => {
  const { api } = props;
  const [selection, setSelection] = useState(SELECTION_TYPES.NONE);
  // Stores requestAnimationFrame ID to cancel pending updates on rapid selection changes
  const rafId = useRef(null);
  // Tracks previous context values to skip redundant forceRender calls
  const prevContextState = useRef({ showBar: false, label: "" });

  const getSelectableNodes = useCallback(() => {
    if (!api) return [];
    return api.getRenderedNodes().filter((node) => {
      if (!node.data) return false;
      const isRowSelectable = isFunction(props.isRowSelectable)
        ? props.isRowSelectable(node)
        : true;
      return isRowSelectable && !node.data.checkbox_disabled && !node.data._hideSelection;
    });
  }, [api, props.isRowSelectable]);

  // Recalculates checkbox state on selectionChanged / paginationChanged via rAF
  const updateCheckboxState = useCallback(() => {
    if (!api) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const selectableNodes = getSelectableNodes();
      const newSelection = computeSelectionState(api, selectableNodes, prevContextState.current);
      setSelection(newSelection);
    });
  }, [api, getSelectableNodes]);

  useEffect(() => {
    if (!api) return;
    api.addEventListener("selectionChanged", updateCheckboxState);
    api.addEventListener("paginationChanged", updateCheckboxState);
    return () => {
      api.removeEventListener("selectionChanged", updateCheckboxState);
      api.removeEventListener("paginationChanged", updateCheckboxState);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [api, updateCheckboxState]);

  // Header checkbox click — toggles all current page rows
  const handleChange = useCallback(() => {
    if (!api) return;
    const selectableNodes = getSelectableNodes();
    const isCheckAll = handleHeaderCheckboxChange(api, selectableNodes);
    if (isCheckAll === null) return;
    setSelection(isCheckAll ? SELECTION_TYPES.ALL : SELECTION_TYPES.NONE);
  }, [api, getSelectableNodes]);

  return (
    <Checkbox
      checked={selection !== SELECTION_TYPES.NONE}
      onChange={handleChange}
      variant={selection === SELECTION_TYPES.PARTIAL ? "dashed" : "default"}
      withoutFormLabel
    />
  );
};

export default SelectAllComponentV3;