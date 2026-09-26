/** Pure helper shared by the OMS filter strip to cascade hierarchy selections */
export const getHierarchyDataResponse = (hierarchyData, selectedData) => {
  const updatedHierarchyData = [];
  for (const key of Object.keys(hierarchyData)) {
    if (selectedData[hierarchyData[key]?.value]?.length === 0) {
      break;
    }
    updatedHierarchyData.push(hierarchyData[key]);
  }
  return updatedHierarchyData;
};
