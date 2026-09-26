import { createContext, useContext, useState, useEffect } from "react";
import ToastContainer from "./ToastContainer";

const ToastContext = createContext();

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    toast.id = Date.now();
    setToasts((prevToasts) => [...prevToasts, toast]);

    setTimeout(() => {
      removeToast(toast.id);
    }, 2000);
  };

  const removeToast = (id) => {
    console.log(id);
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // useEffect(() => {

  // }, [toasts]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;

export const useToastContext = () => useContext(ToastContext);
