import { motion } from "framer-motion";

export default function StudentPage({ children }) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: -90, opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 shadow-md rounded-lg min-h-[75vh]"
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}
