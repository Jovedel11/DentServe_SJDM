import React, { forwardRef, useState } from "react";
import { toast } from "react-toastify";
import {
  ClipboardList,
  Check,
  AlertCircle,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import styles from "../../style/components/contact_styles/StaffApplicationForm.module.scss";

const StaffApplicationForm = forwardRef((props, ref) => {
  const [formData, setFormData] = useState({
    clinicName: "",
    staffName: "",
    staffEmail: "",
    contactNumber: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.clinicName.trim()) {
      newErrors.clinicName = "Clinic name is required";
    } else if (formData.clinicName.trim().length < 3) {
      newErrors.clinicName = "Clinic name must be at least 3 characters";
    }

    if (!formData.staffName.trim()) {
      newErrors.staffName = "Staff name is required";
    }

    if (!formData.staffEmail.trim()) {
      newErrors.staffEmail = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.staffEmail)) {
      newErrors.staffEmail = "Invalid email format";
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^[0-9+() -]{7,15}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = "Invalid phone number format";
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "Please tell us why you want to partner with us";
    } else if (formData.reason.trim().length < 20) {
      newErrors.reason =
        "Please provide at least 20 characters explaining your interest";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Submit partnership request (address removed)
      const { data, error } = await supabase.rpc(
        "submit_clinic_partnership_request",
        {
          p_clinic_name: formData.clinicName.trim(),
          p_email: formData.staffEmail.trim(),
          p_address: "To be provided during profile completion", // Placeholder
          p_reason: formData.reason.trim(),
          p_staff_name: formData.staffName.trim(),
          p_contact_number: formData.contactNumber.trim(),
        }
      );

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success(
          "Partnership application submitted successfully! We'll review your application and contact you within 24-48 hours.",
          { autoClose: 5000 }
        );

        // Reset form
        setFormData({
          clinicName: "",
          staffName: "",
          staffEmail: "",
          contactNumber: "",
          reason: "",
        });
      } else {
        throw new Error(data?.error || "Submission failed");
      }
    } catch (error) {
      console.error("Application submission error:", error);

      // Handle specific error messages
      if (error.message.includes("Rate limit")) {
        toast.error(
          "You've reached the daily submission limit. Please try again tomorrow."
        );
      } else if (error.message.includes("already exists")) {
        toast.error("An application with this email already exists.");
      } else {
        toast.error(
          error.message || "Failed to submit application. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={ref}
      className={styles.staffApplicationSection}
      id="staff-application"
    >
      <div className={styles.applicationContainer}>
        <div className={styles.applicationHeader}>
          <div className={styles.headerIcon}>
            <ClipboardList className={styles.primaryIcon} />
          </div>
          <h3 className={styles.headerTitle}>Apply for Partnership</h3>
          <p className={styles.headerSubtitle}>
            Join our network of trusted dental care providers and expand your
            reach
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={styles.applicationForm}
          noValidate
        >
          <div className={styles.formGrid}>
            {/* Clinic Name */}
            <div className={styles.formField}>
              <label htmlFor="clinicName" className={styles.fieldLabel}>
                <ClipboardList size={16} />
                Clinic Name *
              </label>
              <input
                id="clinicName"
                name="clinicName"
                type="text"
                placeholder="e.g., San Jose Dental Care"
                value={formData.clinicName}
                onChange={handleInputChange}
                className={`${styles.fieldInput} ${
                  errors.clinicName ? styles.error : ""
                }`}
              />
              {errors.clinicName && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={14} />
                  {errors.clinicName}
                </span>
              )}
            </div>

            {/* Staff Name */}
            <div className={styles.formField}>
              <label htmlFor="staffName" className={styles.fieldLabel}>
                <User size={16} />
                Your Full Name *
              </label>
              <input
                id="staffName"
                name="staffName"
                type="text"
                placeholder="e.g., Dr. Juan Dela Cruz"
                value={formData.staffName}
                onChange={handleInputChange}
                className={`${styles.fieldInput} ${
                  errors.staffName ? styles.error : ""
                }`}
              />
              {errors.staffName && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={14} />
                  {errors.staffName}
                </span>
              )}
            </div>

            {/* Email */}
            <div className={styles.formField}>
              <label htmlFor="staffEmail" className={styles.fieldLabel}>
                <Mail size={16} />
                Your Email Address *
              </label>
              <input
                id="staffEmail"
                name="staffEmail"
                type="email"
                placeholder="e.g., doctor@clinic.com"
                value={formData.staffEmail}
                onChange={handleInputChange}
                className={`${styles.fieldInput} ${
                  errors.staffEmail ? styles.error : ""
                }`}
              />
              {errors.staffEmail && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={14} />
                  {errors.staffEmail}
                </span>
              )}
            </div>

            {/* Contact Number */}
            <div className={styles.formField}>
              <label htmlFor="contactNumber" className={styles.fieldLabel}>
                <Phone size={16} />
                Contact Number *
              </label>
              <input
                id="contactNumber"
                name="contactNumber"
                type="tel"
                placeholder="e.g., 09123456789"
                value={formData.contactNumber}
                onChange={handleInputChange}
                className={`${styles.fieldInput} ${
                  errors.contactNumber ? styles.error : ""
                }`}
              />
              {errors.contactNumber && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={14} />
                  {errors.contactNumber}
                </span>
              )}
            </div>
          </div>

          {/* Reason for Partnership */}
          <div className={styles.formField}>
            <label htmlFor="reason" className={styles.fieldLabel}>
              Why do you want to partner with DentServe? *
            </label>
            <textarea
              id="reason"
              name="reason"
              placeholder="Tell us about your clinic, services offered, and why you'd like to join our platform..."
              value={formData.reason}
              onChange={handleInputChange}
              className={`${styles.fieldTextarea} ${
                errors.reason ? styles.error : ""
              }`}
              rows={4}
            />
            {errors.reason && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} />
                {errors.reason}
              </span>
            )}
          </div>

          <div className={styles.submitSection}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${styles.submitButton} ${
                isSubmitting ? styles.submitting : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.spinner}></div>
                  Submitting Application...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Submit Partnership Application
                </>
              )}
            </button>
          </div>
        </form>

        <div className={styles.applicationInfo}>
          <h4 className={styles.infoTitle}>What happens next?</h4>
          <ol className={styles.infoList}>
            <li>We review your application within 24-48 hours</li>
            <li>
              If approved, you'll receive an email invitation with a secure link
            </li>
            <li>
              Click the link to create your account and complete your clinic
              profile
            </li>
            <li>Start managing appointments and grow your practice with us</li>
          </ol>
        </div>
      </div>
    </section>
  );
});

export default StaffApplicationForm;
