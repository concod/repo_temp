import { Panel } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";

const tagPanelCardDesign = makeStyles(() => ({
  tagContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    "& .inv-tag-card-container": {
      borderRadius: "8px",
      background: colours.white,
      boxShadow: "0 0  4px 0 rgba(0, 0, 0, 0.12)",
      padding: "20px",
      height: "64px",
      "& .inv-tag-card-title": {
        color: colours.lightNeutrals,
        fontFamily: "Manrope",
        fontSize: "16px",
        fontWeight: 600,
        lineHeight: "24px",
      },
    },
  },
}));

const TagPanel = (props) => {
  const classes = tagPanelCardDesign();

  return (
    <Panel
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      minWidth={375}
      title="Style Color ID"
    >
      <div className={classes.tagContainer}>
        {props.data &&
          props.data.map((item) => (
            <div key={item} className="inv-tag-card-container">
              <div className="inv-tag-card-title">{item}</div>
            </div>
          ))}
      </div>
    </Panel>
  );
};

export default TagPanel;
