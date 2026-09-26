import { useEffect, useState } from "react";
import { Badge, Input, Button, useTranslation } from "impact-ui-v3";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "assets/impactv3/azsort.svg";
import { ClickAwayListener } from "@mui/base";
import { useDispatch, useSelector } from "react-redux";
import UserIcon from "assets/impactv3/carbon_events.svg";
import { displaySnackMessages } from "core/Utils/utils";
import { addUserOrRemoveUserFromEvent } from "../../services-chatsystem/custom-services-chat-system";
import "./ChatSystemMemberDropdown.scss";

const ChatSystemMemberDropdown = (props) => {
  const { t } = useTranslation();
  const { setUserDropdown, handleEvents, eventId, userMentioned } = props;

  const userManagementList = useSelector(
    (state) => state.commentBarReducer.userManagementList
  );
  const tableName = useSelector(
    (state) => state.commonChatReducer?.eventsData.tableName
  );
  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );
  const userMentionedListAll = userMentioned;

  const userMentionedListIds = userMentionedListAll?.map(
    (item) => item.user_code
  );

  const [activeBadge, setActiveBadge] = useState("new");
  const [selectedUser, setSelectedUser] = useState([]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isAscendingSort, setIsAscendingSort] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usersList, setUsersList] = useState(() => {
    const newUserList = userManagementList.filter(
      (item) => !userMentionedListIds?.includes(item.user_code)
    );
    return newUserList;
  });

  const dispatch = useDispatch();

  useEffect(() => {
    if (activeBadge === "existing") {
      setUsersList([...userMentioned]);
    } else {
      const newUserList = userManagementList.filter(
        (item) => !userMentionedListIds.includes(item.user_code)
      );
      setUsersList(newUserList);
    }
  }, [activeBadge, userManagementList, userMentioned]);

  const handleUserAdditionOrRemoval = async (action) => {
    setIsLoading(true);
    const data = {
      event_id: eventId,
      user_ids: selectedValues,
      action,
      component_type: tableName,
      application_code: appDetails.applicationCode,
      screen_code: appDetails.screenCode,
    };
    try {
      setUserDropdown(false);
      const res = await addUserOrRemoveUserFromEvent(data);
      if (res.status) {
        // handleEvents(action, action === "add" ? selectedUser : selectedValues);
        setSelectedUser([]);
        setSelectedValues([]);
        displaySnackMessages(
          `Successfully ${action === "add" ? "added user to" : "removed user from"} the group!`,
          "success",
          dispatch,
          { horizontal: "right", vertical: "top" }
        );
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      displaySnackMessages(
        `Failed to ${action === "add" ? "add user to" : "remove user from"} the group!`,
        "error",
        dispatch,
        { horizontal: "right", vertical: "top" }
      );
    }
  };

  const handleBadgeChanges = (badgeType) => {
    setActiveBadge(badgeType);
    setSelectedUser([]);
    setSelectedValues([]);
  };

  const handleUserSelection = (user, checked) => {
    if (checked) {
      setSelectedUser([...selectedUser, user]);
      setSelectedValues([...selectedValues, user.user_code]);
    } else {
      const newUser = selectedUser.filter(
        (item) => item.user_name != user.user_name
      );
      const newValues = selectedValues.filter(
        (value) => value != user.user_code
      );
      setSelectedValues(newValues);
      setSelectedUser(newUser);
    }
  };

  const handleSearch = (event) => {
    const value = event.target.value;
    if (activeBadge === "existing") {
      const newUserList = userMentioned.filter((item) =>
        item.user_name.toLowerCase().includes(value.toLowerCase())
      );
      setUsersList(newUserList);
    } else {
      const newUserList = userManagementList.filter(
        (item) =>
          !userMentionedListIds.includes(item.user_code) &&
          item.user_name.toLowerCase().includes(value.toLowerCase())
      );
      setUsersList(newUserList);
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setUserDropdown(false)}>
      <section className="user-dropdown-list">
        <div className="badges">
          <Badge
            color={activeBadge === "new" ? "info" : "default"}
            label={`${t("chatSystem.new")} (${
              userManagementList.length - userMentionedListAll.length
            })`}
            onClick={() => handleBadgeChanges("new")}
            variant="stroke"
          />
          <Badge
            color={activeBadge === "existing" ? "info" : "default"}
            label={`${t("chatSystem.existing")} (${userMentionedListAll.length})`}
            onClick={() => handleBadgeChanges("existing")}
            variant="stroke"
          />
        </div>

        <div className="user-selectedList">
          <div className="user-search">
            <Input
              name="user-search"
              leftIcon={<SearchIcon />}
              placeholder={t("chat.searchHere")}
              onChange={handleSearch}
            />
            <div
              className="sort-btn"
              onClick={() => {
                if (isAscendingSort) {
                  setUsersList(
                    usersList.sort((a, b) =>
                      b.user_name.localeCompare(a.user_name)
                    )
                  );
                } else {
                  setUsersList(
                    usersList.sort((a, b) =>
                      a.user_name.localeCompare(b.user_name)
                    )
                  );
                }
                setIsAscendingSort(!isAscendingSort);
              }}
            >
              <SortIcon />
            </div>
          </div>
          <ul className="user-list">
            {usersList?.length ? (
              usersList.map((user) => (
                <li key={`${activeBadge}_${user.user_name}`}>
                  <label htmlFor={user.user_name}>
                    <input
                      id={user.user_name}
                      type="checkbox"
                      checked={selectedValues.includes(user.user_code)}
                      onChange={(event) =>
                        handleUserSelection(user, event.target.checked)
                      }
                    />
                    <span className="user-icon">
                      <UserIcon />
                    </span>

                    {user.user_name}
                  </label>
                </li>
              ))
            ) : (
              <li>{t("chat.noUserFound")}</li>
            )}
          </ul>
        </div>
        <footer>
          <Button variant="text" onClick={() => setUserDropdown(false)}>
            {t("button.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={!selectedValues.length || isLoading}
            onClick={() =>
              handleUserAdditionOrRemoval(
                activeBadge === "new" ? "add" : "remove"
              )
            }
          >
            {activeBadge === "new" ? t("chat.add") : t("chat.remove")}
          </Button>
        </footer>
      </section>
    </ClickAwayListener>
  );
};

export default ChatSystemMemberDropdown;
