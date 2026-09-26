import { motion } from "framer-motion";
import { useProductStore } from "../../store/productStore";
import "./Home.scss";
import ProductCard from "../../components/ProductCard/ProductCard";
import { useState } from "react";
import { Dialog } from "../../../../../components/Modal";
import SearchModal from "../../components/SearchModal/SearchModal";
import sparkle from "../../assets/sparkle.png";
import chatBot from "../../assets/chatbot.png";
import { useNavigate } from "react-router-dom";
import iaLogo from "../../../../../assets/images/ia-logo.svg";
import { useAuthStore } from "../../../agent-launcher/store/authStore";

const Home = () => {
  const [searchWindowOpen, setSearchWindowOpen] = useState(false);
  const { products } = useProductStore();
  const navigate = useNavigate();
  const { userName } = useAuthStore();

  return (
    <motion.div
      className="psp-sop-welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="welcome-content">
        <motion.div
          className="welcome-logo"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.06, y: -4 }}
          whileTap={{ scale: 0.96 }}
        >
          <img src={iaLogo} /> <div>Store Navigator</div>
        </motion.div>

        <motion.h1
          className="welcome-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Hi {userName}!
        </motion.h1>

        <motion.p
          className="welcome-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          What are you looking for?
        </motion.p>

        <div className="welcome-action-bar">
          <Dialog open={searchWindowOpen} setOpen={setSearchWindowOpen}>
            <Dialog.Trigger className="welcome-chat-input">
              <img src={sparkle} alt="sparkle" />
              Search here
            </Dialog.Trigger>
            <Dialog.Content className="search-modal-content">
              <SearchModal />
            </Dialog.Content>
            <Dialog.Overlay className="search-modal-overlay" />
          </Dialog>

          <button
            className="welcome-chat-button"
            onClick={() => navigate("/apps/navigator/chat")}
          >
            {/* <img src={sparkleChat} /> */}
            <img src={chatBot} />
          </button>
        </div>

        {products.filter((item) => item.stockCount > 0).length > 0 && (
          <div className="welcome-product-recommendation">
            <motion.p
              className="title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Quick Recommendations
            </motion.p>

            <div className="product-scroll-container">
              {products
                .filter((item) => item.stockCount > 0)
                .slice(0, 5)
                .map((product) => (
                  <motion.div
                    key={product.id}
                    className="product-scroll-container__item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}

              <motion.div
                className="product-scroll-container__item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <button
                  className="show-all-card"
                  onClick={() => setSearchWindowOpen(true)}
                >
                  <div className="show-all-card__icon">
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                  <span>Show all products</span>
                </button>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Home;
