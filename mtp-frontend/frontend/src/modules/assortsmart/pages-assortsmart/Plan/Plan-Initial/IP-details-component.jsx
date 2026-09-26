import React, { useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Popover } from "@mui/material";
import { makeStyles } from "@mui/styles";
import InfoIcon from "@mui/icons-material/Info";
import LoadingOverlay from "core/Utils/Loader/loader";
import { groupBy } from "lodash";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const useStyles = makeStyles({
  header: {
    flex: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& .MuiSvgIcon-root": {
      marginLeft: "0.6rem",
    },
  },
  content: {
    margin: "1rem",
  },
});

const IPDetailsComponent = (props) => {
  const [isOpen, setIsOpen] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ipDetails, setIpDetails] = useState([]);
  const classes = useStyles();

  const handlePopOver = (event) => {
    setIsLoading(true);
    setIsOpen(event.currentTarget);
    let groupedClusters = groupBy(props.storeEligibilityData, "cluster_display_name");
    let details = groupedClusters?.[props.displayName]
      ? groupedClusters[props.displayName]
      : [];
    setIpDetails(details);
    setIsLoading(false);
  };

  const closePopOver = () => {
    setIsOpen(null);
  };
  return (
    <>
      <div className={classes.header}>
        <p>{props.displayName}</p>
        <InfoIcon
          id="IPDetails"
          onClick={handlePopOver}
          className="icon-blue"
        />
        <Popover
          id="IPDetails"
          anchorEl={isOpen}
          open={Boolean(isOpen)}
          onClose={closePopOver}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <LoadingOverlay loader={isLoading}>
            <div className={classes.content}>
              {!ipDetails?.length ? (
                <p>No IP Details</p>
              ) : (
                <h4>{props.displayName}</h4>
              )}
              {ipDetails?.length &&
                ipDetails.map((details) => {
                  return (
                    <>
                      <h4>{replaceSpecialCharacter(details.l3_name)}</h4>
                      {details.attribute_value.map((attribute) => {
                        return <p>{attribute}</p>;
                      })}
                    </>
                  );
                })}
            </div>
          </LoadingOverlay>
        </Popover>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    storeEligibilityData: planInitialServiceActions.ClusterStoreEligibilitySelector(
      state
    ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
  };
};

export default connect(mapStateToProps, {})(withRouter(IPDetailsComponent));
