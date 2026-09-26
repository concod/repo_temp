import { Input } from "impact-ui-v3";
import SearchIcon from "assets/uam/searchIcon.svg";
import { makeStyles } from "@mui/styles";
import { useState } from "react";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";

const useStyles = makeStyles((theme) => ({
  searchContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& .impact-input-wrapper": {
      paddingRight: `${pxToRem(0)}`,
      "&:hover": {
        border: `${pxToRem(1)} solid ${colours.neutralBorder}`,
      },
    },
    "& .right-input-icon": {
      borderLeft: `${pxToRem(1)} solid ${colours.neutralBorder}`,
      height: "100%",
      padding: `${pxToRem(0)} ${pxToRem(8)}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  searchWithoutInput: {
    padding: pxToRem(8),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: `${pxToRem(1)} solid ${colours.neutralBorder}`,
    borderRadius: `${pxToRem(8)}`,
    height: `${pxToRem(32)}`,
    width: `${pxToRem(32)}`,
    backgroundColor: colours.white,
  },
}));

const Search = ({ handleSearch, searchVal }) => {
  const [minimize, setMinimize] = useState(true);
  const classes = useStyles();

  return (
    <div className={classes.searchContainer}>
      {!minimize ? (
        <Input
          placeholder="Search by name, role"
          rightIcon={<SearchIcon />}
          onInput={(event) => {
            handleSearch(event);
          }}
          rightIconClick={() => {
            setMinimize(!minimize);
          }}
          value={searchVal}
        />
      ) : (
        <div
          className={classes.searchWithoutInput}
          onClick={() => {
            setMinimize(!minimize);
          }}
        >
          <SearchIcon />
        </div>
      )}
    </div>
  );
};

export default Search;
