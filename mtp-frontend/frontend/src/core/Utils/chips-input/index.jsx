import React from "react";
// import { MixedTags } from "@yaireo/tagify/dist/react.tagify";
// import "@yaireo/tagify/dist/tagify.css";
import { Typography } from "@mui/material";

const MixedModeTagify = (props) => {
  // Tagify settings object
  const settings = {
    pattern: /@/, // <- must define "patten" in mixed mode
    duplicates: true,
    dropdown: {
      enabled: 0,
      position: "text",
    },
    whitelist: props.tagsInfo,
  };

  const onBlur = (e) => {
    props.onBlur(e);
  };
  return (
    <>
      {props.tagsInfo && (
        <>
          {/* <MixedTags
            settings={settings}
            className="myTags"
            tagifyRef={props.tagifyRef}
            readOnly={props.isReadonly}
            onBlur={onBlur}
            defaultValue={props.value}
          /> */}
          <Typography variant="subtitle1" component="p" align="right">
            Enter{" "}
            <Typography component="span" color="primary">
              @
            </Typography>{" "}
            to use system generated tags.
          </Typography>
        </>
      )}
    </>
  );
};

export default MixedModeTagify;
