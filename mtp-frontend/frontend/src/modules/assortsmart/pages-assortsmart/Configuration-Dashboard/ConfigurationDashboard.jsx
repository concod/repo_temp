import { Container } from "@mui/material";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

import NewStoreSetup from "./NewStoreSetup";

const ConfigurationDashboard = () => {
  const classes = useStyles();
  return (
    <Container maxWidth={false}>
      <div className={classes.root}>
        <CoreComponentScreen
          showFilterDashboard={false}
          filterConfigKey={``}
          onApplyFilter={() => {}}
          hideSavedFilterMsg={true}
          resetFilterChips={true}
          noUAMFilterDependency={true}
          ignoreSavedFilters={true}
        />
      </div>
      <NewStoreSetup />
    </Container>
  );
};

export default ConfigurationDashboard;
