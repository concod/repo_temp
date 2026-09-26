import {
  isEcomPlan,
  isWholesalePlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";

export const checkMinAttributes = (
  props,
  performanceRows,
  productRows,
  storeRows,
  attributes,
  attributeSelection
) => {
  let minSelectionValid = true;
  if (isEcomPlan(props.planDetails)) {
    return productRows.length >= attributes.product_attributes.min_selection;
  }
  if (attributeSelection["performance"] && minSelectionValid) {
    minSelectionValid =
      performanceRows.length >= attributes.performance_attributes.min_selection;
  }
  if (attributeSelection["product"] && minSelectionValid) {
    minSelectionValid =
      productRows.length >= attributes.product_attributes.min_selection;
  }
  if (attributeSelection["store"] && minSelectionValid) {
    minSelectionValid =
      storeRows.length >= attributes.store_attributes?.min_selection;
  }
  return minSelectionValid;
};

export const onSelectionChangedPerformaceAttribute = (
  event,
  props,
  performanceAttributes,
  setSelectedPerformacePlans
) => {
  // fetch all selected rows
  let selectedPerfRow = event.api.getSelectedRows(), //this array will have whole preformance row which is selected
    selectedPerfAttr = []; //this array will have all selected performance attribute names
  if (isWholesalePlan(props.planDetails)) {
    // for wholesale channel all performance attribute should be frozen
    selectedPerfRow = [...performanceAttributes];
    selectedPerfAttr = [];
    selectedPerfRow.forEach((data) => {
      selectedPerfAttr.push(data.attribute_name);
    });
  } else {
    selectedPerfRow.forEach((data) => {
      selectedPerfAttr.push(data.attribute_name);
    });
  }
  props.setSelectedPerformanceAttributes(selectedPerfRow);
  setSelectedPerformacePlans(selectedPerfAttr);
};
export const onSelectionChangedProductAttribute = (
  event,
  props,
  frozenProductAttr,
  setSelectedProductPlans
) => {
  // fetch all selected rows
  let selectedProdRow = event.api.getSelectedRows(), //this array will have whole product row which is selected
    selectedProdAttr = []; //this array will have all selected product attribute names

  selectedProdRow.forEach((data) => {
    selectedProdAttr.push(data.attribute_name);
  });
  frozenProductAttr?.forEach((frozProd) => {
    //selling collection is a frozen attribute it can't be unselected
    if (!selectedProdAttr.includes(frozProd)) {
      selectedProdAttr.push(frozProd);
    }
  });
  props.setSelectedProductAttributes(selectedProdRow);
  setSelectedProductPlans(selectedProdAttr);
};

export const onSelectionChangedStoreAttribute = (
  event,
  props,
  frozenStoreAttr,
  setSelectedStorePlans
) => {
  // fetch all selected rows
  let selectedStoreRow = event.api.getSelectedRows(), //this array will have whole product row which is selected
    selectedStoreAttr = []; //this array will have all selected product attribute names

  selectedStoreRow.forEach((data) => {
    selectedStoreAttr.push(data.attribute_name);
  });
  frozenStoreAttr?.forEach((frozProd) => {
    //selling collection is a frozen attribute it can't be unselected
    if (!selectedStoreAttr.includes(frozProd)) {
      selectedStoreAttr.push(frozProd);
    }
  });
  props.setSelectedStoreAttributes(selectedStoreRow);
  setSelectedStorePlans(selectedStoreAttr);
};
