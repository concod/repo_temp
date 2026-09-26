import React, { createContext, useContext } from "react";
const BroadcastChannelContext = createContext(null);
export const BroadcastChannelProvider = ({ children }) => {
  const broadcastChannel = new BroadcastChannel("websocket-status-channel");

  return (
    <BroadcastChannelContext.Provider value={broadcastChannel}>
      {children}
    </BroadcastChannelContext.Provider>
  );
};
export const useBroadcastChannel = () => {
  return useContext(BroadcastChannelContext);
};
