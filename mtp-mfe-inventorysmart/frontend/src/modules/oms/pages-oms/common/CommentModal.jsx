import React, { useState, useEffect } from "react";
import { Modal, TextArea, Select, Loader } from "impact-ui-v3";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import { fetchPredefinedComments } from "modules/oms/services-oms/common/common-services";

const customStyles = makeStyles({
  separatorContainer: {
    display: "flex",
    textAlign: "center",
    alignItems: "center",
    margin: "10px 0",
  },
  separatorLine: {
    flex: 1,
    border: "none",
    borderTop: "1px solid #ccc",
    margin: "0",
  },
  separatorSpan: {
    color: "#666",
    fontWeight: "bold",
    margin: "0 10px",
  },
});

const CommentModal = ({
  open,
  onClose,
  onSubmit,
  title = "Add a comment",
  instructionMessage = "Please add a Order comment to proceed.",
  buttonLabel = "Apply and Approve",
  characterLimit = 300,
  textAreaPlaceholder = "Enter text",
  dropdownPlaceholder = "Select a pre-defined comment",
}) => {
  const customClasses = customStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [customComments, setCustomComments] = useState("");
  const [currentOptions, setCurrentOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      if (!open) return;

      setIsLoading(true);
      try {
        const response = await fetchPredefinedComments();
        if (response?.data?.status && response?.data?.data) {
          // Transform API response to dropdown format
          const data = response.data.data;
          let formattedOptions = [];

          if (Array.isArray(data)) {
            formattedOptions = data.map((item) => {
              if (typeof item === "string") {
                return { label: item, value: item };
              }
              return { label: String(item), value: String(item) };
            });
          }
          setCurrentOptions(formattedOptions);
        }
      } catch (error) {
        console.error("Error fetching predefined comments:", error);
        setCurrentOptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedOptions({});
      setCustomComments("");
      setIsOpenViewBy(false);
    }
  }, [open]);

  const onSelectClear = () => {
    setSelectedOptions({});
    setCustomComments("");
  };

  const fetchCustomComments = (event) => {
    const value = event.target.value;
    if (value.length <= characterLimit) {
      setCustomComments(value);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        selectedComment: selectedOptions,
        customComment: customComments,
      });
      setSelectedOptions({});
      setCustomComments("");
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = () => {
    return isEmpty(selectedOptions) && isEmpty(customComments?.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="medium"
      aria-labelledby="comment-modal"
      onPrimaryButtonClick={handleSubmit}
      primaryButtonLabel={buttonLabel}
      primaryButtonProps={{
        disabled: isSubmitDisabled() || isSubmitting,
      }}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={onClose}
    >
      {instructionMessage && (
        <Typography variant="h4" sx={{ display: "block" }}>
          {instructionMessage}
        </Typography>
      )}
      <div style={{ marginTop: "1rem" }}>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            {currentOptions.length > 0 && (
              <>
                <Select
                  id="predefined-comment-select"
                  currentOptions={currentOptions}
                  setCurrentOptions={setCurrentOptions}
                  initialOptions={currentOptions}
                  selectedOptions={selectedOptions}
                  setSelectedOptions={setSelectedOptions}
                  isOpen={isOpenViewBy}
                  setIsOpen={setIsOpenViewBy}
                  isClearable
                  onClearAll={() => onSelectClear()}
                  handleChange={(option) => setCustomComments(option.label)}
                  label={dropdownPlaceholder}
                  placeholder={`Select a comment`}
                />
                <div className={customClasses.separatorContainer}>
                  <hr className={customClasses.separatorLine} />
                  <span className={customClasses.separatorSpan}>OR</span>
                  <hr className={customClasses.separatorLine} />
                </div>
              </>
            )}

            <div>
              <TextArea
                characterLimit={characterLimit}
                defaultValue=""
                height="120px"
                width="550px"
                maxRows={5}
                label="Enter a custom comment here..."
                placeholder={textAreaPlaceholder}
                value={customComments}
                onChange={(e) => fetchCustomComments(e)}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CommentModal;

