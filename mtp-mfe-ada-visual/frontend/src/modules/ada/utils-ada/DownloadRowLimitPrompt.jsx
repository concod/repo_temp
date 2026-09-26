import React from "react";
import { Prompt, useTranslation } from "impact-ui-v3";

const DownloadRowLimitPrompt = (props) => {
  const { t } = useTranslation();
  return (
    <Prompt
      isOpen={props.isOpen}
      children={
        <>
          {t("ada.downloadRowLimit.message", {
            rowCount: props.rowCount ?? "-",
          })}
        </>
      }
      infoList={[]}
      primaryButtonLabel={t("ada.downloadRowLimit.close")}
      // onPrimaryButtonClick={() => {
      //   setShowLengthFileExceedPrompt(false);
      //   setDownloadFileRows("-");
      // }}
      onPrimaryButtonClick={props.onPrimaryButtonClick}
    />
  );
};

export default DownloadRowLimitPrompt;
