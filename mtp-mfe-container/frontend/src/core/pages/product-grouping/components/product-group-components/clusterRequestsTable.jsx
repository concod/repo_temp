// import {
//   Button,
//   Dialog,
//   DialogContent,
//   DialogActions,
//   LinearProgress,
//   DialogTitle,
// } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { getColumnsAg } from "../../../../actions/tableColumnActions";
import {
  setRequestTableColumns,
  ToggleLoader,
} from "core/pages/product-grouping/product-grouping-service";
import { firebaseobj } from "../../../../../auth/firebase";
import { EventSourcePolyfill } from "event-source-polyfill";
import { BASE_API } from "config/api";
import AgGrid from "core/Utils/agGrid";
import { cloneDeep } from "lodash";
import {Modal,Loader} from "impact-ui-v3";
const ClusterRequestsTable = (props) => {
  const [clustersData, setclustersData] = useState([]);
  const [showLoader, setshowLoader] = useState(false);
  const viewResults = (requestData) => {
    props.handleClose(requestData);
  };
  let sse = useRef(null);
  let cancel = useRef(false);
  useEffect(() => {
    //Establish the connection

    const fetchData = async () => {
      if (props.requestTableCols.length === 0) {
        setshowLoader(true);
        let cols = await props.getColumnsAg("table_name=cluster_jobs");
        cols = cols.map((col) => {
          col.is_frozen = false;
          col.is_required = false;
          col.pinned = null;
          return col;
        });
        props.setRequestTableColumns(cloneDeep(cols));
      }
    };
    const startServerSideFunction = async () => {
      const user = firebaseobj.auth().currentUser;
      let token = null;
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (error) {
          return;
        }
      }
      sse.current = new EventSourcePolyfill(
        `${BASE_API}/core/group/${props.dimension}/cluster/poll`,
        {
          headers: {
            Authorization: `${token}`,
          },
        }
      );
      console.log(sse);
      sse.current.onmessage = (e) => {
        if (cancel.current) {
          return;
        }
        setshowLoader(true);
        let data = JSON.parse(e.data);
        data = data.filter((req) => {
          return req.cluster_type === props.selectedGroupType;
        });
        data = data.map((indData) => {
          indData.results = "View";
          return indData;
        });
        setclustersData(data);
        setshowLoader(false);
      };
    };
    fetchData();
    startServerSideFunction();
  }, []);
  useEffect(() => {
    return () => {
      cancel.current = true;
      if (sse.current != null) {
        sse.current.close();
      }
    };
  }, []);
  const modifyColumns = (cols) => {
    let updatedCols = cloneDeep(cols);
    updatedCols = updatedCols.map((col) => {
      if (col.column_name === "results") {
        col.disabled = (data, colId) => {
          return data?.status !== "completed";
        };
      }
      return col;
    });
    return updatedCols;
  };

  const onViewBtnClick = (params) => {
    viewResults(params.data);
  };
  return (
    <>
      <Modal
        open={props.open}
        onClose={() => props.handleClose()}
        title={`Clusters Status - ${props.selectedGroupType} type`}
        primaryButtonLabel="Close"
        onPrimaryButtonClick={() => props.handleClose()}
      >
        {showLoader && <Loader />}
        {props.requestTableCols.length > 0 && (
            <AgGrid
              columns={modifyColumns(props.requestTableCols)}
              rowdata={clustersData}
              uniqueRowId={"id"}
              onReviewClick={onViewBtnClick}
            />
          )}
      </Modal>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    requestTableCols: state.productGroupReducer.requestTableCols,
  };
};
const mapActionsToProps = {
  getColumnsAg,
  setRequestTableColumns,
  ToggleLoader,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(ClusterRequestsTable);
