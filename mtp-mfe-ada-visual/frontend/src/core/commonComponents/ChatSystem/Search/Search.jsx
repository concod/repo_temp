import { useEffect, useRef, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Input } from "impact-ui-v3";
import "./Search.scss";

const Search = ({ handleSearch, selectedEvents = [] }) => {
  const [hover, setHover] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef("");

  useEffect(() => {
    setHover(false);
  }, [selectedEvents]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        if (!inputRef.current && !isFocused) setHover(false);
      }}
      className={`search-conversation ${!hover ? "chat-hover-btn" : ""}`}
    >
      {selectedEvents.length === 0 ? (
        <Input
          onFocus={() => {
            setIsFocused(true);
          }}
          onBlur={() => {
            if (!inputRef.current) {
              setIsFocused(false);
              setHover(false);
            }
          }}
          rightIcon={<SearchIcon />}
          placeholder={hover ? "Search" : ""}
          className="chat-search"
          onChange={(event) => {
            const value = event.target.value;
            inputRef.current = value;
            handleSearch(event);
          }}
        />
      ) : null}
    </div>
  );
};

export default Search;
