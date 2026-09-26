import React, { useEffect, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import {
  fetchNewStoreAllocationProjections,
  downloadNewStoreAllocationProjections,
} from "modules/inventorysmart/services-inventorysmart/New-Store/new-store-dashboard";
import { connect } from "react-redux";

const ProjectionsTable = (props) => {
  const [projectionData, setProjectionData] = useState([]);
  const [projectionCols, setProjectionCols] = useState([]);

  useEffect(() => {
    const getProjectionDetails = async () => {
      try {
        props.setNewStoreDashboardLoader(true);
        let cols = await getColumnsAg(
          "table_name=new_store_allocation_projections"
        )();
        let reservedData = await props.fetchNewStoreAllocationProjections(
          props.projectedStoreCode
        );
        setProjectionData(reservedData.data.data);
        setProjectionCols(cols);
        props.setNewStoreDashboardLoader(false);
      } catch (e) {
        props.handleErrorMessage(e);
        props.setNewStoreDashboardLoader(false);
      }
    };
    getProjectionDetails();
  }, []);

  const handleDownload = async () => {
    try {
      const response = await props.downloadNewStoreAllocationProjections(props.projectedStoreCode);
      const isSuccess = response?.data?.status !== false;
      props.addSnack({
        message: isSuccess ? "Please wait for download notification to be received shortly" : (response?.data?.message || "Download failed"),
        options: { variant: isSuccess ? "success" : "error" },
      });
    } catch (e) {
      props.addSnack({
        message: e?.response?.data?.message || "Something went wrong",
        options: { variant: "error" },
      });
    }
  };

  return (
    <div>
      <AgGridComponent
        columns={projectionCols}
        rowdata={projectionData}
        uniqueRowId={"projected_id"}
        tableHeader="New Store Allocation Projections"
        closeButton={true}
        handleCloseButtonClick={() => props.handleCloseProjectionsTable()}
        showDownloadButton={true}
        onDownloadButtonClick={handleDownload}
      />
    </div>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    fetchNewStoreAllocationProjections: (id) =>
      dispatch(fetchNewStoreAllocationProjections(id)),
    downloadNewStoreAllocationProjections: (id) =>
      dispatch(downloadNewStoreAllocationProjections(id)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(null, mapDispatchToProps)(ProjectionsTable);
