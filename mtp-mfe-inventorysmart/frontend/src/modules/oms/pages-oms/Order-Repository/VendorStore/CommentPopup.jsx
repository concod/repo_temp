import React, { useEffect, useState } from "react";
import { Modal, Select, Loader, TextArea } from "impact-ui-v3";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";

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

function CommentPopup(props) {
  const customClasses = customStyles();
  const dispatch = useDispatch();

  const [isLoading, setisLoading] = useState(false);
  const [customComments, setCustomComments] = useState("");
  const [currentOptions, setCurrentOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [isActionButtonClicked, setActionButtonClicked] = useState(false);

  const handleClose = () => {
    props.handleClose();
  };

  useEffect(() => {
    setCurrentOptions(props?.COMMENT_DROPDOWN_VALUES);
  }, []);

  const sendForReview = (isCommentRequired) => {
    if (isCommentRequired && customComments?.length === 0) {
      displaySnackMessages("Please enter a comment", "info");
      return;
    }
    setActionButtonClicked(true);
    if (props?.isCalledFromSendToReview) {
      props?.sendForReview(customComments);
    } else {
      props?.saveComments(customComments);
    }
  };

  const fetchCustomComments = (event) => {
    setCustomComments(event.target.value);
  };

  const displaySnackMessages = (message, variant) => {
    try {
      dispatch(
        addSnack({
          message: message,
          options: {
            variant: variant,
          },
        })
      );
    } catch (error) {
      console.error("displaySnackMessages error", error);
    }
  };

  const onSelectClear = () => {
    setSelectedOptions({});
    setCustomComments("");
  };

  const getPrimaryButtonLabel = () => {
    return props?.isCalledFromSendToReview ? "Send for Review" : "Save Comment";
  };

  const getSecondaryButtonLabel = () => {
    return props?.isCalledFromSendToReview
      ? "Skip & Send for Review"
      : undefined;
  };

  return (
    <Modal
      className=""
      open={props.isOpen}
      onClose={handleClose}
      onPrimaryButtonClick={() => sendForReview(true)}
      onSecondaryButtonClick={() => sendForReview(false)}
      primaryButtonLabel={getPrimaryButtonLabel()}
      secondaryButtonLabel={getSecondaryButtonLabel()}
      primaryButtonProps={{
        disabled: isActionButtonClicked,
      }}
      secondaryButtonProps={{
        disabled: isActionButtonClicked,
      }}
      size="medium"
      height="450px"
      width="600px"
      title="Add a Comment"
    >
      <Typography variant="caption" sx={{ display: "block" }}>
        A comment is required to send this order for review. Please add a
        comment to proceed.
      </Typography>
      <div style={{ marginTop: "1rem" }}>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <Select
              id="predefinedComments"
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
            />
            <div className={customClasses.separatorContainer}>
              <hr className={customClasses.separatorLine} />
              <span className={customClasses.separatorSpan}>OR</span>
              <hr className={customClasses.separatorLine} />
            </div>

            <div>
              <TextArea
                characterLimit={300}
                defaultValue=""
                height="80px"
                width="568px"
                maxRows={5}
                label="Enter a custom comment here..."
                placeholder="Enter text"
                value={customComments}
                onChange={(e) => fetchCustomComments(e)}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default CommentPopup;
