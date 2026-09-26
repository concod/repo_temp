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
import {
  getMappedStoresInProduct,
  getMappedStoresInProductGroup,
} from "../services-product-mapping/productMappingService";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import Loader from "../../../Utils/Loader/loader";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import AgGridTable from "core/Utils/agGrid";
import { prepareMappedStoresOrProductsViewData } from "core/pages/storeMapping/components/common-mapping-functions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { isArray } from "lodash";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";

const SetAll = (props) => {
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [isTableGrouped, setIsTableGrouped] = useState(false);

  /**
   *
   * @param {stores response object from the API} stores
   * @returns array of records with time_period and their respective store codes
   */
  const prepareGroupedData = (stores) => {
    let groupedData = [];
    stores.data.forEach((storeData) => {
      storeData.validity.forEach((time_range) => {
        groupedData.push({
          ...storeData,
          time_period: `${time_range[0]} - ${time_range[1]}`,
        });
      });
    });
    return groupedData;
  };
  useEffect(() => {
    const setOptions = async () => {
      try {
        let cols = await getColumnsAg(
          `table_name=${
            props.dimension === "product"
              ? "view_mapped_stores_product_mapping"
              : "mapped_stores_table_product_mapping"
          }`
        )();
        const isTimePeriodPresent = isColumnPresent(cols, "time_period");
        //time period grouping
        cols = cols.map((col) => {
          if (col.column_name === "store_id" && isTimePeriodPresent) {
            setIsTableGrouped(true);
            col.cellRenderer = "agGroupCellRenderer";
          } else if (
            col.column_name === "store_code" &&
            cols.findIndex((col) => col.column_name === "store_id") === -1 &&
            isTimePeriodPresent
          ) {
            setIsTableGrouped(true);
            col.cellRenderer = "agGroupCellRenderer";
          }
          return col;
        });
        if (props.dimension === "product") {
          let body = {
            filters: [],
            meta: {
              range: [],
              sort: [],
              search: [],
              limit: { limit: 10, page: 1 },
            },
          };
          const { data: stores } = await getMappedStoresInProduct(
            body,
            !props.checked
              ? [props.selectedID.product_code]
              : [props.selectedID.aggregation_code],
            !props.checked ? "product" : "aggregation"
          )();
          setRowData(prepareGroupedData(stores));
        } else {
          let body = {
            filters: [],
            meta: {
              range: [],
              sort: [],
              search: [],
              limit: { limit: 10, page: 1 },
            },
          };

          const { data: stores } = await getMappedStoresInProductGroup(
            body,
            props.selectedID.pg_code
          )();
          setRowData(prepareGroupedData(stores));
          let productcodeCol = [
            {
              aggregate: null,
              column_name: "product_code",
              dimension: "Product",
              extra: null,
              footer: null,
              formatter: null,
              is_aggregated: false,
              is_editable: false,
              is_frozen: false,
              is_hidden: false,
              is_required: false,
              is_row_span: false,
              is_searchable: true,
              label: dynamicLabelsBasedOnTenant("product_id", "core"),
              order_of_display: 2,
              sub_headers: [],
              tc_code: 90,
              tc_mapping_code: 2000,
              type: "str",
            },
          ];
          productcodeCol = agGridColumnFormatter(productcodeCol);
          cols.splice(1, 0, ...productcodeCol);
        }
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
    let body = {
      filters: [],
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
    };
    try {
      if (props.dimension === "product") {
        const { data: stores } = await getMappedStoresInProduct(
          body,
          !props.checked
            ? [props.selectedID.product_code]
            : [props.selectedID.aggregation_code],
          !props.checked ? "product" : "aggregation"
        )();

        stores.data = prepareMappedStoresOrProductsViewData(stores.data);
        setRowData(stores.data);
        setLoading(false);
        return {
          data: stores.data,
          totalCount: stores.total,
        };
      } else {
        const { data: stores } = await getMappedStoresInProductGroup(
          body,
          props.selectedID.pg_code
        )();
        stores.data = prepareMappedStoresOrProductsViewData(stores.data);
        stores.data = stores.data.map((timeRange) => {
          return {
            ...timeRange,
            rowId: timeRange["product_code"] + "-" + timeRange["store_code"],
          };
        });

        setRowData(stores.data);
        setLoading(false);
        return {
          data: stores.data,
          totalCount: stores.total,
        };
      }
    } catch (err) {
      setLoading(true);
    }
  };

  const onClickModify = () => {
    let modifyProductsList = { selectedProducts: [] };
    let selectedProducts = {};

    if (props.dimension === "product") {
      if (!props.checked) {
        selectedProducts = { product_code: props.selectedID.product_code };
      } else {
        if (props.isAggregated) {
          selectedProducts = {
            product_code: props.selectedID.aggregation_code,
          };
        } else {
          selectedProducts = props.selectedID?.products.map((product) => ({
            product_code: product,
          }));
        }
      }
    } else {
      selectedProducts = { pg_code: props.selectedID.pg_code };
    }

    if (isArray(selectedProducts)) {
      modifyProductsList.selectedProducts = selectedProducts;
    } else {
      modifyProductsList.selectedProducts.push(selectedProducts);
    }

    props.onModify(modifyProductsList);
  };

  return (
    <Dialog
      onClose={() => onCancel()}
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
                props.dimension === "product" ? "store_code" : "rowId"
              }
              isServerSideGroupOpenByDefault={(params) => {
                return true;
              }}
              childKey={"validities"}
              purgeClosedRowNodes={true}
              treeData={isTableGrouped}
              groupDisplayType={"custom"}
              noRowOverlayMessage="No mapped stores present"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              onCancel();
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => onClickModify()}
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
