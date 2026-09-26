import { useState, useRef } from "react";
import { Modal, Button, Loader } from "impact-ui-v3";
import { uploadFile } from "../../services/chatbot-services";
import UploadIcon from "coreAssets/chatbot/upload_icon.svg";
import { useStyles } from "../../styling.jsx";


function UploadModal(props) {
  const { isUploadModalOpen, setIsUploadModalOpen, displaySnackMessages } = props;
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const classes = useStyles();


  const handleModalClose = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      displaySnackMessages('Please select only PDF files', 'error');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      displaySnackMessages("Please select a PDF file first", "error");
      return;
    }

    try {
      setIsLoading(true);
      // Prepare payload as per the curl example
      const payload = {
        filenames: [selectedFile.name],
        folder_name: "user_manual",
      };

      // Get signed URL
      const signedUrlResponse = await uploadFile(payload);

      if (signedUrlResponse?.data?.data?.files?.[0]?.signed_url) {
        const signedUrl = signedUrlResponse.data.data.files[0].signed_url;

        // Upload file to signed URL using PUT request
        const uploadResponse = await fetch(signedUrl, {
          method: "PUT",
          body: selectedFile,
          headers: {
            "Content-Type": "application/pdf",
          },
        });

        if (uploadResponse.ok) {
          displaySnackMessages("File uploaded successfully", "success");
          handleModalClose();
        } else {
          displaySnackMessages("File uploading failed", "error");
        }
      } else {
        displaySnackMessages("File uploading failed", "error");
      }
    } catch (error) {
      console.error("File upload error:", error);
      displaySnackMessages("File upload failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      onClose={handleModalClose}
      onPrimaryButtonClick={handleFileUpload}
      onSecondaryButtonClick={handleModalClose}
      open={isUploadModalOpen}
      size="small"
      title="Upload Document"
      primaryButtonLabel="Upload"
      secondaryButtonLabel="Cancel"
      primaryButtonProps={{ disabled: isLoading }}
      secondaryButtonProps={{ disabled: isLoading }}
    >
      {isLoading ? (
        <Loader text="Uploading file..."/>
      ) : (
        <div
          className={classes.uploadModalInnerSec}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            style={{ display: "none" }}
            disabled={isLoading}
          />
          <Button
            onClick={() => fileInputRef.current.click()}
            variant="outlined"
            disabled={isLoading}
            //   icon={<UploadIcon/>}
          >
            Select PDF File
          </Button>
          {selectedFile && (
            <p style={{ marginTop: "10px" }}>
              Selected File: {selectedFile.name}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

export default UploadModal;