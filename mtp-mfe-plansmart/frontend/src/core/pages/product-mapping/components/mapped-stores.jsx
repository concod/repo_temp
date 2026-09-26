import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
} from "@mui/material";
import { viewMappedStores } from "../services-product-mapping/productMappingService";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import Loader from "../../../Utils/Loader/loader";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import { isEmpty } from "lodash";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";

const SetAll = (props) => {
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState([]);
  const [isTableGrouped, setIsTableGrouped] = useState(false);
  const tableInstance = useRef();

  /**
   *
   * @param {stores response object from the API} stores
   * @returns array of records with time_period and their respective store codes
   */
  const prepareGroupedData = (data) => {
    data.forEach((storeData) => {
      let groupedData = [];
      storeData.validity.forEach((time_range) => {
        groupedData.push({
          from_date: time_range[0],
          to_date: time_range[1],
        });
      });
      storeData.validities = [...groupedData];
      delete storeData.validity;
    });
    return data;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    tableInstance.current?.api?.refreshServerSideStore({ purge: true });
  }, [props.selectedID]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let cols = await getColumnsAg(
        `table_name=view_mapped_store_tier_ps_mapping`
      )();
      const isTimePeriodPresent = isColumnPresent(cols, "validity");
      cols = cols.map((col) => {
        if (col.column_name === "psa_name" && isTimePeriodPresent) {
          setIsTableGrouped(true);
          col.cellRenderer = "agGroupCellRenderer";
        }
        return col;
      });
      setColumns(cols);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, pageSize) => {
    setLoading(true);
    if (isEmpty(props.selectedID)) {
      setLoading(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    try {
      let body = {
        rule_code: [props.selectedID.rule_code],
        filters: props.filters,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      const resp = await viewMappedStores(body);
      setLoading(false);
      return {
        data: prepareGroupedData(resp.data.data),
        totalCount: resp.data.total,
      };
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <Dialog
      onClose={() => props.onCancel()}
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      {confirmBox && (
        <ConfirmBox
          onClose={() => showConfirmBox(false)}
          onConfirm={() => {
            showConfirmBox(false);
            props.handleClose();
          }}
        />
      )}
      <Loader loader={loading}>
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Mapped stores
            <IconButton
              aria-label="close"
              onClick={() => props.onCancel()}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          {columns.length > 0 && (
            <AgGridTable
              columns={columns}
              sizeColumnsToFitFlag
              onGridChanged
              onRowSelected
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              loadTableInstance={(instance) => {
                tableInstance.current = instance;
              }}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId="psa_name"
              isServerSideGroupOpenByDefault={(params) => {
                return true;
              }}
              childKey={"validities"}
              purgeClosedRowNodes={true}
              treeData={isTableGrouped}
              groupDisplayType="custom"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              props.onCancel();
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => props.onModify([props.selectedID])}
            color="primary"
            disabled={
              props?.disableModify || props.selectedID?.checkbox_disabled
            }
          >
            Modify
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
};

export default SetAll;
