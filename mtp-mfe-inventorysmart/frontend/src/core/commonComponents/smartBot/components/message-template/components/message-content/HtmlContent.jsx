import { useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  htmlContentContainer: {
    width: "100%",
    "& *": {
      boxSizing: "border-box",
    },
  },
}));

const HtmlContent = ({ bodyText }) => {
  const classes = useStyles();
  const containerRef = useRef(null);
  const content = bodyText?.content || "";

  useEffect(() => {
    if (containerRef.current && content) {
      const sanitizedHtml = DOMPurify.sanitize(content, {
        ADD_TAGS: ["style", "details", "summary"],
        ADD_ATTR: ["open", "target", "rel", "class", "style"],
        ALLOW_DATA_ATTR: true,
        FORCE_BODY: true,
        WHOLE_DOCUMENT: false,
      });
      containerRef.current.innerHTML = sanitizedHtml;
    }
  }, [content]);

  if (!content) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={classes.htmlContentContainer}
    />
  );
};

export default HtmlContent;
