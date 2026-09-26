import { useCallback } from "react";

/**
 * Wraps the Redux `addSnack` action into the `(message, variant)` signature
 * used by every allocation grid. Avoids repeating the options shape in every
 * component.
 */
const useSnack = (addSnack) =>
  useCallback(
    (message, variant) =>
      addSnack({ message, options: { variant, disableOnClose: true } }),
    [addSnack]
  );

export default useSnack;
