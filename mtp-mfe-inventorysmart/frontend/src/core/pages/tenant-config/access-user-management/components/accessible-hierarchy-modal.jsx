import Loader from "core/Utils/Loader/loader";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  DialogContent,
} from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";
import Paper from "@mui/material/Paper";
import { getAccessHierachyData } from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { Modal, useTranslation } from "impact-ui-v3";
import { useStyles as sharedStyles } from "./styles-tenant-user-mgmt";
import { pxToRem } from "core/Utils/functions/utils";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";

const useStyles = makeStyles((theme) => ({
  footer: {
    padding: theme.typography.pxToRem(15),
    justifyContent: "center",
  },
  modalContainer: {
      minWidth: pxToRem(1260),
  },
}));
const AccessibleHierarchyModal = (props) => {
  const { applicationNameInView } = props;
  const { t } = useTranslation();
  const [accessibleDeptTableColumns, setAccessibleDeptTableColumns] = useState(
    []
  );
  const [accessibleDeptTableData, setAccessibleDeptTableData] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [applicationCode, setApplicationCode] = useState(null);
  const dispatch = useDispatch();
  const sharedClasses = sharedStyles();
  const classes = useStyles();

  useEffect(() => {
    getInitialData();

    return () => {
      setAccessibleDeptTableColumns([]);
      setAccessibleDeptTableData([]);
    };
  }, []);

  const getApplicationCode = (applicationName) => {
    try {
      const {
        applicationCode: applicationCodeValue,
      } = getCurrentApplicationDetails(applicationName);
      return applicationCodeValue;
    } catch (error) {
      console.error(error);
    }
  };

  const getInitialData = async () => {
    setShowLoader(true);
    try {
      let applicationCode = getApplicationCode(applicationNameInView);
      let configColumns = await props.getTableConfig(applicationCode);
      let formattedColumns = agGridColumnFormatter(configColumns.data?.data);
      let rowdata = await getAccessHierachyData(props.hierarchyId, applicationCode);
      const dataWithUniqueId = rowdata?.data?.data?.map((item, index) => ({
        ...item,
        uniqueRowId: `${index}-${item.id}`,
      }));
      setAccessibleDeptTableData(dataWithUniqueId);
      setAccessibleDeptTableColumns(formattedColumns);
      setShowLoader(false);
    } catch (error) {
      console.error(error);
      setShowLoader(false);
      displaySnackMessages(t("snackbarMessages.somethingWentWrong"), "error");
    }
  };

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  return (
    <div>
      <Modal
        className={classes.modalContainer}
        open={true}
        onClose={() => props.closeModal()}
        onPrimaryButtonClick={() => {}}
        onSecondaryButtonClick={() => props.closeModal()}
        primaryButtonLabel=""
        primaryButtonProps={{
          disabled: true,
        }}
        secondaryButtonLabel={t("uam.hierarchy.cancel")}
        size="medium"
        title={t("uam.hierarchy.title")}
      >
        <DialogContent
          classes={{
            root: sharedClasses.content,
          }}
        >
          <Loader loader={showLoader}>
            <div className={sharedClasses.contentBody}>
              <Paper elevation={0}>
                {accessibleDeptTableColumns.length > 0 && (
                  <AgGridComponent
                    rowdata={accessibleDeptTableData}
                    columns={accessibleDeptTableColumns}
                    uniqueRowId={"uniqueRowId"}
                    sizeColumnsToFitFlag
                    hideTableActions
                  />
                )}
              </Paper>
            </div>
          </Loader>
        </DialogContent>
      </Modal>
    </div>
  );
};

export default AccessibleHierarchyModal;
