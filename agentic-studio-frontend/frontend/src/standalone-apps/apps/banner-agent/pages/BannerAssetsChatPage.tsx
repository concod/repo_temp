import ChatWindow from "../features/chatbot/components/ChatWindow";
import Sidebar from "../components/Sidebar/Sidebar.jsx";
import "../features/chatbot/styles/chatbot.scss";
import "./Assets/AssetsPage.scss";

export default function BannerAssetsChatPage() {
    return (
        <section className="assets-page">
            <Sidebar activeItem="Home" />

            <main className="assets-page__main">
                <section className="assets-page__panel assets-page__panel--chat">
                    <ChatWindow embedded />
                </section>
            </main>
        </section>
    );
}
