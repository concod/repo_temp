import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Divider, CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import CloseButton from "assets/chatbot/CloseButton.svg";
import RightTick from "assets/chatbot/RightTick.svg";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import React, { useEffect, useState } from "react";
import { Menu } from "impact-ui-v3";
import { useConversationManagement } from "../hooks/useConversationManagement";
import ConfirmationDialog from "../impact-ui-components/ConfirmationDialog";

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
    position: "relative",
    marginLeft: "3px",
    width: "408px",
    border: `1px solid transparent`,
    transition: "all 0.4s ease-in-out",
    [`&:nth-child(${(props) => props.chatIndex})`]: {
      "& $moreIcon": {
        visibility: (props) => props.menuAnchor && "visible",
      },
    },
    cursor: "pointer",
  },
  chatItemHover: {
    "&:hover": {
      border: `1px solid ${colours.lightPurple}`,
      "& $moreIcon": {
        visibility: "visible",
      },
    },
  },
  selectedConversation: {
    border: `${pxToRem(1)} solid ${colours.lightPurple}`,
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
    transition: "all 0.4s ease-in-out",
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
  loaderContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 0",
    width: "100%",
  },
  noConversationsMessage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: `${pxToRem(40)} 0`,
    width: "100%",
    fontFamily: "Manrope",
    fontSize: pxToRem(16),
    color: colours.slateGrayLight,
    fontWeight: 500,
  },
}));

