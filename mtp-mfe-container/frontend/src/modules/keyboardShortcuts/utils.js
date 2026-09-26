export const formatShortcutsTableData = (data, tabValue) => {
  if (data?.[tabValue] && Array.isArray(data?.[tabValue])){
    const result = data?.[tabValue]?.map((item) => {
      return {
        action: item?.action_title,
        action_description: item?.action_description,
        keys: Array.isArray(item?.keys) ? item.keys.join("+") : ""
      };
    });
    return result;
  }
  return [];
};