import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Building2,
  ArrowRight,
  X,
  Heart,
  Clock,
  Users,
} from "lucide-react";

const WelcomeModal = ({ isOpen, onClose, onSelectClinic, onContinue }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative mx-4 w-full max-w-2xl rounded-2xl bg-card shadow-2xl border"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-primary/10">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Book Your Appointment
              </h2>
              <p className="text-lg text-muted-foreground">
                Let's start your journey to better dental health
              </p>
            </div>

            {/* Question */}
            <div className="bg-muted/30 rounded-xl p-6 mb-8 text-center">
              <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Do you have a preferred clinic?
              </h3>
              <p className="text-muted-foreground">
                Choose from our network of trusted dental clinics
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <Building2 className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">50+</div>
                <div className="text-xs text-muted-foreground">Clinics</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">200+</div>
                <div className="text-xs text-muted-foreground">Doctors</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">24/7</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onSelectClinic}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
              >
                <MapPin className="w-5 h-5" />
                Browse Clinics First
              </button>
              <button
                onClick={onContinue}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                Continue Booking
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              You can always change your clinic selection during the booking
              process
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeModal;
