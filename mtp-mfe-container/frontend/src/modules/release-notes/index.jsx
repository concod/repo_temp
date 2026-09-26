import React, { useEffect, useState } from "react";
import { getReleaseNotes } from "modules/release-notes/actions/releaseNotes";
import globalStyles from "core/Styles/globalStyles";
import AgGrid from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Button, useTranslation } from "impact-ui-v3";
import { useNavigate } from "react-router-dom-v5-compat";
import { displaySnackMessages } from "core/Utils/utils";
import { useDispatch } from "react-redux";
import isEmpty from "lodash/isEmpty";
import { TimeCreatedRenderer, UrlRenderer } from "./utils";

const fetchTableData = async (setisLoading, setReleaseNotesCols, releaseNotes) => {
  setisLoading(true);
  let columns = await getColumnsAg("table_name=release_notes")();
  columns = columns.map((col) => {
    if (col.column_name === "timeCreated") {
      return { ...col, cellRenderer: TimeCreatedRenderer };
    }
    if (col.column_name === "url") {
      return { ...col, cellRenderer: UrlRenderer };
    }
    return col;
  });
  setReleaseNotesCols(columns);
  await releaseNotes();
  setisLoading(false);
};


const ReleaseNotes = () => {
  const globalClasses = globalStyles();
  const [notes, setNotes] = useState([]);
  const [releaseNotesCols, setReleaseNotesCols] = useState([]);
  const [isLoading, setisLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const NO_DATA_FOUND = "No Data Found!";

  const releaseNotes = async () => {
    try {
      let files = await getReleaseNotes();
      setNotes(files?.data?.data);
      if (isEmpty(files?.data?.data)) {
        displaySnackMessages(NO_DATA_FOUND, "error", dispatch);
      }
    } catch (err) {
      console.error("Error fetching release notes", err);
      displaySnackMessages(NO_DATA_FOUND, "error", dispatch);
    }
  };
  useEffect(() => {
    console.log("Ran")
    fetchTableData(setisLoading, setReleaseNotesCols, releaseNotes);
  }, []);

  const goBack = () => {
    try {
      navigate(-1);
    } catch (error) {
      console.error("goBack error", error);
    }
  };

  return (
    <div className={globalClasses.paddingAround}>
      <LoadingOverlay loader={isLoading} spinner>
        <AgGrid
          rowdata={notes}
          columns={releaseNotesCols}
          noRowOverlayMessage={t("releaseNotes.noDataFound")}
          sizeColumnsToFitFlag
        />
        <Button
          variant="secondary"
          onClick={goBack}
          id="releaseNoteBackBtn"
        >
          {t("releaseNotes.goBack")}
        </Button>
      </LoadingOverlay>
    </div>
  );
};

export default ReleaseNotes;
