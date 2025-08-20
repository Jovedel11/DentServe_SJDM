import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Building2,
  ArrowRight,
  Heart,
  Clock,
  Users,
  Search,
} from "lucide-react";

const WelcomeModal = ({ isOpen, onSelectClinic, onContinue }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop - Non-dismissible */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal - Reduced size */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative mx-4 w-full max-w-lg rounded-2xl bg-card shadow-2xl border" // Changed from max-w-2xl to max-w-lg
        >
          {/* Content - Reduced padding */}
          <div className="p-6">
            {" "}
            {/* Changed from p-8 to p-6 */}
            {/* Header - Reduced sizes */}
            <div className="text-center mb-6">
              {" "}
              {/* Changed from mb-8 to mb-6 */}
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20">
                {" "}
                {/* Changed from w-20 h-20 to w-16 h-16 */}
                <Heart className="w-8 h-8 text-primary" />{" "}
                {/* Changed from w-10 h-10 to w-8 h-8 */}
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">
                {" "}
                {/* Changed from text-4xl to text-3xl */}
                Welcome to DentalCare
              </h2>
              <p className="text-base text-muted-foreground">
                {" "}
                {/* Changed from text-lg to text-base */}
                Let's start your journey to better dental health
              </p>
            </div>
            {/* Required Choice Message - Reduced padding */}
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-4 mb-6 text-center">
              {" "}
              {/* Changed from p-6 mb-8 to p-4 mb-6 */}
              <Building2 className="w-10 h-10 text-primary mx-auto mb-3" />{" "}
              {/* Changed from w-12 h-12 mb-4 to w-10 h-10 mb-3 */}
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {" "}
                {/* Changed from text-2xl mb-3 to text-xl mb-2 */}
                Choose Your Path
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {" "}
                {/* Changed from default to text-sm */}
                To ensure the best experience, please select how you'd like to
                proceed with your appointment booking
              </p>
            </div>
            {/* Stats - Reduced spacing */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {" "}
              {/* Changed from gap-4 mb-8 to gap-3 mb-6 */}
              <div className="text-center p-3 rounded-xl bg-muted/30 border border-border">
                {" "}
                {/* Changed from p-4 to p-3 */}
                <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />{" "}
                {/* Changed from w-6 h-6 mb-2 to w-5 h-5 mb-1 */}
                <div className="text-lg font-bold text-foreground">
                  50+
                </div>{" "}
                {/* Changed from text-2xl to text-lg */}
                <div className="text-xs text-muted-foreground">Clinics</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30 border border-border">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold text-foreground">200+</div>
                <div className="text-xs text-muted-foreground">Doctors</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30 border border-border">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold text-foreground">24/7</div>
                <div className="text-xs text-muted-foreground">Support</div>
              </div>
            </div>
            {/* Action Buttons - Reduced spacing and padding */}
            <div className="space-y-3">
              {" "}
              {/* Changed from space-y-4 to space-y-3 */}
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center">
                {" "}
                {/* Changed from p-4 to p-3 */}
                <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                  {" "}
                  {/* Changed from text-sm to text-xs */}
                  Please select one option to continue
                </p>
              </div>
              <div className="grid gap-3">
                {" "}
                {/* Changed from gap-4 to gap-3 */}
                <motion.button
                  onClick={onSelectClinic}
                  className="group flex items-center gap-3 p-4 bg-gradient-to-r from-secondary/10 to-secondary/5 border-2 border-secondary/20 hover:border-secondary rounded-xl transition-all duration-200 hover:shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                    {" "}
                    {/* Changed from w-12 h-12 to w-10 h-10 */}
                    <Search className="w-5 h-5 text-secondary" />{" "}
                    {/* Changed from w-6 h-6 to w-5 h-5 */}
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-foreground text-base mb-1">
                      {" "}
                      {/* Changed from text-lg to text-base */}
                      Browse & Search Clinics
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      {" "}
                      {/* Changed from text-sm to text-xs */}
                      Explore our network, view locations, reviews, and find the
                      perfect clinic for you
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform" />{" "}
                  {/* Changed from w-5 h-5 to w-4 h-4 */}
                </motion.button>
                <motion.button
                  onClick={onContinue}
                  className="group flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary rounded-xl transition-all duration-200 hover:shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-foreground text-base mb-1">
                      Continue with Preferred Clinic
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      I already have a clinic in mind and want to book directly
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>
            </div>
            <div className="mt-4 text-center">
              {" "}
              {/* Changed from mt-6 to mt-4 */}
              <p className="text-xs text-muted-foreground">
                {" "}
                {/* Changed from text-sm to text-xs */}
                Don't worry - you can always change your selection during the
                booking process
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeModal;
