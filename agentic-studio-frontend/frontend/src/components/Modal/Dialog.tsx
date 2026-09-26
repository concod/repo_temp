import React, { createContext, useContext, useEffect, useRef } from "react";
import useClickOutside from "../../hooks/useClickOutside";
import { createPortal } from "react-dom";

interface IDataContext {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const DataContext = createContext<IDataContext | undefined>(undefined);
const DialogContext = createContext<boolean | undefined>(undefined);

const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within Dialog component");
  }
  return context;
};

const Dialog = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  return (
    <DataContext.Provider value={{ open, setOpen, contentRef }}>
      <DialogContext.Provider value={true}>{children}</DialogContext.Provider>
    </DataContext.Provider>
  );
};

const DialogTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { setOpen } = useDataContext();

  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog.Trigger must be used within Dialog component");
  }

  return (
    <button
      className={className}
      onClick={() => setOpen(true)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </button>
  );
};

const DialogContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { open, setOpen, contentRef } = useDataContext();
  useClickOutside(contentRef, () => setOpen(false));

  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog.Content must be used within Dialog component");
  }

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [setOpen]);

  return (
    open &&
    createPortal(
      <div ref={contentRef} className={`dialog-content ${className}`}>
        {children}
      </div>,
      document.body
    )
  );
};

const DialogOverlay = ({ className }: { className?: string }) => {
  const { open } = useDataContext();
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog.Overlay must be used within Dialog component");
  }

  return (
    open &&
    createPortal(
      <div className={`dialog-overlay ${className}`}></div>,
      document.body
    )
  );
};

Dialog.Trigger = DialogTrigger;
Dialog.Content = DialogContent;
Dialog.Overlay = DialogOverlay;

export default Dialog;
