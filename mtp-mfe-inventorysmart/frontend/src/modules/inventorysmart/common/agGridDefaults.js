/**
 * InventorySmart-specific AgGrid default configurations
 * This file patches the AgGridComponent defaults for the entire InventorySmart module
 * without affecting other repos using core as a submodule
 */
import AgGridComponent from "core/Utils/agGrid/agGrid";

// Override default props for InventorySmart
const originalDefaultProps = AgGridComponent.defaultProps || {};

AgGridComponent.defaultProps = {
  ...originalDefaultProps,
  hideRowHeightOptionMenu: false,
  saveTableFormat: true,
};

export default AgGridComponent;
