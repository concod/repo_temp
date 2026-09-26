import { Typography } from "@mui/material";
import { connect } from "react-redux";
import { useTranslation } from "impact-ui-v3";

const ModuleWorkflowView = (props) => {
  const { t } = useTranslation();

  return (
    <div>
      <Typography variant="h5" style={{ padding: "20px" }} gutterBottom>
        {t("moduleConfigurator.screen.title")}
      </Typography>
    </div>
  );
};

const mapStateToProps = (state) => {};

const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(ModuleWorkflowView);
