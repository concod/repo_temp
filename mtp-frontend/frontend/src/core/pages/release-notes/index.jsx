import React, { useEffect, useState } from "react";
import { getReleaseNotes } from "core/actions/releaseNotes";
import PreviewIcon from "@mui/icons-material/Preview";
import Paper from "@mui/material/Paper";
import globalStyles from "core/Styles/globalStyles";
import "./index.scss";
import moment from "moment";
import AgGrid from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";

const ReleaseNotes = () => {
  const globalClasses = globalStyles();
  const [notes, setNotes] = useState([]);
  const [releaseNotesCols, setReleaseNotesCols] = useState([]);
  const [isLoading, setisLoading] = useState(false);
  const releaseNotes = async () => {
    let files = await getReleaseNotes();
    setNotes(files.data.data);
  };
  useEffect(() => {
    const fetchTableData = async () => {
      setisLoading(true);
      let columns = await getColumnsAg("table_name=release_notes")();
      columns = columns.map((col) => {
        if (col.column_name === "timeCreated") {
          col.cellRenderer = (instance) => (
            <div>{moment(instance.data.timeCreated).format("DD-MMM-YYYY")}</div>
          );
        }
        if (col.column_name === "url") {
          col.cellRenderer = (instance) => (
            <PreviewIcon
              onClick={() => {
                window.open(instance.data.url, "_blank");
              }}
            />
          );
        }
        return col;
      });
      setReleaseNotesCols(columns);
      await releaseNotes();
      setisLoading(false);
    };
    fetchTableData();
  }, []);

  return (
    <LoadingOverlay loader={isLoading} spinner>
      <Paper className={globalClasses.tableWrapper}>
        {releaseNotesCols.length > 0 && (
          <AgGrid rowdata={notes} columns={releaseNotesCols} />
        )}
      </Paper>
    </LoadingOverlay>
  );
};

export default ReleaseNotes;
