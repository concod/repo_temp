import { setSmartBotActive } from "core/actions/smartBotActions";
import SmartBot from "impact-chatbot";
import "impact-chatbot/dist/index.esm.css";
import { useState } from "react";
import { connect } from "react-redux";
// import SmartBot from "core/commonComponents/smartBot";


const AgenticPlan = (props) => {
    const userID = localStorage.getItem("name");
    let userName = userID ? userID.split("@")[0] : "User";
    const {
        smartBotActive,
        setSmartBotActive,
    } = props;
    const [partialClose, setPartialClose] = useState(false);

    return (
        <div>
            <SmartBot
             showModal={smartBotActive}
             setShowModal={setSmartBotActive}
             userName={userName}
             partialClose={partialClose}
             setPartialClose={setPartialClose}
             forceOpen={true}
             customBaseUrl={"/plan-smart"}
             displayQuestions={true}
             questions={[]}
            />
        </div>
    );
}

const mapStateToProps = (state) => ({
    smartBotActive: state.smartBotReducer.smartBotActive,
});

export default connect(mapStateToProps, {
    setSmartBotActive,
})(AgenticPlan);
