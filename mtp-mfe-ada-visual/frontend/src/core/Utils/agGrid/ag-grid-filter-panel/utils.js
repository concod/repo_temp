
export const shouldSubTotalBeDisplayed = (
  dropdownData,
  selectedOptions,
  fields,
  nodeField
) => {
  try {
   let unSelectedValues = getDiffInArrays(dropdownData, selectedOptions);
   let fieldsWithOnlyValues = fields.map((field) => field.value);
   let shouldDisplay = true;
   for (let index = 0; index < unSelectedValues.length; index++) {
     let indexOfUnSelectedField =
       fieldsWithOnlyValues.indexOf(unSelectedValues[index]) - 1;
     if (fieldsWithOnlyValues[indexOfUnSelectedField] === nodeField) {
       shouldDisplay = false;
       break;
     }
   }
   return shouldDisplay
  } catch (error) {
    console.error("shouldSubTotalBeDisplayed error", error);
  }
};


export const getDiffInArrays = (arr1, arr2) => {
  try {
    // Create a set of values from the second array for quick lookup
    const valuesInArr2 = new Set(arr2?.map((obj) => obj.value));

    // Filter out objects from the first array that are not in the second array
    const missingValues = arr1
      .filter((obj) => !valuesInArr2.has(obj.value))
      .map((obj) => obj.value);

    return missingValues;
  } catch (error) {
    console.error("getDiffInArrays error", error);
  }
};

export const removeObjectByValue = (
  arrayOfObjects,
  objectToDeleteFromArray
) => {
  try {
    const updatedArray = arrayOfObjects.filter((item) => item.value !== objectToDeleteFromArray.value);
    return updatedArray;
  } catch (error) {
    console.error("removeObjectByValue error", error);
  }
};

export const getUniqueItems = (items) => {
  const uniqueValues = new Set();
  return items.filter(item => {
    if (!uniqueValues.has(item.value)) {
      uniqueValues.add(item.value);
      return true;
    }
    return false;
  });
};
