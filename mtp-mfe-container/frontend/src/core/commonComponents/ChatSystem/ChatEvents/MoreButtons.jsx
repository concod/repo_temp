import { useState } from "react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Button, Menu, useTranslation } from "impact-ui-v3";
import { deleteEvent } from "../services-chatsystem/custom-services-chat-system";

const MoreButtons = (props) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { t } = useTranslation();

  const {
    handleEvents,
    eventName,
    isResolved,
    isChannel,
    isPinned,
    eventId,
    tableName,
    appDetails,
  } = props;

  const pinEvents = () => {
    handleEvents("pin", { key: eventName, pinned: !isPinned });
    setAnchorEl(null);
  };

  const deleteEventHandler = async () => {
    const response = await deleteEvent({
      event_ids: [eventId],
      component_type: tableName,
      application_code: appDetails.applicationCode,
      screen_code: appDetails.screenCode,
    });
    if (response.status) {
      setAnchorEl(null);
    }
  };

  const menuOptions = {
    resolve: [
      {
        label: t("chat.unresolve"),
        onClick: () => {
          handleEvents("unresolve", { key: eventName });
          setAnchorEl(null);
        },
        value: "unresolve",
      },
      {
        label: isPinned ? t("chat.unpin") : t("chat.pin"),
        onClick: pinEvents,
        value: isPinned ? "unpin" : "pin",
      },
      {
        label: t("chat.delete"),
        onClick: deleteEventHandler,
        value: "delete",
      },
    ],
    starred: [
      {
        label: isPinned ? t("chat.unpin") : t("chat.pin"),
        onClick: pinEvents,
        value: isPinned ? "unpin" : "pin",
      },
    ],
    channel: [
      {
        label: isPinned ? t("chat.unpin") : t("chat.pin"),
        onClick: pinEvents,
        value: isPinned ? "unpin" : "pin",
      },
    ],
  };

  return (
    <>
      <Button
        variant="text"
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <MoreHorizIcon />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={anchorEl}
        onClose={() => setAnchorEl(null)}
        options={
          menuOptions[
            isChannel ? "channel" : isResolved ? "resolve" : "starred"
          ]
        }
      />
    </>
  );
};

export default MoreButtons;
