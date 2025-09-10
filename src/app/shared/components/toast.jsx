import { useEffect } from "react";
import { motion } from "framer-motion";
import { FiCheck, FiX, FiInfo } from "react-icons/fi";

export const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000); // Longer display time
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      bg: "bg-green-600 dark:bg-green-700",
      icon: <FiCheck className="w-4 h-4" />,
      border: "border-green-500",
    },
    error: {
      bg: "bg-red-600 dark:bg-red-700",
      icon: <FiX className="w-4 h-4" />,
      border: "border-red-500",
    },
    info: {
      bg: "bg-blue-600 dark:bg-blue-700",
      icon: <FiInfo className="w-4 h-4" />,
      border: "border-blue-500",
    },
  };

  const { bg, icon, border } = config[type] || config.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className={`fixed top-4 right-4 z-50 ${bg} text-white px-4 py-3 rounded-lg shadow-lg max-w-md ${border} border`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="hover:opacity-70 transition-opacity"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
