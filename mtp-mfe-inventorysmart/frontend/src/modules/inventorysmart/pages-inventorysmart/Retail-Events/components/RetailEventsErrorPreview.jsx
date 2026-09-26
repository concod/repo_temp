import { useState } from "react";
import { useDispatch } from "react-redux";
import { isEmpty } from "lodash";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import { Badge, BottomSheet, Button, Menu } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import colours from "core/Styles/colours";
import { BottomSheetFooter } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import {
  downloadRetailEventsErrorRecords,
  fetchRetailEventsErrorRecords,
} from "modules/inventorysmart/services-inventorysmart/Retail-Events/retail-events-service";
import {
  RETAIL_EVENTS_MESSAGES,
  RETAIL_EVENTS_STAGING_TABLE_NAME,
  RETAIL_EVENTS_STAGING_UNIQUE_ROW_ID,
  RETAIL_EVENTS_TEMPLATE_FILE_TYPES,
} from "../constants";
import { getStagingRows, isErrorCell, withDerivedDates } from "../utils";
import { useRetailEventsColumns } from "../hooks/useRetailEventsColumns";

const withErrorCellStyle = (column) => ({
  ...column,
  cellStyle: (params) =>
    isErrorCell(params)
      ? {
          backgroundColor: colours.wispPink,
          color: colours.errorRed,
        }
      : null,
});

/**
 * "Preview" bottom sheet listing the rejected rows of the last upload batch
 * with error cells highlighted, download-with-errors and re-upload.
 */
const RetailEventsErrorPreview = ({
  open,
  onClose,
  uploadSummary,
  pageSize,
  onReUpload,
  onError,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const columns = useRetailEventsColumns(
    RETAIL_EVENTS_STAGING_TABLE_NAME,
    withErrorCellStyle
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const manualCallBack = async (body, pageIndex) => {
    if (pageIndex === 0) setIsLoading(true);
    try {
      const response = await dispatch(
        fetchRetailEventsErrorRecords({
          batch_id: uploadSummary?.batchId,
          is_download: false,
          meta: { ...body, limit: { limit: pageSize, page: pageIndex + 1 } },
        })
      );
      return {
        data: withDerivedDates(getStagingRows(response)),
        totalCount: response?.data?.total,
      };
    } catch (error) {
      onError?.(error);
      return { data: [] };
    } finally {
      if (pageIndex === 0) setIsLoading(false);
    }
  };

  const handleDownload = async (fileType) => {
    setDownloadMenuAnchor(null);
    try {
      setIsDownloading(true);
      await downloadRetailEventsErrorRecords(uploadSummary?.batchId, fileType);
      onSuccess?.(RETAIL_EVENTS_MESSAGES.downloadStarted);
    } catch (error) {
      onError?.(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadMenuOptions = RETAIL_EVENTS_TEMPLATE_FILE_TYPES.map(
    (fileType) => ({
      label: fileType.toUpperCase(),
      onClick: () => handleDownload(fileType),
    })
  );

  const topRightOptions = (
    <>
      <Badge
        label={`${uploadSummary?.rejected ?? 0}/${uploadSummary?.total ?? 0} Reviews Found`}
        color="error"
        variant="subtle"
        size="medium"
      />
      <Button
        variant="secondary"
        icon={<DownloadIcon />}
        loading={isDownloading}
        onClick={(event) => setDownloadMenuAnchor(event.currentTarget)}
      >
        Download With Errors
      </Button>
      <Menu
        anchorEl={downloadMenuAnchor}
        open={Boolean(downloadMenuAnchor)}
        onClose={() => setDownloadMenuAnchor(null)}
        options={downloadMenuOptions}
      />
      <Button variant="secondary" onClick={onReUpload}>
        Re-Upload
      </Button>
    </>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={RETAIL_EVENTS_MESSAGES.previewTitle}
      height="600px"
      maxHeight="calc(100vh - 64px)"
      footerOptions={<BottomSheetFooter onCancel={onClose} />}
    >
      {open && (
        <Loader loader={isLoading || isEmpty(columns)} minHeight="380px">
          {!isEmpty(columns) && (
            <AgGridComponent
              key={uploadSummary?.batchId}
              tableHeader={RETAIL_EVENTS_MESSAGES.tableHeader}
              columns={columns}
              manualCallBack={manualCallBack}
              rowModelType="infinite"
              pagination={false}
              cacheBlockSize={pageSize}
              cacheOverflowSize={2}
              hideSelectCurrentPageRecords
              hideHeaderCheckboxComponent
              domLayout="normal"
              height="380px"
              uniqueRowId={RETAIL_EVENTS_STAGING_UNIQUE_ROW_ID}
              topRightOptions={topRightOptions}
              suppressClickEdit
            />
          )}
        </Loader>
      )}
    </BottomSheet>
  );
};

export default RetailEventsErrorPreview;
