import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import Form from "core/Utils/form";
import { Card } from "@mui/material";
import GlobalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import Charts from "core/Utils/charts";
import {
  getClusterMapViewData,
  setClusterMapViewData,
} from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { set1_2_Loader } from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as finalizeClusterServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";

const MapView = (props) => {
  const globalClasses = GlobalStyles();
  const classes = useStyles();
  const [mapViewFilters, setMapViewFilters] = useState({});
  const [mapViewOptions, setMapViewOptions] = useState({});

  const handleChange = (updatedData) => {
    setMapViewFilters(updatedData["region"]);
    props.getClusterMapViewDetails(updatedData["region"]);
  };

  useEffect(() => {
    if (props.mapviewOptions) {
      setMapViewOptions(props.mapviewOptions);
    }
  }, [props.mapviewOptions]);

  useEffect(() => {
    return () => {
      setMapViewOptions({});
    };
  }, []);

  return (
    <>
      <div className={classes.typographyMarginBottom}>
        <Form
          layout={"vertical"}
          maxFieldsInRow={3}
          handleChange={handleChange}
          fields={props.mapViewFilterConfig}
          updateDefaultValue={true}
          defaultValues={mapViewFilters}
          handleDropdownClose={true}
        />
      </div>
      {!isEmpty(mapViewOptions) && mapViewOptions?.series?.length > 0 ? (
        <Charts options={mapViewOptions} mapView={true} />
      ) : (
        <Card className={`${globalClasses.paper} ${globalClasses.scroll}`}>
          <div className={classes.headerDiv}> No data available</div>
        </Card>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    isLoading: finalizeClusterServiceActions.loader_1_2Selector(store),
  };
};
const mapActionsToProps = {
  getClusterMapViewData,
  setClusterMapViewData,
  set1_2_Loader,
  addSnack,
};
export default connect(mapStateToProps, mapActionsToProps)(withRouter(MapView));