const SavedChat = (props) => {
  const {
    activeConversationId,
    setActiveConversationId,
    mode,
    saveCurrentChanges,
    chatDataRef,
    setChatDataState,
    hasUnsavedChanges,
    chatDataState,
    selectedModule,
    setSelectedModule,
    isModuleChanged,
    setIsModuleChanged,
    showExtendedContent
  } = props;
  const [chatData, setChatData] = useState([]);
  const [groupedChats, setGroupedChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [previousActiveChatId, setPreviousActiveChatId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [chatIndex, setChatIndex] = useState(null);
  const [selectedChat, setselectedChat] = useState(null);
  const [editChatId, setEditChatId] = useState(null);
  const [tempChatName, setTempChatName] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingConversationId, setPendingConversationId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const classes = useStyles({ menuAnchor, chatIndex });

  const {
    fetchConversations,
    renameConversation,
    deleteConversation,
    loading,
    error,
    fetchConversationChats
  } = useConversationManagement(
    chatDataRef,
    mode,
    activeConversationId,
    setActiveConversationId,
    setChatDataState,
    selectedModule,
    setSelectedModule,
    isModuleChanged,
    setIsModuleChanged,
    setActiveChatId,
    saveCurrentChanges
  );

  useEffect(() => {
    if (showExtendedContent && activeChatId) {
      fetchConversationChats(activeChatId);
    }
  }, [showExtendedContent, activeChatId]);

  useEffect(() => {
    fetchConversations();
    setActiveConversationId(null);
  }, [mode]);

  useEffect(() => {
    if (chatDataRef.current[mode]?.conversationsList) {
      const conversationList = chatDataRef.current[mode]?.conversationsList;
      setChatData(conversationList);
      groupChatsByTime(conversationList);
    }
  }, [
    chatDataRef.current[mode]?.conversationsList,
    activeConversationId
  ]);

  useEffect(() => {
    if (chatDataRef.current[mode]?.conversationsList) {
      const conversationList = chatDataRef.current[mode]?.conversationsList;
      setChatData(conversationList);
      groupChatsByTime(conversationList);
    }
  }, [chatDataRef.current[mode]?.conversationsList]);

  const groupChatsByTime = (conversationList) => {
    const groups = {};
    
    // Process the pre-grouped conversations from the API
    conversationList.forEach((group) => {
      // Format group name: capitalize and replace underscores with spaces
      const formattedGroupName = group.group_name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      groups[formattedGroupName] = group.conversation_list;
    });

    setGroupedChats(groups);
  };

  const handleMenuOpen = (event, chat) => {
    setMenuAnchor(event.currentTarget);
    setChatIndex(chat.conversation_id);
    setselectedChat(chat);
    event.stopPropagation();
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    // setselectedChat(null);
  };

  const handleRename = () => {
    handleEditClick(selectedChat?.conversation_id, selectedChat.name);
    setMenuAnchor(null);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    let deleted = await deleteConversation(selectedChat?.conversation_id);
    if (deleted) {
      setChatData((prev) => prev.filter((chat) => chat.conversation_id !== selectedChat.conversation_id));
      
      // Update the groupedChats state to remove the deleted chat
      setGroupedChats((prevGroupedChats) => {
        const newGroupedChats = { ...prevGroupedChats };

        // Find and remove the chat from all groups
        Object.keys(newGroupedChats).forEach((groupName) => {
          newGroupedChats[groupName] = newGroupedChats[groupName].filter(
            (chat) => chat.conversation_id !== selectedChat.conversation_id
          );
        });

        return newGroupedChats;
      });
      
      // Update the conversationList in chatDataRef
      if (chatDataRef.current[mode]?.conversationsList) {
        chatDataRef.current[mode].conversationsList = chatDataRef.current[mode].conversationsList.map(group => ({
          ...group,
          conversation_list: group.conversation_list.filter(
            chat => chat.conversation_id !== selectedChat.conversation_id
          )
        }));
      }
    }
    setShowDeleteDialog(false);
  };
  
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  // Enable edit mode
  const handleEditClick = (chatId, chatName) => {
    setEditChatId(chatId); // Set the chat in edit mode
    setTempChatName(chatName); // Store the current name for editing
  };

  const handleConversationClick = (chatId) => {
    // Don't do anything if we're clicking on the already active conversation
    if (chatId === activeConversationId) return;
    
    // Check if there are unsaved changes
    if (hasUnsavedChanges()) {
      // Show confirmation dialog and store the pending conversation ID
      setShowConfirmDialog(true);
      setPendingConversationId(chatId);
    } else {
      // No unsaved changes, switch immediately
      switchToConversation(chatId);
    }
  };
  
  // Function to handle the actual conversation switch
  const switchToConversation = (chatId) => {
    setActiveChatId(chatId);
    setActiveConversationId(chatId);
    // saveCurrentChanges();
    fetchConversationChats(chatId);
  };
  
  // Handle confirmation dialog actions
  const handleConfirmSwitch = () => {
    switchToConversation(pendingConversationId);
    setShowConfirmDialog(false);
    setPendingConversationId(null);
  };
  
  const handleCancelSwitch = () => {
    setShowConfirmDialog(false);
    setPendingConversationId(null);
  };

  // Save the edited chat name
  const handleSaveEdit = async (chatId) => {
    let renamed = await renameConversation(chatId, tempChatName);
    if (renamed) {
      setActiveConversationId(chatId);
      saveCurrentChanges();
      // Update local chatData state
      setChatData((prev) =>
        prev.map((chat) =>
          chat.id === editChatId ? { ...chat, name: tempChatName } : chat
        )
      );
      // Update the groupedChats state directly to show immediate changes
      setGroupedChats((prevGroupedChats) => {
        const newGroupedChats = { ...prevGroupedChats };

        // Find the chat in all groups and update its name
        Object.keys(newGroupedChats).forEach((groupName) => {
          newGroupedChats[groupName] = newGroupedChats[groupName].map((chat) =>
            chat.conversation_id === chatId
              ? { ...chat, name: tempChatName }
              : chat
          );
        });

        return newGroupedChats;
      });
      
      // Update the conversationList in chatDataRef
      if (chatDataRef.current[mode]?.conversationsList) {
        chatDataRef.current[mode].conversationsList = chatDataRef.current[mode].conversationsList.map(group => ({
          ...group,
          conversation_list: group.conversation_list.map(chat => 
            chat.conversation_id === chatId
              ? { ...chat, name: tempChatName }
              : chat
          )
        }));
      }
      
      setEditChatId(null); // Exit edit mode
    }
  };

  // Cancel the edit
  const handleCancelEdit = () => {
    setEditChatId(null); // Exit edit mode
    setTempChatName(""); // Reset the temporary name
  };

  useEffect(() => {
    setActiveChatId(activeConversationId);
  }, [activeConversationId]);

  return (
    <div className={classes.chatHistory}>
      {/* Confirmation Dialog for Unsaved Changes */}
      <ConfirmationDialog
        open={showConfirmDialog}
        title="Unsaved Changes"
        message="You have unsaved changes in the current conversation. Would you like to switch without saving?"
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
        confirmText="Switch"
        cancelText="Cancel"
      />
      
      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={showDeleteDialog}
        title="Delete Chat"
        message="Are you sure you want to delete this chat?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
        type="error"
      />
      
      {/* Screen Header */}
      <div className={classes.header}>
        {mode === "navigation" ? "General Navigation" : "Insights"}
      </div>
      <Divider style={{ color: colours.separaterColor }} />
      <div className={classes.subtitle}>Saved Chat</div>

      {/* Loading State */}
      {loading ? (
        <div className={classes.loaderContainer}>
          <CircularProgress size={40} style={{ color: colours.lightPurple }} />
        </div>
      ) : Object.keys(groupedChats).length === 0 ? (
        <div className={classes.noConversationsMessage}>
          No conversations saved
        </div>
      ) : (
        /* Grouped Chats */
        Object.keys(groupedChats).map((timeGroup, index) => (
          <React.Fragment key={timeGroup}>
            {/* Time Group Header */}
            <h3 className={classes.timeGroupHeader}>{timeGroup}</h3>

            {/* Group Data */}
            {groupedChats[timeGroup].length > 0 ? (
              groupedChats[timeGroup].map((chat) => (
                <>
                  <div
                    key={chat?.conversation_id}
                    className={`${classes.chatItem} ${
                      editChatId === chat?.conversation_id
                        ? classes.editing
                        : classes.chatItemHover
                    } ${
                      activeChatId === chat?.conversation_id
                        ? classes.selectedConversation
                        : ""
                    }`}
                    onClick={() =>
                      handleConversationClick(chat?.conversation_id)
                    }
                  >
                    <div className={classes.chatNameContainer}>
                      {editChatId === chat?.conversation_id ? (
                        <input
                          className={classes.inputField}
                          value={tempChatName}
                          onChange={(e) => setTempChatName(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        // Display chat name with click-to-edit
                        <span className={classes.chatName}>{chat.name}</span>
                      )}
                    </div>
                    {/* Save and Cancel Icons */}
                    {editChatId === chat?.conversation_id && (
                      <div className={classes.actionIcons}>
                        <RightTick
                          onClick={() => handleSaveEdit(chat?.conversation_id)}
                          style={{ cursor: "pointer", color: "green" }}
                        />
                        <CloseButton
                          onClick={handleCancelEdit}
                          style={{ cursor: "pointer", color: "red" }}
                        />
                      </div>
                    )}
                    {editChatId !== chat?.conversation_id && (
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
        ))
      )}

      {/* Menu for Rename/Delete */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
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
            onClick: () => handleDelete(),
          },
        ]}
        selected="opt1"
      />
    </div>
  );
};

export default SavedChat;
