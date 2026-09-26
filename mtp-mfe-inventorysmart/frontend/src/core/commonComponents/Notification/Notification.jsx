import { Notification, useTranslation } from "impact-ui-v3";
import UseNotification from "./UseNotification";

const DISABLE_ACTION_LIST = ["Archived", "informational"];
const DISABLE_ACTION_LIST_MOVE = ["Archived", "Bookmarked", "informational"];

const NotificationComponent = (props) => {
  const { t } = useTranslation();
  const {
    handleClose,
    handleMarkReadAll,
    handleMoveAllPending,
    handleNotificationDeleteAll,
    handleSelectAll,
    onPrimaryButtonClick,
    onSecondaryButtonClick,
    onSettingButtonClick,
    setIsOpen,
    setNotificationPanels,
    settingTheNotificationPanel,
    isOpen,
    badgesList,
    activeBadge,
    notificationTab,
    notificationPanels,
    activeNotiTab,
    handleTabChange,
    moveToPendingDropdownOptions,
    showBadgeLoader,
    showNotificationListLoader,
  } = UseNotification(props);

  return (
    <Notification
      isOpen={isOpen}
      className={"core-v3-notification"}
      anchor="right"
      title={t("notifications.title")}
      // primaryButtonLabel=""
      // secondaryButtonLabel="Clear all"
      handleClose={handleClose}
      handleMarkReadAll={
        DISABLE_ACTION_LIST.includes(activeBadge) ||
        DISABLE_ACTION_LIST.includes(activeNotiTab)
          ? null
          : handleMarkReadAll
      }
      handleMoveAllPending={
        DISABLE_ACTION_LIST_MOVE.includes(activeBadge) ||
        DISABLE_ACTION_LIST_MOVE.includes(activeNotiTab)
          ? null
          : handleMoveAllPending
      }
      handleNotificationDeleteAll={
        DISABLE_ACTION_LIST.includes(activeBadge) ||
        DISABLE_ACTION_LIST.includes(activeNotiTab)
          ? null
          : handleNotificationDeleteAll
      }
      handleSelectAll={
        DISABLE_ACTION_LIST.includes(activeBadge) ||
        DISABLE_ACTION_LIST.includes(activeNotiTab)
          ? null
          : handleSelectAll
      }
      onPrimaryButtonClick={onPrimaryButtonClick}
      onSecondaryButtonClick={onSecondaryButtonClick}
      onSettingButtonClick={onSettingButtonClick}
      setIsOpen={setIsOpen}
      setNotificationPanels={settingTheNotificationPanel}
      handleTabChange={handleTabChange}
      badgesList={badgesList}
      notificationPanels={notificationPanels}
      notificationTabs={notificationTab}
      moveToPendingDropdownOptions={
        moveToPendingDropdownOptions.length
          ? moveToPendingDropdownOptions
          : null
      }
      activeNotiTab={activeNotiTab}
      activeBadge={activeBadge}
      showBadgeLoader={showBadgeLoader}
      showNotificationListLoader={showNotificationListLoader}
    />
  );
};

export default NotificationComponent;
