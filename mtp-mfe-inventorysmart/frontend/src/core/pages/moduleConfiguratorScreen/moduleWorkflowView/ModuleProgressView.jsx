import { Typography } from "@mui/material";
import { connect } from "react-redux";
import { useTranslation } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";

const ModuleProgressView = (props) => {
  const globalClasses = globalStyles();
  const { t } = useTranslation();

  return (
    <div>
      <Typography variant="h5" style={{ padding: "20px" }} gutterBottom>
        {t("moduleConfigurator.workflowView.selectModule")}
      </Typography>
    </div>
  );
};

const mapStateToProps = (state) => {};
const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(ModuleProgressView);
