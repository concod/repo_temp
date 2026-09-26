import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { BottomSheet, Tag } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { fetchDCTransferDcMapping } from "../../../services-inventorysmart/DC-Transfer-Configuration/dc-transfer-configuration-service";
import {
  getBottomSheetGridProps,
  getBottomSheetModalHeight,
  bottomSheetGridContentStyle,
} from "../../../utils-inventorysmart/utilityFunctions";
import {
  FULFILLMENT_TYPE_TAG_MAP,
} from "../../DC-Transfer-Configuration/constants";
import { CREATE_DC_TRANSFER_MAPPING_TABLE_CONFIG_NAME } from "../constants";

const useStyles = makeStyles(() => ({
  bottomSheet: {
    "& .ia_modalBody": {
      padding: "16px 16px 0px 16px !important",
    },
  },
}));

const getFulfillmentTypeTagConfig = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  const directMatch = FULFILLMENT_TYPE_TAG_MAP[normalized];
  if (directMatch) {
    return directMatch;
  }

  const lowerMatch = FULFILLMENT_TYPE_TAG_MAP[normalized.toLowerCase()];
  if (lowerMatch) {
    return lowerMatch;
  }

  return { label: normalized.replace(/_/g, " ") };
};

const DcTransferRuleMappingBottomSheet = (props) => {
  const classes = useStyles();
  const [mappingColumns, setMappingColumns] = useState([]);
  const [mappingData, setMappingData] = useState([]);
  const [loader, setLoader] = useState(false);

  const fulfillmentTypeTag = useMemo(
    () => getFulfillmentTypeTagConfig(props.fulfillmentType),
    [props.fulfillmentType]
  );

  const mappingTableHeader = useMemo(() => {
    if (!props.ruleName && !fulfillmentTypeTag?.label) {
      return null;
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {props.ruleName ? <span>{props.ruleName}</span> : null}
        {props.ruleName && fulfillmentTypeTag?.label ? (
          <span style={{ color: "#8C8C85" }}>|</span>
        ) : null}
        {fulfillmentTypeTag?.label ? (
          <Tag
            label={fulfillmentTypeTag.label}
            size="small"
            variant="solid"
          />
        ) : null}
      </span>
    );
  }, [props.ruleName, fulfillmentTypeTag]);

  const handleErrorMessage = (error) => {
    const errObj = error?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  const fetchMappingColumns = async () => {
    if (mappingColumns.length) {
      return mappingColumns;
    }

    const columns = await getColumnsAg(
      `table_name=${CREATE_DC_TRANSFER_MAPPING_TABLE_CONFIG_NAME}`
    )();
    const formattedColumns = agGridColumnFormatter(
      columns,
      null,
      null,
      undefined,
      false,
      true
    );
    setMappingColumns(formattedColumns);
    return formattedColumns;
  };

  const fetchMappingData = async () => {
    if (!props.ruleId) {
      return;
    }

    try {
      setLoader(true);
      await fetchMappingColumns();

      const response = await props.fetchDCTransferDcMapping(props.ruleId);
      if (!response?.data?.status) {
        displaySnackMessages(
          response?.data?.message || ERROR_MESSAGE,
          "error",
          props
        );
        setMappingData([]);
        return;
      }

      const rows = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setMappingData(
        rows.map((row, index) => ({
          ...row,
          id: row?.id ?? index,
        }))
      );
    } catch (error) {
      handleErrorMessage(error);
      setMappingData([]);
    } finally {
      setLoader(false);
    }
  };

  useEffect(() => {
    if (props.open && props.ruleId) {
      fetchMappingData();
    }

    if (!props.open) {
      setMappingData([]);
    }
  }, [props.open, props.ruleId]);

  const handleClose = () => {
    props.onClose?.();
  };

  const mappingRowCount = mappingData?.length;
  const sheetHeight = getBottomSheetModalHeight(mappingRowCount);

  return (
    <BottomSheet
      open={props.open}
      onClose={handleClose}
      title="Details"
      withExpandIcon={false}
      maxHeight="calc(100vh - 64px)"
      className={classes.bottomSheet}
      {...(sheetHeight ? { height: sheetHeight } : {})}
    >
      <div style={bottomSheetGridContentStyle}>
        <Loader loader={loader} minHeight="0">
          {mappingColumns.length > 0 && (
            <AgGridComponent
              columns={mappingColumns}
              rowdata={mappingData}
              uniqueRowId="id"
              pagination={mappingRowCount > 10}
              paginationPageSize={10}
              cardContainer={false}
              tableHeader={mappingTableHeader}
              suppressClickEdit
              {...getBottomSheetGridProps(mappingRowCount)}
            />
          )}
        </Loader>
      </div>
    </BottomSheet>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  fetchDCTransferDcMapping: (ruleId) =>
    dispatch(fetchDCTransferDcMapping(ruleId)),
});

export default connect(null, mapDispatchToProps)(DcTransferRuleMappingBottomSheet);
