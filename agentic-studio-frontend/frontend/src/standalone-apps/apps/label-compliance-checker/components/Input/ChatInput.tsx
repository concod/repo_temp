import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "../../store/index";
import { Dialog } from "../../../../../components/Modal";
import CameraInput from "./CameraInput";

interface ChatInputProps {
  onSendMessage: (message: string, file?: File) => Promise<void>;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const { isWaitingForResponse } = useChatStore();

  // File utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isValidFileType = (fileName: string): boolean => {
    const acceptedTypes = ["pdf", "ai", "eps", "svg", "png", "jpg", "jpeg"];
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    return acceptedTypes.includes(fileExtension || "");
  };

  // File handling functions
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB in bytes

    // Validate file type
    if (!isValidFileType(file.name)) {
      alert(
        `Invalid file type. Please upload one of these file types:\nPDF, AI, EPS, SVG, PNG, JPG`
      );
      e.target.value = ""; // Clear the input
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      alert("File size exceeds 10MB limit. Please choose a smaller file.");
      e.target.value = ""; // Clear the input
      return;
    }

    setUploadedFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = async () => {
    const message = inputValue.trim();
    if ((!message && !uploadedFile) || isWaitingForResponse || isSubmitting)
      return;

    setIsSubmitting(true);
    setInputValue("");

    try {
      await onSendMessage(message, uploadedFile || undefined);
      // Clear file after successful submission
      if (uploadedFile) {
        handleRemoveFile();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = isWaitingForResponse || isSubmitting;
  const canSubmit = (inputValue.trim() || uploadedFile) && !isDisabled;

  return (
    <div className="psp-sop-input-container">
      {/* File display area */}
      {uploadedFile && (
        <div className="file-info-display" id="file-info-display">
          <div className="file-info">
            <i className="fas fa-file-alt file-icon"></i>
            <div className="file-details">
              <span className="file-name" id="file-name-display">
                {uploadedFile.name}
              </span>
              <span className="file-size" id="file-size-display">
                ({formatFileSize(uploadedFile.size)})
              </span>
            </div>
          </div>
          <motion.button
            className="cancel-file-btn"
            id="cancel-file-btn"
            onClick={handleRemoveFile}
            disabled={isDisabled}
            whileHover={!isDisabled ? { scale: 1.1 } : {}}
            whileTap={!isDisabled ? { scale: 0.9 } : {}}
            aria-label="Remove file"
          >
            <i className="fas fa-times"></i>
          </motion.button>
        </div>
      )}

      <div className="psp-sop-chat-input">
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder={
            isDisabled ? "Processing your request..." : "Ask question"
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isDisabled}
          rows={1}
          aria-label="Message input"
        />

        <div className="upload-dropdown">
          <motion.button
            className="upload-dropdown--trigger"
            disabled={isDisabled}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <i className="fas fa-upload"></i>
          </motion.button>
          <div
            ref={dropdownRef}
            className={`upload-dropdown--content ${
              isDropdownOpen ? "open" : ""
            }`}
          >
            <Dialog open={isCameraOpen} setOpen={setIsCameraOpen}>
              <Dialog.Trigger className="upload-dropdown--item">
                <i className="fa-solid fa-camera"></i>
                <span className="dropdown__text">Capture Photo</span>
              </Dialog.Trigger>
              <Dialog.Content className="camera-container">
                <CameraInput
                  closeModal={() => {
                    setIsCameraOpen(false);
                    setIsDropdownOpen(false);
                  }}
                  setUploadedFile={setUploadedFile}
                />
              </Dialog.Content>
              <Dialog.Overlay />
            </Dialog>
            <button
              className="upload-dropdown--item"
              onClick={() => {
                handleFileUpload();
                setIsDropdownOpen(false);
              }}
            >
              <i className="fa-solid fa-folder-open"></i>
              <span className="dropdown__text">Upload Label</span>
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          id="file-upload-input"
          accept=".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <motion.button
          className="send-button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.05 } : {}}
          whileTap={canSubmit ? { scale: 0.95 } : {}}
          aria-label="Send message"
        >
          {isSubmitting ? (
            <div
              className="spinner-white"
              style={{ width: "16px", height: "16px" }}
            />
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </motion.button>
      </div>

      <div className="psp-sop-copyright">
        A product of{" "}
        <a
          href="https://app.impact-agents.ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          Agentic Retail Automation Platform
        </a>
      </div>
    </div>
  );
};
