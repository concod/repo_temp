import { motion } from "framer-motion";
import errorMessage from '../../assets/images/error-message.png'

const Error = ({message}: {message: string}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'}}
    >
        <img style={{width: '52px'}} src={errorMessage} />
        <p style={{fontSize: '16px'}}>{message ? message : "Something went wrong"}</p>
        
    </motion.div>
  );
};

export default Error;
