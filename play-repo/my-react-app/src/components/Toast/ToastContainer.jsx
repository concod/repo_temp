import React from "react";
import "./Toast.css";

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map(({ id, type, message }) => (
        <div key={id} className={`toast toast-${type}`}>
          <span>{message}</span>
          <button className="toast-close" onClick={() => onRemove(id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
