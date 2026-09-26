import { Typography } from "@mui/material";
import { displaySnackMessages } from "core/Utils/utils";
import { FileUpload, Button, Prompt as IaPrompt } from "impact-ui-v3";
import { isEmpty, isNull } from "lodash";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  filterUploadHandler,
  generateFilterTemplate,
  triggerFilterApply,
  resetHandler,
  primaryBtnHandlerForPrompt,
} from "../utils";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  filterUploadSectionWrapper: {
    boxShadow: `0px 0px 12px 8px #0000000F`,
    width: "100%",
    borderRadius: pxToRem(16),
    "& .ia-fileUpload-container": {
      boxShadow: "none",
    },
  },
  notificationDiv: {
    paddingBottom: pxToRem(16),
  },
  msgLabel: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(20),
    color: theme.palette.text.boldHeadingBlue,
    textTransform: "none",
  },
}));

const FilterUploadSection = ({ props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const { screenName, filterConfigKey } = props;

  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );

  const initialPromptState = {
    isOpen: false,
    title: null,
    message: null,
    data: [],
    status: null,
    downloadUrl: null,
  };

  // States
  const [fileList, setFileList] = useState([]);
  const [promptState, setPromptState] = useState(initialPromptState);

  return (
    <span className={`${classes.filterUploadSectionWrapper}`}>
      <FileUpload
        fileList={fileList}
        numberOfFiles={1}
        onFileListChange={(file) => setFileList(file)}
        onPrimaryButtonClick={() => {
          filterUploadHandler(
            appDetails.applicationCode,
            fileList,
            screenName,
            displaySnackMessages,
            dispatch,
            filterConfigKey,
            setPromptState
          );
        }}
        primaryButtonLabel={!isEmpty(fileList) && "Upload"}
        validFileTypes={[
          {
            fileType: "xlsx",
            templateDownloader: () => generateFilterTemplate(screenName),
            typeOverride: false,
          },
        ]}
      />
      <IaPrompt
        isOpen={promptState?.isOpen}
        title={promptState?.title}
        children={promptState?.message}
        variant={"warning"}
        primaryButtonLabel={
          promptState?.status === "failed" ? "Download" : "Yes"
        }
        secondaryButtonLabel={
          promptState?.status === "failed" ? "Reset" : "Cancel"
        }
        onPrimaryButtonClick={() =>
          primaryBtnHandlerForPrompt(
            setFileList,
            setPromptState,
            initialPromptState,
            promptState,
            filterConfigKey,
            dispatch
          )
        }
        onSecondaryButtonClick={() =>
          resetHandler(setFileList, setPromptState, initialPromptState)
        }
      />
    </span>
  );
};

export default FilterUploadSection;
