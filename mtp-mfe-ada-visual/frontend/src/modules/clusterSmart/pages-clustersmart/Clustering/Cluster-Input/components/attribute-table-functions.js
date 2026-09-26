import {
  isEcomPlan,
  isWholesalePlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";

export const checkMinAttributes = (
  props,
  performanceRows,
  productRows,
  attributes
) => {
  if (isEcomPlan(props.planDetails)) {
    return productRows.length >= attributes.product_attributes.min_selection;
  }
  return (
    performanceRows.length >= attributes.performance_attributes.min_selection &&
    productRows.length >= attributes.product_attributes.min_selection
  );
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
