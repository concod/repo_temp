import { useCallback, useMemo, useState } from "react";
import { Avatar, Select, Input, useTranslation } from "impact-ui-v3";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import "./ChatSystemRightSideSection.scss";
import { debounce } from "lodash";

const ChatSystemRightSideSection = (props) => {
  const { t } = useTranslation();
  const { handleCommentChanges } = props;

  const dropdownOptions = [
    {
      label: t("chat.today"),
      value: "today",
    },
    {
      label: t("chat.yesterday"),
      value: "yesterday",
    },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedOption, setSelectedOptions] = useState({
    label: t("chat.today"),
    value: "today",
  });

  const search = useCallback(
    (value, selectedOption) => {
      handleCommentChanges("search", {
        selectedOption,
        value,
      });
    },
    [handleCommentChanges]
  );

  const debounceSearch = useMemo(() => {
    return debounce(search, 200);
  }, [search]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setInputValue(value);
    debounceSearch(value, selectedOption);
  };

  return (
    <section className="right-side">
      <div className="event-details">
        <Avatar label="AB" />
        <div className="event-name">{t("chat.eventName")}</div>
        <div className="member-count">{`10 ${t("chat.members")}`}</div>
      </div>

      <Input
        value={inputValue}
        placeholder={t("chat.search")}
        onChange={(event) => handleSearch(event)}
        rightIcon={<SearchOutlinedIcon />}
      />

      <Select
        isOpen={isOpen}
        currentOptions={dropdownOptions}
        handleChange={setSelectedOptions}
        // onClearAll={setSelectedOptions}
        isCloseWhenClickOutside
        label={t("chat.chatHistory")}
        name="chat-history"
        labelOrientation="top"
        placeholder={t("filters.select")}
        selectedOptions={selectedOption}
        setCurrentOptions={() => {}}
        setIsOpen={setIsOpen}
        setIsSelectAll={() => {}}
        setSelectedOptions={setSelectedOptions}
      />
    </section>
  );
};

export default ChatSystemRightSideSection;
