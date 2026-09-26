import { useEffect, useState } from "react";
import { fetchFoldersInBucketAPI } from "modules/marksmart/services-marksmart/dashboard/dashboard-service";
import { connect } from "react-redux";
import FolderCard from "./folder-card";
import { Container, Grid, Paper } from "@mui/material";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  formatFileHierarchy,
  compareByYearMonth,
} from "modules/marksmart/utils-marksmart";
import LoadingOverlay from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { isEmpty } from "lodash";
import { useHistory } from "react-router";

const Marksmart = (props) => {
  const globalClasses = globalStyles();
  const history = useHistory();
  const [dashboardFiles, setdashboardFiles] = useState([]);
  const [fileHierarchy, setfileHierarchy] = useState([]);
  const [dashboardLoader, setdashboardLoader] = useState(false);
  /**
   * On Mount Use Effect
   * On Mounting, we call the fetch folders API which lists the folders
   * Then we call the table config API for the display files table
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      setdashboardLoader(true);
      const marksmartDashboardViewResponse = await props.fetchFoldersInBucketAPI(
        props?.match?.params?.year ? props.match.params.year : ""
      );

      let files = marksmartDashboardViewResponse?.data?.data;
      files = files?.folder_list?.filter(
        (file) =>
          file.file_type === "Folder" ||
          file.file_type === "folder" ||
          file.file_type === "directory"
      ); // To display only the set of folders classified as folders or directories
      if (!isEmpty(files)) files.sort(compareByYearMonth);
      setdashboardFiles(files);
      setdashboardLoader(false);
    };
    fetchDashboardData();
    if (props?.match?.params?.year) {
      setfileHierarchy([
        formatFileHierarchy("Home", () =>
          history.push(`/mark-smart/dashboard`)
        ),
        formatFileHierarchy(`${props?.match?.params?.year}`, null),
      ]);
    } else {
      setfileHierarchy([formatFileHierarchy("Home", null)]);
    }
  }, []);

  const viewRepository = (file) => {
    props.history.push(
      `/mark-smart${
        file.parent_path === "/" ? file.parent_path : file.parent_path + "/"
      }${file.name}`
    );
  };
  const spacingBreakPoints = { xs: 1, md: 2 };
  const columnsBreakPoints = { xs: 4, sm: 8, md: 12 };

  return (
    <>
      <HeaderBreadCrumbs options={fileHierarchy || []} />
      <Container maxWidth={false}>
        <LoadingOverlay loader={dashboardLoader} spinner>
          <Paper className={globalClasses.paper}>
            <Grid
              container
              spacing={spacingBreakPoints}
              columns={columnsBreakPoints}
            >
              {dashboardFiles?.map((file, index) => (
                <Grid item xs={2} sm={2} md={2} key={index}>
                  <FolderCard
                    folderName={file.name}
                    folderTag={file.tag}
                    path={file}
                    onClick={viewRepository}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </LoadingOverlay>
      </Container>
    </>
  );
};

const mapActionsToProps = {
  fetchFoldersInBucketAPI,
};
export default connect(null, mapActionsToProps)(Marksmart);
