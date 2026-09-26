import { useState, useEffect, useRef } from "react";
import { Button, BottomSheet } from "impact-ui-v3";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import DownloadIcon from "@mui/icons-material/Download";
import {
  viewMappedStores,
  downloadMappingData,
  getMappedStoresInProduct,
} from "../services-product-mapping/productMappingService";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import Loader from "../../../Utils/Loader/loader";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import { isEmpty } from "lodash";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getTenantTimeZoneDetails } from "../../../commonComponents/coreComponentScreen/utils";
import moment from "moment";

const SetAll = (props) => {
  const [confirmBox, showConfirmBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState([]);
  const [isTableGrouped, setIsTableGrouped] = useState(false);
  const [downloadDisabled, setDownloadDisabled] = useState(true);
  const [metaPayload, setMetaPayload] = useState({});
  const globalClasses = globalStyles();
  const tableInstance = useRef();
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const isPsMappingUseRuleListFlow =
    props.inventorysmartScreenConfig?.inventorysmart_configuration
      ?.ps_mapping_use_rules_list_flow === false;

  /**
   *
   * @param {stores response object from the API} stores
   * @returns array of records with time_period and their respective store codes
   */
  const prepareGroupedData = (data) => {
    data.forEach((storeData, index) => {
      storeData.unique_row_id = `${storeData.psa_name}_${storeData.ship_code}_${storeData.itinerary_id}_${index}`;
      let groupedData = [];
      storeData.validity.forEach((time_range) => {
        if (isPsMappingUseRuleListFlow) {
          storeData.time_period = `${moment(time_range[0]).format(tenantDateFormat || "MM-DD-YYYY")} - ${moment(time_range[1]).format(tenantDateFormat || "MM-DD-YYYY")}`;
        } else {
          groupedData.push({
            from_date: time_range[0],
            to_date: time_range[1],
          });
          storeData.validities = [...groupedData];
          storeData.from_date = time_range[0];
          storeData.to_date = time_range[1];
          delete storeData.validity;
        }
      });
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
        `table_name=${
          isPsMappingUseRuleListFlow
            ? "view_mapped_stores_product_mapping"
            : "view_mapped_store_tier_ps_mapping"
        }`
      )();
      const isTimePeriodPresent = isColumnPresent(cols, "validity");
      cols = cols.map((col) => {
        if (
          (col.column_name === "psa_name" ||
            col.column_name ===
              props?.inventorysmartScreenConfig?.inventorysmart_configuration
                ?.drillDown?.defaultTableGroupColumn) &&
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
      const meta = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let body = {
        rule_code: [props.selectedID.rule_code],
        filters: props.filters,
        ...meta,
      };
      setMetaPayload(meta);
      let resp;
      if (isPsMappingUseRuleListFlow) {
        delete body.rule_code;
        resp = await getMappedStoresInProduct(
          body,
          !props.checked
            ? [props.selectedID.product_code]
            : [props.selectedID.aggregation_code],
          !props.checked ? "product" : "aggregation"
        )();
      } else {
        resp = await viewMappedStores(body);
      }
      setLoading(false);
      if (resp.data?.data?.length) {
        setDownloadDisabled(false);
      }
      return {
        data: prepareGroupedData(resp.data.data),
        totalCount: resp.data.total,
      };
    } catch (err) {
      props.handleErrorMessage(err);
      setLoading(false);
    }
  };

  const displaySnackMessages = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const dowloadData = async () => {
    const origin = window.location.origin;
    setLoading(true);
    try {
      let payload = {
        table_payload: {
          rule_code: [props.selectedID.rule_code],
          columns: columns.flatMap((col) => {
            //if collapsible columns are present, then we need to iterate over the sub_headers and return the column_name and label
            if(col.sub_headers && col.sub_headers.length > 0 && col.column_name !== "validity"){
              return col.sub_headers.map((subCol) => {
                return {
                  column_name: subCol.column_name,
                  label: subCol.label,
                };
              });
            }
            else{
              return {
                column_name: col.column_name,
                label: col.label,
              };
            }
          }),
          filters: props.filters,
          ...metaPayload,
        },
        table_api: `${origin}/api/v2/core/rcl-mapping/store`,
      };
      payload.table_payload.meta.limit = {
        limit: 100000,
        page: 1,
      };
      const resp = await downloadMappingData(payload);
      displaySnackMessages(
        resp?.data?.message ||
          "Download initiated, you will recieve a notification shortly.",
        "success"
      );
      setLoading(false);
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong.",
        "error"
      );
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      onClose={() => props.onCancel()}
      open={true}
      title={dynamicLabelsBasedOnTenant("mapped_stores", "core")}
      primaryButtonLabel={"Modify"}
      secondaryButtonLabel={"Cancel"}
      onPrimaryButtonClick={() => props.onModify([props.selectedID])}
      onSecondaryButtonClick={() => props.onCancel()}
      primaryButtonProps={{
        disabled:
          !props.hasEditPermissions ||
          props?.disableModify ||
          props.selectedID?.checkbox_disabled,
      }}
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
              uniqueRowId="unique_row_id"
              isServerSideGroupOpenByDefault={(params) => {
                return true;
              }}
              childKey={"validities"}
              purgeClosedRowNodes={true}
              treeData={isTableGrouped}
              groupDisplayType="custom"
              suppressColumnVirtualisation={true}
              onColumnGroupOpened={(params) => {
                params.api.resizeGridColumns(params);
              }}//resize columns to fit content when column group is opened
              showDownloadButton = {props.showDownloadBtn && !downloadDisabled}
              onDownloadButtonClick = {() => dowloadData()}
            />
          )}       
      </Loader>
    </BottomSheet>
  );
};

const mapStateToProps = (state) => {
  return {
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SetAll);
