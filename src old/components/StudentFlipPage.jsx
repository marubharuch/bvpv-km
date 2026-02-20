import { motion } from "framer-motion";

export default function StudentFlipPage({ children, direction }) {
  return (
    <motion.div
      initial={{ rotateY: direction > 0 ? 90 : -90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: direction > 0 ? -90 : 90, opacity: 0 }}
      transition={{ duration: 0.45 }}
      style={{
        transformStyle: "preserve-3d",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        background: "linear-gradient(#fffdf7, #f8f5ee)",
        border: "1px solid #d6d3cc"
      }}
      className="p-5 rounded-lg min-h-[75vh]"
    >
      {children}
    </motion.div>
  );
}
