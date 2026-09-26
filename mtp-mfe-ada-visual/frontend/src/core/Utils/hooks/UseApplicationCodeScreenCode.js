import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getScreenMaster } from "core/actions/commentActions";
import { setCommonScreenCode } from "core/commonComponents/ChatSystem/services-chatsystem/custom-services-chat-system";

const UseApplicationCodeScreenCode = () => {
  const dispatch = useDispatch();

  const applicationCode = useSelector(
    (state) => state.commonChatReducer?.appDetails?.applicationCode
  );

  const fetchScreenCode = async () => {
    let payload = {
      application: [applicationCode],
    };
    try {
      let getUserRole = await dispatch(getScreenMaster(payload));
      if (getUserRole?.data?.status) {
        getUserRole.data.data?.forEach((obj) => {
          if (obj.screen_name === sessionStorage.getItem("activeScreenName")) {
            dispatch(setCommonScreenCode(obj.screen_code));
          }
        });
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (applicationCode) {
      fetchScreenCode();
    }
  }, [applicationCode, sessionStorage.getItem("activeScreenName")]);
};

export default UseApplicationCodeScreenCode;
