import React from 'react';
import { createRoot } from 'react-dom/client';
import Toast from '../components/Toast/Toast';

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
}

// Simple counter for unique IDs
let toastCounter = 0;

// Container for all toasts
let toastContainer: HTMLDivElement | null = null;

// Initialize toast container
const getToastContainer = (): HTMLDivElement => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
      display: flex;
      width: max-content;
      height: 36px;
      min-width: 370px;
      padding: 8px 16px;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

// Show a toast
export const showToast = (options: ToastOptions): void => {
  const container = getToastContainer();
  const toastId = `toast-${++toastCounter}`;
  
  // Create toast wrapper
  const toastWrapper = document.createElement('div');
  toastWrapper.id = toastId;
  container.appendChild(toastWrapper);
  
  // Create React root and render toast
  const root = createRoot(toastWrapper);
  
  const removeToast = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      root.unmount();
      element.remove();
    }
  };

  root.render(
    React.createElement(Toast, {
      id: toastId,
      type: options.type,
      message: options.message,
      title: options.title,
      onRemove: removeToast
    })
  );
};

// Convenience functions
export const showSuccess = (message: string, title?: string) => {
  showToast({ type: 'success', message, title });
};

export const showError = (message: string, title?: string) => {
  showToast({ type: 'error', message, title });
};

export const showWarning = (message: string, title?: string) => {
  showToast({ type: 'warning', message, title });
};

export const showInfo = (message: string, title?: string) => {
  showToast({ type: 'info', message, title });
};
