import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Popover } from "@mui/material";

import { IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";

const PlanInfo = (props) => {
  const classes = useStyles();
  const [isPopoverOpen, setIsPopoverOpen] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const AGInstance = useRef({});

  const closePopover = () => {
    setIsPopoverOpen(null);
  };
  const onInfoClick = async (event) => {
    setIsPopoverOpen(event.target);
  };
  const fetchDetails = async () => {
    let infoColumns = await getColumnsAg("table_name=silhouette_score_table")();
    setColumns(infoColumns);
    if (infoColumns?.length) {
      let tableData = props.clusterBucketData.bucket_info.map((bucketData) => {
        return {
          bucket_id: bucketData.bucket_id,
          silhouette_score:
            bucketData?.bucket_attribute_value?.silhouette_score,
        };
      });
      setTableData(tableData);
    }
  };

  useEffect(() => {
    if (props.clusterBucketData?.bucket_info) {
      fetchDetails();
    }
  }, [props.clusterBucketData]);

  const loadTableInstance = (params) => {
    AGInstance.current = params;
  };

  return tableData?.length > 0 ? (
    <IconButton
      variant="text"
      color="primary"
      className={classes.iconPadding}
      title="info"
      size="large"
      aria-describedby={`assortDashboardInfoBtn${props?.value || ""}`}
    >
      <InfoIcon
        fontSize="small"
        id={`assortDashboardInfoBtn${props?.value || ""}`}
        onClick={(event) => {
          onInfoClick(event, props.value);
        }}
      />
      <Popover
        id={`assortDashboardInfoBtn${props?.value || ""}`}
        anchorEl={isPopoverOpen}
        open={Boolean(isPopoverOpen)}
        onClose={closePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <div className={classes.divMargin}>
          <AgGridTable
            rowdata={tableData || []}
            columns={columns}
            loadTableInstance={loadTableInstance}
            uniqueRowId="bucket_id"
            sizeColumnsToFitFlag
            sideBar={false}
            pagination={false}
            tableId={"info-table"}
            skipAutoSizeColumn
          />
        </div>
      </Popover>
    </IconButton>
  ) : null;
};
const mapStateToProps = (state) => {
  return {
    planInfoData: planDashboardServiceActions.planInfoSelector(state),
  };
};

const mapActionsToProps = {};
export default connect(mapStateToProps, mapActionsToProps)(PlanInfo);
