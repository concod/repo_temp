import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import {
  getMappedProductsInSTore,
  getMappedProductsInStoreGroup,
} from "../services/storeMappingService";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import Loader from "../../../Utils/Loader/loader";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import { prepareMappedStoresOrProductsViewData } from "./common-mapping-functions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";

const useStyles = makeStyles((theme) => ({
  root: {
    borderRadius: "8px",
    "& .MuiDialog-paperWidthSm": {
      minWidth: "60%",
    },
  },
  confirmBox: {
    "& .MuiDialog-paper": {
      borderRadius: "10px 10px 6px 6px",
    },
  },
}));

const SetAll = (props) => {
  const classes = useStyles();
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);
  const [isTableGrouped, setIsTableGrouped] = useState(false);

  useEffect(() => {
    const setOptions = async () => {
      try {
        const tableName = `mapped_product${
          props.dimension === "store_groups" ? "_store_groups" : ""
        }`;
        let cols = await getColumnsAg(`table_name=${tableName}`)();
        const isTimePeriodPresent = isColumnPresent(cols, "time_period");

        //time period grouping
        cols = cols.map((col) => {
          if (
            (col.column_name === "product_code" ||
              col.column_name === "article") &&
            isTimePeriodPresent
          ) {
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
    setOptions();
  }, []);

  const onCancel = () => {
    props.onCancel();
  };
  const manualCallBack = async (manualbody, pageIndex, pageSize) => {
    setLoading(true);
    try {
      const queryParams = `?level=${
        props.isAggregated ? "aggregation" : "product"
      }&page=${pageIndex + 1}`;

      if (props.dimension === "store") {
        let body = {
          filters: [],
          meta: {
            ...manualbody,
            limit: {
              limit: 10,
              page: pageIndex + 1,
            },
          },
        };
        const { data: products } = await getMappedProductsInSTore(
          body,
          props.selectedID.store_code,
          queryParams
        )();
        products.data = prepareMappedStoresOrProductsViewData(products.data);
        setLoading(false);
        return {
          data: products.data,
          totalCount: products.total,
        };
      } else {
        let body = {
          filters: [],
          meta: {
            ...manualbody,
            limit: {
              limit: 10,
              page: pageIndex + 1,
            },
          },
        };
        const { data: products } = await getMappedProductsInStoreGroup(
          body,
          props.selectedID.sg_code,
          queryParams
        )();
        products.data = prepareMappedStoresOrProductsViewData(products.data);
        products.data = products.data.map((timeRange) => {
          return {
            ...timeRange,
            rowId:
              timeRange[props.isAggregated ? "article" : "product_code"] +
              "-" +
              timeRange["store_code"],
          };
        });
        setLoading(false);
        return {
          data: products.data,
          totalCount: products.total,
        };
      }
    } catch (err) {
      setLoading(true);
    }
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.root}
      maxWidth={"sm"}
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
            {`Mapped ${dynamicLabelsBasedOnTenant("product", "core")}s`}
            <IconButton
              aria-label="close"
              onClick={() => onCancel()}
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
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={
                props.dimension === "store"
                  ? props.isAggregated
                    ? "article"
                    : "product_code"
                  : "rowId"
              }
              childKey={"validities"}
              purgeClosedRowNodes={true}
              treeData={isTableGrouped}
              groupDisplayType={"custom"}
              isServerSideGroupOpenByDefault={(params) => true}
              noRowOverlayMessage={`No mapped ${dynamicLabelsBasedOnTenant(
                "product",
                "core"
              )}s present`}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            id="mappedProductCancelBtn"
            onClick={() => {
              onCancel();
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            id="mappedProductModifyBtn"
            onClick={() => {
              let Obj = {
                selectedStores: [props.selectedID],
              };
              props.onModify(Obj, true);
            }}
            color="primary"
            disabled={!props?.disableModify}
          >
            Modify
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
};

export default SetAll;
