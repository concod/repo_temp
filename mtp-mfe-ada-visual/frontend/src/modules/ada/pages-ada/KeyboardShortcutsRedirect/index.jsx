import { useEffect } from "react";
import { useHistory } from "react-router-dom";

const KeyboardShortcutsRedirect = () => {
  const history = useHistory();

  useEffect(() => {
    history.push("/keyboard-shortcuts");
  }, [history]);

  return null;
};

export default KeyboardShortcutsRedirect;
