import { Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import StoreGroupsTable from "./components/viewGroups";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
const Store_Grouping_Screen = (props) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  const prevScr = location.state?.prevScr;
  const navigate = useNavigate();
  const routeOptions = [
    {
      id: "store_grp_home_scr",
      label: `${dynamicLabelsBasedOnTenant("Store", "core")} Grouping`,
      action: () => null,
    },
  ];

  const navigateToPrev = () => {
    navigate(prevScr);
  };

  return (
    <>
      <StoreGroupsTable
        prevScr={prevScr}
        {...props}
        id="storeGrpingGrpsTable"
        roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
      />
      <div
        className={`${globalClasses.centerAlign} ${globalClasses.marginTop}`}
      >
        {prevScr && (
          <Button onClick={navigateToPrev} variant="primary">
            Cancel
          </Button>
        )}
      </div>
    </>
  );
};

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = () => {
  return {};
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Store_Grouping_Screen);
