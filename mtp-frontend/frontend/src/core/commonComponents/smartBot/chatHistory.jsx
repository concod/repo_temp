import React, { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Menu } from "./impact-ui-components/Menu";
import Tooltip from "@mui/material/Tooltip";
import { Divider } from "@mui/material";
import colours from "core/Styles/colours";
import CloseButton from "assets/chatbot/CloseButton.svg";
import RightTick from "assets/chatbot/RightTick.svg";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  header: {
    fontSize: "16px",
    fontFamily: "Manrope",
    fontWeight: 800,
    color: colours.darkBlack,
    height: "55px",
    paddingLeft: "16px",
    paddingTop: "16px",
  },
  title: {
    fontSize: "16px",
    fontFamily: "Manrope",
    fontWeight: 800,
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    fontFamily: "Manrope",
    fontWeight: 800,
    marginBottom: "16px",
    marginTop: "20px",
    paddingLeft: "16px",
    color: "#31416E",
  },
  inputField: {
    fontSize: "14px",
    fontFamily: "Manrope",
    fontWeight: 500,
    border: "1px solid #ddd",
    borderRadius: "4px",
    paddingLeft: "15px",
    paddingTop: "7px",
    paddingBottom: "7px",
    outline: "none",
    width: "405px",
    marginLeft: "3px",
  },
  timeGroupHeader: {
    marginBottom: "8px",
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: "14px",
    color: colours.slateGrayLight,
    marginTop: "18px",
    paddingLeft: "16px",
  },

  chatItem: {
    display: "flex",
    justifyContent: "space-between", // Ensure elements align horizontally
    alignItems: "center", // Align items vertically in the center
    padding: `${pxToRem(5)} ${pxToRem(11)}`,
    borderRadius: pxToRem(8),
    transition: "background-color 0.3s",
    position: "relative",
    marginLeft: "3px",
    width: "408px",
    border: `1px solid transparent`,
  },
  chatItemHover: {
    "&:hover": {
      border: `1px solid ${colours.lightPurple}`,
      "& $moreIcon": {
        visibility: "visible",
      },
    },
  },
  editing: {
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "0px 0px",
    border: "none",
  },
  chatNameContainer: {
    display: "flex",
    flexDirection: "column",
  },
  chatName: {
    fontSize: "14px",
    fontFamily: "Manrope",
    fontWeight: 500,
    cursor: "pointer",
    color: colours.lightNeutrals,
    paddingLeft: "14px",
  },
  actionIcons: {
    display: "flex",
    gap: "8px",
    marginLeft: "auto",
    paddingTop: "7px",
    marginRight: "3px",
  },
  chatTimestamp: {
    fontSize: "14px",
    fontFamily: "Manrope",
    fontWeight: 500,
    color: "#888",
  },
  moreIcon: {
    visibility: "hidden", // Initially hidden
    cursor: "pointer",
  },
  emptyGroup: {
    fontSize: "0.9rem",
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    margin: "8px 0",
  },
}));

