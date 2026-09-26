import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import React, { useEffect, useState } from "react";
import { replaceSpecialCharacter } from "../../../../../core/Utils/functions/utils";
import { Modal } from "impact-ui-v3";

const Validation = (props) => {
  const globalClasses = globalStyles();
  const [showInValidModal, setShowInValidModal] = useState(false);
  const articlesWithValidationError = props?.articles?.articlesWithValidationError.map(item => replaceSpecialCharacter(item) || "N/A")

  useEffect(() => {
    if (props?.articles?.articlesWithValidationError?.length) {
      setShowInValidModal(true);
    }
  }, [props.articles]);

  const onCloseModalHandler = (p_excludeCallback = false) => {
    setShowInValidModal((value) => !value);
    props?.onCloseModalHandlerCallback &&
      props.onCloseModalHandlerCallback(p_excludeCallback);
  };

  const excludeAllHandler = () => {
    props.excludeAllHandler();
    onCloseModalHandler(true);
  };

  const shouldShowButtons =
    !props?.articles?.validationErrorMessage?.includes("user reserve") &&
    !props?.renderedForAlert;

  return (
    showInValidModal && (
      <Modal
        title="Validation Error"
        onClose={() => onCloseModalHandler()}
        size="medium"
        aria-labelledby="customized-dialog-title"
        open={true}
        fullWidth={true}
        disableEscapeKeyDown={true}
        primaryButtonLabel={shouldShowButtons ? props.label || "Exclude All" : undefined}
        primaryButtonProps={
          shouldShowButtons
            ? {
                onClick: () => {
                  excludeAllHandler();
                },
              }
            : undefined
        }
        secondaryButtonLabel={shouldShowButtons ? "Cancel" : undefined}
        secondaryButtonProps={
          shouldShowButtons
            ? {
                onClick: () => {
                  onCloseModalHandler();
                },
              }
            : undefined
        }
      >
        <Typography 
          variant="h6" 
          className={globalClasses.marginBottom}
          sx={{ 
            wordBreak: "break-word",
            whiteSpace: "normal",
            overflow: "visible"
          }}
        >
          {articlesWithValidationError.join(", ")}
        </Typography>
        <Typography 
          variant="h6" 
          className={globalClasses.marginBottom}
          sx={{ 
            wordBreak: "break-word",
            whiteSpace: "normal",
            overflow: "visible"
          }}
        >
          {props?.articles?.validationErrorMessage}
        </Typography>
      </Modal>
    )
  );
};

export default Validation;
