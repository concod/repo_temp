import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { BottomSheet, Button } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { createTableHeader } from "modules/oms/utils-oms/utils";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import {
  fetchExpeditePoSummaryTableConfig,
  fetchExpeditePoSummaryTableData,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";

const ExpeditePoSummaryBottomSheet = ({
  open,
  onClose,
  requestPayload,
  article,
}) => {
  const dispatch = useDispatch();
  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [loader, setLoader] = useState(false);

  const displaySnackMessages = (message, variant = "error") => {
    dispatch(addSnack({ message, options: { variant } }));
  };

  useEffect(() => {
    let cancelled = false;

    const fetchPoSummary = async () => {
      setLoader(true);
      setColumns([]);
      setRowData([]);
      try {
        const [configResponse, dataResponse] = await Promise.all([
          dispatch(fetchExpeditePoSummaryTableConfig()),
          dispatch(fetchExpeditePoSummaryTableData(requestPayload)),
        ]);
        if (cancelled) return;

        const formattedColumns = agGridColumnFormatter(
          configResponse?.data?.data,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );
        setColumns(formattedColumns);

        const rawRows =
          dataResponse?.data?.data?.result ??
          dataResponse?.data?.data?.data ??
          [];
        const rows = Array.isArray(rawRows) ? rawRows : [];
        setRowData(agGridRowFormatter(rows));
      } catch (error) {
        console.error(error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        if (!cancelled) setLoader(false);
      }
    };

    fetchPoSummary();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestPayload]);

  return (
    <BottomSheet
      label="Default"
      open={open}
      onClose={onClose}
      title="PO Summary"
      onPrimaryButtonClick={onClose}
      onSecondaryButtonClick={onClose}
      footerOptions={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <LoadingOverlay
        loader={loader}
        wrapperPosition="static"
        isCustomLoader={true}
      >
        {columns.length > 0 && (
          <AgGridComponent
            rowdata={rowData}
            columns={columns}
            selectAllHeaderComponent={false}
            showSaveTableConfig={false}
            onGridChanged
            showSkeleton={true}
            onRowSelected
            cacheBlockSize={10}
            tableHeader={
              article ? createTableHeader("Master SKU ID", article) : undefined
            }
            noRowOverlayMessage="No data found"
          />
        )}
      </LoadingOverlay>
    </BottomSheet>
  );
};

export default ExpeditePoSummaryBottomSheet;
