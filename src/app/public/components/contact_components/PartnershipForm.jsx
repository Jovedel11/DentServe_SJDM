import React, { forwardRef } from "react";
import { ClipboardList } from "lucide-react";
import styles from "../../style/components/contact_styles/PartnershipForm.module.scss";

const SERVICES = [
  "General Dentistry",
  "Orthodontics",
  "Pediatric",
  "Surgery",
  "Implants",
  "Cosmetic Dentistry",
  "Periodontics",
  "Endodontics",
];

const formConfig = {
  clinicInfo: [
    {
      label: "Clinic Name",
      name: "clinicName",
      type: "text",
      placeholder: "e.g., San Jose Dental Care",
      options: { required: "Clinic name is required" },
    },
    {
      label: "Clinic Contact Number",
      name: "phone",
      type: "text",
      placeholder: "e.g., 09123456789",
      options: {
        required: "Phone number is required",
        pattern: {
          value: /^[0-9+() -]{7,15}$/,
          message: "Invalid phone number",
        },
      },
    },
    {
      label: "Staff Gmail",
      name: "email",
      type: "email",
      placeholder: "e.g., clinicStaff@gmail.com",
      options: {
        required: "Email is required",
        pattern: {
          value: /^\S+@\S+\.\S+$/,
          message: "Invalid email address",
        },
      },
    },
  ],
  doctorInfo: [
    {
      label: "Doctor's Full Name",
      name: "doctorName",
      type: "text",
      placeholder: "e.g., Dr. Juan Dela Cruz",
      options: { required: "Doctor's name is required" },
    },
    {
      label: "Years in Practice",
      name: "experience",
      type: "number",
      placeholder: "e.g., 5",
      options: {
        min: { value: 1, message: "Minimum 1 year" },
        max: { value: 60, message: "Maximum 60 years" },
      },
    },
    {
      label: "Specialization",
      name: "specialization",
      type: "text",
      placeholder: "e.g., Orthodontics",
      options: { required: "Specialization is required" },
    },
  ],
  locationDocs: [
    {
      label: "Clinic Address",
      name: "location",
      type: "text",
      placeholder: "e.g., 123 Dental Ave, San Jose City",
      options: { required: "Location is required" },
    },
    {
      label: "Upload Accreditation Documents",
      name: "documents",
      type: "file",
      options: {
        required: "Documents are required",
        validate: {
          fileCount: (files) => files.length <= 5 || "Maximum 5 files allowed",
          fileSize: (files) =>
            Array.from(files).every((file) => file.size <= 5 * 1024 * 1024) ||
            "File size exceeds 5MB limit",
          fileType: (files) =>
            Array.from(files).every(
              (file) =>
                file.type === "application/pdf" ||
                file.type.startsWith("image/")
            ) || "Only PDF and images are allowed",
        },
      },
    },
  ],
};

const PartnershipForm = forwardRef(
  (
    { register, errors, handleSubmit, onSubmit, isSubmitting, setValue },
    ref
  ) => (
    <section id="agreement" className={styles.partnershipSection} ref={ref}>
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <ClipboardList className={styles.formIcon} />
          <h2>Clinic Partnership Application</h2>
          <p>Join our network of trusted dental providers</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className={styles.partnerForm}
          noValidate
        >
          {/* Clinic Info */}
          <div>
            <h4 className={styles.sectionTitle}>Clinic Information</h4>
            <div className={`${styles.formGroup} ${styles.gridCol2}`}>
              {formConfig.clinicInfo.map((field, index) => (
                <div key={index} className={styles.formField}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    {...register(field.name, field.options)}
                    aria-invalid={errors[field.name] ? "true" : "false"}
                  />
                  {errors[field.name] && (
                    <span className={styles.errorMessage}>
                      {errors[field.name].message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Info */}
          <div>
            <h4 className={styles.sectionTitle}>Doctor Information</h4>
            <div className={`${styles.formGroup} ${styles.gridCol2}`}>
              {formConfig.doctorInfo.map((field, index) => (
                <div key={index} className={styles.formField}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    {...register(field.name, field.options)}
                    aria-invalid={errors[field.name] ? "true" : "false"}
                  />
                  {errors[field.name] && (
                    <span className={styles.errorMessage}>
                      {errors[field.name].message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className={styles.sectionTitle}>Services Offered</h4>
            <div className={styles.servicesGrid}>
              {SERVICES.map((service) => (
                <label key={service} className={styles.serviceOption}>
                  <input
                    type="checkbox"
                    value={service}
                    {...register("services")}
                  />
                  <span>{service}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location & Docs */}
          <div>
            <h4 className={styles.sectionTitle}>Location & Credentials</h4>
            <div className={styles.formGroup}>
              {formConfig.locationDocs.map((field, index) => (
                <div key={index} className={styles.formField}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    type={field.type}
                    multiple={field.type === "file"}
                    placeholder={field.placeholder}
                    {...register(field.name, field.options)}
                    aria-invalid={errors[field.name] ? "true" : "false"}
                  />
                  {errors[field.name] && (
                    <span className={styles.errorMessage}>
                      {errors[field.name].message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Agreement */}
          <div className={`${styles.formField} ${styles.checkboxField}`}>
            <label>
              <input
                type="checkbox"
                {...register("agreement", {
                  required: "You must agree to proceed",
                })}
                aria-invalid={errors.agreement ? "true" : "false"}
              />
              I agree to the terms and conditions of partnership.
            </label>
            {errors.agreement && (
              <span className={styles.errorMessage}>
                {errors.agreement.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <span className={styles.spinner} aria-hidden="true"></span>
            ) : (
              "Apply for Partnership"
            )}
          </button>
        </form>
      </div>
    </section>
  )
);

export default PartnershipForm;
