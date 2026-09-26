import { ShortcutModal, useShortcut, useTranslation } from "impact-ui-v3"
import { useSelector, useDispatch } from "react-redux"
import { formatShortcutsModalData } from "./utils"
import { useMemo } from "react"
import { setShowAllSetBox } from "core/actions/tenantConfigActions"

const ShortcutsModal = ({ props }) => {
  const { shortcutModalOpen = false,
    setShortcutModalOpen } = props
  const { t } = useTranslation();
  const shortcutsData = useSelector((state) => state?.tenantConfigReducer?.keyboardShortcuts);
  const formattedData = useMemo(() => formatShortcutsModalData(shortcutsData), [shortcutsData]);
  const dispatch = useDispatch()
  const handleOnClose = () => {
    setShortcutModalOpen(false);
    if (window.location.pathname !== "/home" && sessionStorage.getItem("shortcuts_demo_in_progress") === "true") {
      dispatch(setShowAllSetBox(true));
    }
  };
  useShortcut("esc", () => handleOnClose());
  return (
    <ShortcutModal
      open={shortcutModalOpen}
      onClose={handleOnClose}
      shortcutGroups={[
        {
          label: t("keyboardShortcuts.modal.navigation"),
          value: "opt1",
          data: formattedData?.general ?? [],
        },
        {
          label: t("keyboardShortcuts.modal.table"),
          value: "opt2",
          data: formattedData?.table ?? [],
        },
        // {
        //   label: "View",
        //   value: "opt3",
        //   data: formattedData?.view ?? [],
        // },
      ]}
    />
  );
}

export default ShortcutsModal;