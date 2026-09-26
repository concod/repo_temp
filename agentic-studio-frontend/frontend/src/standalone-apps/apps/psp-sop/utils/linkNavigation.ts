type PreparedPopup = Window | null | undefined;

export const preparePopupWindow = (): Window | null => {
  try {
    const popup = window.open('', '_blank');

    if (popup) {
      popup.opener = null;
    }

    return popup;
  } catch {
    return null;
  }
};

export const closePreparedPopupWindow = (preparedPopup: PreparedPopup): void => {
  if (!preparedPopup || preparedPopup.closed) {
    return;
  }

  preparedPopup.close();
};

const tryOpenInNewTab = (url: string): boolean => {
  try {
    return Boolean(window.open(url, '_blank', 'noopener,noreferrer'));
  } catch {
    return false;
  }
};

const triggerDownloadFallback = (url: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', '');
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const openUrlWithPopupOrDownloadFallback = (
  url: string,
  preparedPopup?: PreparedPopup,
): void => {
  if (preparedPopup && !preparedPopup.closed) {
    preparedPopup.location.href = url;
    return;
  }

  if (tryOpenInNewTab(url)) {
    return;
  }

  triggerDownloadFallback(url);
};
