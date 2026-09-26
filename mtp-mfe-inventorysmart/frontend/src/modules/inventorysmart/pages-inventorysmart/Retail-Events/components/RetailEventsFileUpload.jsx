import { useEffect, useState } from "react";
import { Button, FileUpload } from "impact-ui-v3";
import {
  downloadRetailEventsTemplate,
  uploadRetailEvents,
} from "modules/inventorysmart/services-inventorysmart/Retail-Events/retail-events-service";
import { RETAIL_EVENTS_TEMPLATE_FILE_TYPES } from "../constants";
import { getUploadSummary } from "../utils";

const buildErrorFileItem = (summary) => {
  if (!summary?.file || !(summary.rejected > 0)) return null;
  return {
    file: summary.file,
    failed: true,
    failedMessage: `${summary.rejected} Errors Found`,
  };
};

/**
 * Drag & drop uploader with template download.
 * When an upload has only rejected rows, keeps the file card with
 * "N Errors Found" + View (no download) so the user can open Preview.
 */
const RetailEventsFileUpload = ({
  onUploaded,
  onCancel,
  onError,
  onViewErrors,
  uploadSummary,
  showHeader = true,
  width = "550px",
  height,
  className,
}) => {
  const [fileList, setFileList] = useState(() => {
    const errorItem = buildErrorFileItem(uploadSummary);
    return errorItem ? [errorItem] : [];
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const errorItem = buildErrorFileItem(uploadSummary);
    if (!errorItem) return;
    setFileList((current) => {
      const hasPendingUpload = current.some(
        (item) => !item.failed && !item.isUploadRunning
      );
      if (hasPendingUpload || isUploading) return current;
      return [errorItem];
    });
  }, [uploadSummary?.batchId]);

  const hasValidationErrors = fileList.some(
    (item) => item.failed && /Errors Found$/i.test(item.failedMessage || "")
  );
  const hasPendingFile = fileList.some(
    (item) => !item.failed && !item.isUploadRunning
  );

  const reset = () => setFileList([]);

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  const handleFileListChange = (list) => {
    // Keep dropzone visible while an error card is shown (numberOfFiles=2),
    // but only ever retain the latest selected file for upload.
    if (list.length > 1) {
      setFileList([list[list.length - 1]]);
      return;
    }
    setFileList(list);
  };

  const handleTemplateDownload = async (fileType) => {
    try {
      await downloadRetailEventsTemplate(fileType);
    } catch (error) {
      onError?.(error);
    }
  };

  const handleUpload = async () => {
    const pending = fileList.find((item) => !item.failed);
    if (!pending || isUploading) return;

    try {
      setIsUploading(true);
      setFileList([{ ...pending, isUploadRunning: true }]);

      const formData = new FormData();
      formData.append("file", pending.file);
      const response = await uploadRetailEvents(formData);
      const summary = {
        ...getUploadSummary(response?.data?.data),
        file: pending.file,
      };

      if (summary.success === 0 && summary.rejected > 0) {
        setFileList([
          {
            file: pending.file,
            failed: true,
            failedMessage: `${summary.rejected} Errors Found`,
          },
        ]);
      } else {
        reset();
      }
      onUploaded?.(summary);
    } catch (error) {
      setFileList(([item]) =>
        item
          ? [
              {
                ...item,
                isUploadRunning: false,
                failed: true,
                failedMessage: error?.response?.data?.message,
              },
            ]
          : []
      );
      onError?.(error);
    } finally {
      setIsUploading(false);
    }
  };

  const viewErrorsButton = (
    <Button variant="url" onClick={onViewErrors}>
      View
    </Button>
  );

  return (
    <FileUpload
      className={className}
      fileList={fileList}
      onFileListChange={handleFileListChange}
      // 2 while an error card is present so the dropzone stays visible (screenshot).
      numberOfFiles={hasValidationErrors && !hasPendingFile ? 2 : 1}
      showHeader={showHeader}
      showCloseIcon={false}
      headerTitle="Upload Your File"
      headerSubtitle=""
      customFailedActionButton={
        hasValidationErrors && onViewErrors ? viewErrorsButton : undefined
      }
      primaryButtonLabel={hasPendingFile || isUploading ? "Upload" : undefined}
      primaryButtonProps={{
        disabled: !hasPendingFile || isUploading,
        loading: isUploading,
      }}
      onPrimaryButtonClick={handleUpload}
      secondaryButtonLabel={
        hasPendingFile || isUploading ? "Cancel" : undefined
      }
      onSecondaryButtonClick={handleCancel}
      validFileTypes={RETAIL_EVENTS_TEMPLATE_FILE_TYPES.map((fileType) => ({
        fileType,
        templateDownloader: () => handleTemplateDownload(fileType),
        typeOverride: false,
      }))}
      width={width}
      height={height}
    />
  );
};

export default RetailEventsFileUpload;
