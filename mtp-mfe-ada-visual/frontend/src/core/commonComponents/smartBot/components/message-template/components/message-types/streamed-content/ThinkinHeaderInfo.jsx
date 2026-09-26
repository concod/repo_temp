import { useEffect } from 'react';
import { useSelector } from 'react-redux';

const ThinkinHeaderInfo = (props) => {

  const thinkingContext = useSelector((state) => {
    return state.smartBotReducer.thinkingContext;
  });
  const { thinkingHeaderMessage } = thinkingContext;
  

  return (
    <div className="thinkin-header-info">
      {thinkingHeaderMessage}
    </div>
  );
};

export default ThinkinHeaderInfo;