const ChatHistory = ({ mode }) => {
  const classes = useStyles();
  const [chatData, setChatData] = useState([]);
  const [groupedChats, setGroupedChats] = useState({});
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedChat, setselectedChat] = useState(null);
  const [editChatId, setEditChatId] = useState(null); // Tracks the chat being edited
  const [tempChatName, setTempChatName] = useState("");
  // Mock API response
  const sampleChatsResponse = {
    data: [
      // Today's chats (within 24 hours)
      {
        id: 1,
        name: "What are the  different modes in Navigation mode?",
        timestamp: new Date().toISOString(), // Today's timestamp
      },
      {
        id: 2,
        name: "What are the  different modes in Navigation mode?",
        timestamp: new Date().toISOString(), // Another chat for Today
      },
      // Chats within the previous 7 days
      {
        id: 3,
        name: "What are the  different modes in Navigation mode?",
        timestamp: new Date(
          new Date().setDate(new Date().getDate() - 3)
        ).toISOString(),
      },
      {
        id: 4,
        name: "What are the  different modes in Navigation mode?",
        timestamp: new Date(
          new Date().setDate(new Date().getDate() - 6)
        ).toISOString(),
      },
      {
        id: 5,
        name: "What are the  different modes in Navigation mode?",
        timestamp: "2024-11-24T09:15:00Z",
      },
      {
        id: 6,
        name: "What are the  different modes in Navigation mode?",
        timestamp: "2024-11-23T14:00:00Z",
      },
      {
        id: 7,
        name: "What are the  different modes in Navigation mode?",
        timestamp: "2024-11-17T10:30:00Z",
      },
      {
        id: 8,
        name: "What are the  different modes in Navigation mode?",
        timestamp: "2024-10-24T15:45:00Z",
      },
    ],
  };

  useEffect(() => {
    const data = sampleChatsResponse;
    setChatData(data.data);
    groupChatsByTime(data.data);
  }, []);

  const groupChatsByTime = (chats) => {
    const today = new Date();
    const groups = {
      Today: [],
      "Previous 7 Days": [],
      "Previous 30 Days": [],
    };

    chats.forEach((chat) => {
      const chatDate = new Date(chat.timestamp);
      const diffDays = Math.floor((today - chatDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groups.Today.push(chat);
      } else if (diffDays === 1) {
        groups.Yesterday.push(chat);
      } else if (diffDays <= 7) {
        groups["Previous 7 Days"].push(chat);
      } else if (diffDays <= 30) {
        groups["Previous 30 Days"].push(chat);
      }
    });

    setGroupedChats(groups);
  };

  const handleMenuOpen = (event, chat) => {
    setMenuAnchor(event.currentTarget);
    setselectedChat(chat);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    // setselectedChat(null);
  };

  const handleRename = () => {
    // const newName = prompt("Enter a new name for the chat:");
    // if (newName) {
    //   setChatData((prev) =>
    //     prev.map((chat) =>
    //       chat.id === selectedChat ? { ...chat, name: newName } : chat
    //     )
    //   );
    // }
    handleEditClick(selectedChat.id, selectedChat.name);
    setMenuAnchor(null);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this chat?")) {
      setChatData((prev) => prev.filter((chat) => chat.id !== selectedChat.id));
    }
    handleMenuClose();
  };

  // Enable edit mode
  const handleEditClick = (chatId, chatName) => {
    setEditChatId(chatId); // Set the chat in edit mode
    setTempChatName(chatName); // Store the current name for editing
  };
  // Save the edited chat name
  const handleSaveEdit = () => {
    setChatData((prev) =>
      prev.map((chat) =>
        chat.id === editChatId ? { ...chat, name: tempChatName } : chat
      )
    );
    setEditChatId(null); // Exit edit mode
  };

  // Cancel the edit
  const handleCancelEdit = () => {
    setEditChatId(null); // Exit edit mode
    setTempChatName(""); // Reset the temporary name
  };

  return (
    <div className={classes.chatHistory}>
      {/* Screen Header */}
      <div className={classes.header}>
        {mode === "navigation" ? "General Navigation" : "Insights"}
      </div>
      <Divider style={{ color: colours.separaterColor }} />
      <div className={classes.subtitle}>Saved Chat</div>

      {/* Grouped Chats */}
      {Object.keys(groupedChats).map((timeGroup, index) => (
        <React.Fragment key={timeGroup}>
          {/* Time Group Header */}
          <h3 className={classes.timeGroupHeader}>{timeGroup}</h3>

          {/* Group Data */}
          {groupedChats[timeGroup].length > 0 ? (
            groupedChats[timeGroup].map((chat) => (
              <>
                <div
                  key={chat.id}
                  className={`${classes.chatItem} ${
                    editChatId === chat.id
                      ? classes.editing
                      : classes.chatItemHover
                  }`}
                >
                  <div className={classes.chatNameContainer}>
                    {editChatId === chat.id ? (
                      <input
                        className={classes.inputField}
                        value={tempChatName}
                        onChange={(e) => setTempChatName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      // Display chat name with click-to-edit
                      <span
                        className={classes.chatName}
                        onClick={() => handleEditClick(chat)}
                      >
                        {chat.name}
                      </span>
                    )}
                  </div>
                  {/* Save and Cancel Icons */}
                  {editChatId === chat.id && (
                    <div className={classes.actionIcons}>
                      <RightTick
                        onClick={handleSaveEdit}
                        style={{ cursor: "pointer", color: "green" }}
                      />
                      <CloseButton
                        onClick={handleCancelEdit}
                        style={{ cursor: "pointer", color: "red" }}
                      />
                    </div>
                  )}
                  {editChatId !== chat.id && (
                      <MoreHorizIcon
                        className={classes.moreIcon}
                        onClick={(e) => handleMenuOpen(e, chat)}
                      />
                  )}
                </div>
              </>
            ))
          ) : (
            <div className={classes.emptyGroup}>No chats available</div>
          )}
          {index < Object.keys(groupedChats).length - 1 && <Divider />}
        </React.Fragment>
      ))}

      {/* Menu for Rename/Delete */}
      <Menu
        anchorEl={menuAnchor}
        isOpen={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        options={[
          {
            label: "Rename",
            onClick: () => handleRename(),
            value: "rename",
          },
          {
            label: "Delete",
            value: "delete",
          },
        ]}
        selected="opt1"
      />
    </div>
  );
};

export default ChatHistory;
