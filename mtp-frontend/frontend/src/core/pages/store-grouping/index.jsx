import { Button } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import StoreGroupsTable from "./components/viewGroups";
import PageRouteTitles from "./components/PageRouteTitles";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const Store_Grouping_Screen = (props) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  const prevScr = location.state?.prevScr;
  const navigate = useNavigate();
  const routeOptions = [
    {
      id: "store_grp_home_scr",
      label: "Store Grouping",
      action: () => null,
    },
  ];

  const navigateToPrev = () => {
    navigate(prevScr);
  };

  return (
    <>
      <PageRouteTitles id="storeGrpingMainBrdCrmbs" options={routeOptions} />
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
          <Button onClick={navigateToPrev} color="primary" variant="outlined">
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
