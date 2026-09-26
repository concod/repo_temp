import { Input } from "impact-ui-v3";
import { useState } from "react";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

const Search = () => {
  const [inputValue, setInputValue] = useState("");

  return (
    <div>
      <Input
        value={inputValue}
        placeholder="Search"
        onChange={(event) => setInputValue(event.target.value)}
        rightIcon={<SearchOutlinedIcon />}
      />
    </div>
  );
};

export default Search;
