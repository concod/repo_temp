import React from "react";
import DCStorePolicyStrategy from "../DC-Store-Policy/DC-To-Store-Strategy/index.jsx";

const DcNetwork = (props) => {
  return (
    <div className="App">
      <DCStorePolicyStrategy {...props} redirectedFromNetworkTab={true} />
    </div>
  );
};

export default DcNetwork;
