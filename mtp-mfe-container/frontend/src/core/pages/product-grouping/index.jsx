import { useEffect } from "react";
import ProductGroupsTable from "./components/product-group-components/viewGroups";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";

/**
 * Product Grouping Screen
 * Linked Route - /product-grouping
 * Components Present:
 * Title, Filters, Groups Table, Create/Edit Group,
 * Group Definitions - Create/Edit
 * @param {*} props
 */

const Product_Grouping_Screen = (props) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (
      props.activeAppName === "inventorysmart" &&
      !props.path.includes("/inventory-smart/store-eligibility-grouping")
    ) {
      navigate("/inventory-smart/store-eligibility-grouping/product-grouping");
    }
  }, []);

  return (
    <>
      {/* <PageRouteTitles options={routeOptions} /> */}
      <ProductGroupsTable
        {...props}
        roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
      />
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    activeAppName: state.sideBarReducer.activeAppName,
  };
};
const mapActionsToProps = () => {
  return {};
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(Product_Grouping_Screen);
