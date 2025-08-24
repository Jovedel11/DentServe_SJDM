import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiHeart, FiCheckCircle } from "react-icons/fi";

const WelcomeToast = ({ isVisible, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-6 right-6 z-50 max-w-md"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <div className="bg-card border-2 border-primary/30 rounded-xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-accent p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <FiHeart className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Welcome to DentalCare! 🦷
                  </h3>
                  <p className="text-white/90 text-sm">
                    Let's get your profile set up
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <p className="text-foreground/80 text-sm mb-4 leading-relaxed">
                Complete your profile to unlock the full potential of our
                platform:
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiCheckCircle className="text-primary flex-shrink-0" />
                  <span>Personal & medical information</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiCheckCircle className="text-primary flex-shrink-0" />
                  <span>Preferred doctors & locations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiCheckCircle className="text-primary flex-shrink-0" />
                  <span>Notification preferences</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-all duration-200 hover:bg-primary/90"
                >
                  Start Setup
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeToast;
