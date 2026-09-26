import { CHILDREN } from "../../masterplan.constant";

export const getFormattedData = (showHideData) => {
  return showHideData.map((row) => {
    return row.map((item) => {
      const updatedItem = {
        ...item,
        isChecked: item.is_checked,
        isEditable: item.is_editable,
        isVisible: item.is_visible
      };
      if (updatedItem.hasOwnProperty(CHILDREN)) {
        updatedItem.children = updatedItem.children.map((child) => {
          return {
            ...child,
            isChecked: child.is_checked,
            isEditable: item.is_editable,
            isVisible: item.is_visible
          };
        });
      }
      return updatedItem;
    });
  });
};
