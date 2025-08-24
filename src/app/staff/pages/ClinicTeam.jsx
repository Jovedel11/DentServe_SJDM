import React, { useState, useEffect } from "react";
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  Star,
  Edit3,
  Camera,
  Save,
  X,
  Plus,
  Trash2,
  Building,
  Globe,
  Shield,
  UserCheck,
  Briefcase,
  Award,
  DollarSign,
  AlertCircle,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Settings,
  CreditCard,
  FileText,
  CalendarDays,
} from "lucide-react";
import { mockClinicData } from "@/data/staff/mock-clinic-data";
import { mockStaffData } from "@/data/staff/mock-staff-data";
import { mockDoctorsData } from "@/data/staff/mock-doctors-data";

const ClinicTeam = () => {
  const [clinic, setClinic] = useState(null);
  const [staff, setStaff] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // Load team data
  useEffect(() => {
    const loadTeamData = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual Supabase calls
        // const { data: clinicData } = await supabase
        //   .from('clinics')
        //   .select('*')
        //   .eq('id', currentClinicId)
        //   .single();

        // const { data: staffData } = await supabase
        //   .from('staff_profiles')
        //   .select(`
        //     *,
        //     user_profile:user_profiles(*)
        //   `)
        //   .eq('clinic_id', currentClinicId)
        //   .eq('is_active', true);

        // const { data: doctorsData } = await supabase
        //   .from('doctor_clinics')
        //   .select(`
        //     doctor:doctors(
        //       *,
        //       user:user_profiles(*)
        //     )
        //   `)
        //   .eq('clinic_id', currentClinicId)
        //   .eq('is_active', true);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Enhanced mock data with profile images and additional fields
        setClinic(mockClinicData);

        setStaff(mockStaffData);

        setDoctors(mockDoctorsData);
      } catch (error) {
        console.error("Error loading team data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, []);

  // Handle profile image upload
  const handleImageUpload = async (file, memberType, memberId) => {
    setImageUploadLoading(true);
    try {
      // TODO: Replace with actual Supabase storage upload
      // const { data, error } = await supabase.storage
      //   .from('profile-images')
      //   .upload(`${memberType}/${memberId}/${Date.now()}`, file);

      // if (error) throw error;

      // const { data: { publicUrl } } = supabase.storage
      //   .from('profile-images')
      //   .getPublicUrl(data.path);

      // Update profile with new image URL
      // await supabase
      //   .from('user_profiles')
      //   .update({ profile_image_url: publicUrl })
      //   .eq('id', memberId);

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update local state
      const mockUrl = URL.createObjectURL(file);

      if (memberType === "staff") {
        setStaff((prev) =>
          prev.map((s) =>
            s.user_profile_id === memberId
              ? {
                  ...s,
                  user_profile: {
                    ...s.user_profile,
                    profile_image_url: mockUrl,
                  },
                }
              : s
          )
        );
      } else if (memberType === "doctor") {
        setDoctors((prev) =>
          prev.map((d) =>
            d.user_id === memberId
              ? { ...d, user: { ...d.user, profile_image_url: mockUrl } }
              : d
          )
        );
      }

      console.log("Profile image updated successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setImageUploadLoading(false);
    }
  };

  // Handle clinic update
  const handleUpdateClinic = async (updatedClinic) => {
    try {
      // TODO: Replace with actual Supabase call
      // const { error } = await supabase
      //   .from('clinics')
      //   .update({
      //     name: updatedClinic.name,
      //     description: updatedClinic.description,
      //     address: updatedClinic.address,
      //     city: updatedClinic.city,
      //     province: updatedClinic.province,
      //     phone: updatedClinic.phone,
      //     email: updatedClinic.email,
      //     website_url: updatedClinic.website_url,
      //     operating_hours: updatedClinic.operating_hours,
      //     services_offered: updatedClinic.services_offered,
      //     appointment_limit_per_patient: updatedClinic.appointment_limit_per_patient,
      //     cancellation_policy_hours: updatedClinic.cancellation_policy_hours
      //   })
      //   .eq('id', updatedClinic.id);

      setClinic(updatedClinic);
      setEditSection(null);
      console.log("Clinic information updated successfully");
    } catch (error) {
      console.error("Error updating clinic:", error);
    }
  };

  // Handle staff member update
  const handleUpdateStaffMember = async (member) => {
    try {
      // TODO: Replace with actual Supabase calls
      // Update staff_profiles table
      // const { error: staffError } = await supabase
      //   .from('staff_profiles')
      //   .update({
      //     position: member.position,
      //     department: member.department,
      //     permissions: member.permissions
      //   })
      //   .eq('id', member.id);

      // Update user_profiles table
      // const { error: userError } = await supabase
      //   .from('user_profiles')
      //   .update({
      //     full_name: member.user_profile.full_name,
      //     phone: member.user_profile.phone,
      //     date_of_birth: member.user_profile.date_of_birth,
      //     gender: member.user_profile.gender
      //   })
      //   .eq('id', member.user_profile_id);

      setStaff((prev) => prev.map((s) => (s.id === member.id ? member : s)));
      setEditingMember(null);
      console.log("Staff member updated successfully");
    } catch (error) {
      console.error("Error updating staff member:", error);
    }
  };

  // Add new service
  const handleAddService = () => {
    const newService = {
      name: "New Service",
      price: 0,
      description: "Service description",
    };

    setClinic((prev) => ({
      ...prev,
      services_offered: [...(prev.services_offered || []), newService],
    }));
  };

  // Remove service
  const handleRemoveService = (index) => {
    setClinic((prev) => ({
      ...prev,
      services_offered: prev.services_offered.filter((_, i) => i !== index),
    }));
  };

  // Update service
  const handleUpdateService = (index, field, value) => {
    setClinic((prev) => ({
      ...prev,
      services_offered: prev.services_offered.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      ),
    }));
  };

  // Update operating hours
  const handleUpdateOperatingHours = (day, field, value) => {
    setClinic((prev) => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          [field]: value,
        },
      },
    }));
  };

  // Calculate age
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    return monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
      ? age - 1
      : age;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-80 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Clinic Profile & Team
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your clinic information, services, and team members
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Active Clinic</span>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              editMode
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {editMode ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Exit Edit Mode
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-8">
          {/* Clinic Information */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-card-foreground flex items-center">
                <Building className="w-5 h-5 mr-2 text-primary" />
                Clinic Information
              </h2>
              {editMode && (
                <button
                  onClick={() =>
                    setEditSection(editSection === "clinic" ? null : "clinic")
                  }
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    editSection === "clinic"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {editSection === "clinic" ? "Cancel" : "Edit"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Clinic Name
                  </label>
                  {editSection === "clinic" ? (
                    <input
                      type="text"
                      value={clinic.name}
                      onChange={(e) =>
                        setClinic((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <p className="text-card-foreground font-medium">
                      {clinic.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Description
                  </label>
                  {editSection === "clinic" ? (
                    <textarea
                      value={clinic.description}
                      onChange={(e) =>
                        setClinic((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  ) : (
                    <p className="text-card-foreground text-sm leading-relaxed">
                      {clinic.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-3 text-muted-foreground" />
                    {editSection === "clinic" ? (
                      <input
                        type="text"
                        value={`${clinic.address}, ${clinic.city}, ${clinic.province}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(", ");
                          setClinic((prev) => ({
                            ...prev,
                            address: parts[0] || "",
                            city: parts[1] || "",
                            province: parts[2] || "",
                          }));
                        }}
                        className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {clinic.address}, {clinic.city}, {clinic.province}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                    {editSection === "clinic" ? (
                      <input
                        type="text"
                        value={clinic.phone}
                        onChange={(e) =>
                          setClinic((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {clinic.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                    {editSection === "clinic" ? (
                      <input
                        type="email"
                        value={clinic.email}
                        onChange={(e) =>
                          setClinic((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {clinic.email}
                      </span>
                    )}
                  </div>

                  {clinic.website_url && (
                    <div className="flex items-center text-sm">
                      <Globe className="w-4 h-4 mr-3 text-muted-foreground" />
                      {editSection === "clinic" ? (
                        <input
                          type="url"
                          value={clinic.website_url}
                          onChange={(e) =>
                            setClinic((prev) => ({
                              ...prev,
                              website_url: e.target.value,
                            }))
                          }
                          className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      ) : (
                        <a
                          href={clinic.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {clinic.website_url}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Policies & Stats */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Calendar className="w-4 h-4 text-primary mr-2" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Appointment Limit
                      </span>
                    </div>
                    {editSection === "clinic" ? (
                      <input
                        type="number"
                        value={clinic.appointment_limit_per_patient}
                        onChange={(e) =>
                          setClinic((prev) => ({
                            ...prev,
                            appointment_limit_per_patient: parseInt(
                              e.target.value
                            ),
                          }))
                        }
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-card-foreground">
                        {clinic.appointment_limit_per_patient}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Cancellation Policy
                      </span>
                    </div>
                    {editSection === "clinic" ? (
                      <input
                        type="number"
                        value={clinic.cancellation_policy_hours}
                        onChange={(e) =>
                          setClinic((prev) => ({
                            ...prev,
                            cancellation_policy_hours: parseInt(e.target.value),
                          }))
                        }
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-card-foreground">
                        {clinic.cancellation_policy_hours}h
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-500 fill-current mr-2" />
                      <span className="text-sm font-medium text-card-foreground">
                        Clinic Rating
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {clinic.rating}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{clinic.total_reviews} reviews</span>
                    <span>
                      Est. {new Date(clinic.created_at).getFullYear()}
                    </span>
                  </div>
                </div>

                {editSection === "clinic" && (
                  <button
                    onClick={() => handleUpdateClinic(clinic)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Services & Pricing */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-card-foreground flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-primary" />
                Services & Pricing
              </h2>
              <div className="flex items-center gap-2">
                {editMode && (
                  <>
                    <button
                      onClick={handleAddService}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </button>
                    <button
                      onClick={() =>
                        setEditSection(
                          editSection === "services" ? null : "services"
                        )
                      }
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        editSection === "services"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      {editSection === "services" ? "Done" : "Edit"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinic.services_offered?.map((service, index) => (
                <div
                  key={index}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  {editSection === "services" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) =>
                            handleUpdateService(index, "name", e.target.value)
                          }
                          className="flex-1 px-2 py-1 text-sm font-medium border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                          onClick={() => handleRemoveService(index)}
                          className="ml-2 text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="number"
                        value={service.price}
                        onChange={(e) =>
                          handleUpdateService(
                            index,
                            "price",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <textarea
                        value={service.description}
                        onChange={(e) =>
                          handleUpdateService(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        rows={2}
                        className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-card-foreground">
                          {service.name}
                        </h3>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded">
                          ₱{service.price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-card-foreground flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Operating Hours
              </h2>
              {editMode && (
                <button
                  onClick={() =>
                    setEditSection(editSection === "hours" ? null : "hours")
                  }
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    editSection === "hours"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {editSection === "hours" ? "Done" : "Edit"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinic.operating_hours &&
                Object.entries(clinic.operating_hours).map(
                  ([day, schedule]) => (
                    <div
                      key={day}
                      className="p-4 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-card-foreground capitalize">
                          {day}
                        </span>
                        {editSection === "hours" && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!schedule.closed}
                              onChange={(e) =>
                                handleUpdateOperatingHours(
                                  day,
                                  "closed",
                                  !e.target.checked
                                )
                              }
                              className="mr-2"
                            />
                            <span className="text-sm">Open</span>
                          </label>
                        )}
                      </div>

                      {schedule.closed ? (
                        <span className="text-sm text-red-500 font-medium bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">
                          Closed
                        </span>
                      ) : editSection === "hours" ? (
                        <div className="space-y-2">
                          <input
                            type="time"
                            value={schedule.open}
                            onChange={(e) =>
                              handleUpdateOperatingHours(
                                day,
                                "open",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <input
                            type="time"
                            value={schedule.close}
                            onChange={(e) =>
                              handleUpdateOperatingHours(
                                day,
                                "close",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded">
                          {schedule.open} - {schedule.close}
                        </span>
                      )}
                    </div>
                  )
                )}
            </div>
          </div>
        </div>

        {/* Team Members Sidebar */}
        <div className="space-y-8">
          {/* Staff Members */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Staff Team ({staff.length})
              </h2>
              <button className="inline-flex items-center px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </button>
            </div>

            <div className="space-y-4">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative group">
                      <div className="w-14 h-14 bg-primary/10 rounded-full overflow-hidden flex items-center justify-center">
                        {member.user_profile.profile_image_url ? (
                          <img
                            src={member.user_profile.profile_image_url}
                            alt={member.user_profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-7 h-7 text-primary" />
                        )}
                      </div>
                      {editMode && (
                        <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Camera className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file)
                                handleImageUpload(
                                  file,
                                  "staff",
                                  member.user_profile_id
                                );
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        {editingMember === member.id ? (
                          <input
                            type="text"
                            value={member.user_profile.full_name}
                            onChange={(e) => {
                              const updatedStaff = staff.map((s) =>
                                s.id === member.id
                                  ? {
                                      ...s,
                                      user_profile: {
                                        ...s.user_profile,
                                        full_name: e.target.value,
                                      },
                                    }
                                  : s
                              );
                              setStaff(updatedStaff);
                            }}
                            className="font-medium text-card-foreground bg-background border border-border rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          <h3 className="font-medium text-card-foreground truncate">
                            {member.user_profile.full_name}
                          </h3>
                        )}

                        {editMode && (
                          <button
                            onClick={() =>
                              setEditingMember(
                                editingMember === member.id ? null : member.id
                              )
                            }
                            className="text-muted-foreground hover:text-foreground p-1"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {editingMember === member.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={member.position}
                            onChange={(e) => {
                              const updatedStaff = staff.map((s) =>
                                s.id === member.id
                                  ? { ...s, position: e.target.value }
                                  : s
                              );
                              setStaff(updatedStaff);
                            }}
                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                            placeholder="Position"
                          />
                          <input
                            type="text"
                            value={member.department}
                            onChange={(e) => {
                              const updatedStaff = staff.map((s) =>
                                s.id === member.id
                                  ? { ...s, department: e.target.value }
                                  : s
                              );
                              setStaff(updatedStaff);
                            }}
                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                            placeholder="Department"
                          />
                          <input
                            type="tel"
                            value={member.user_profile.phone}
                            onChange={(e) => {
                              const updatedStaff = staff.map((s) =>
                                s.id === member.id
                                  ? {
                                      ...s,
                                      user_profile: {
                                        ...s.user_profile,
                                        phone: e.target.value,
                                      },
                                    }
                                  : s
                              );
                              setStaff(updatedStaff);
                            }}
                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                            placeholder="Phone"
                          />
                          <input
                            type="date"
                            value={member.user_profile.date_of_birth}
                            onChange={(e) => {
                              const updatedStaff = staff.map((s) =>
                                s.id === member.id
                                  ? {
                                      ...s,
                                      user_profile: {
                                        ...s.user_profile,
                                        date_of_birth: e.target.value,
                                      },
                                    }
                                  : s
                              );
                              setStaff(updatedStaff);
                            }}
                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                          />
                          <select
                            value={member.user_profile.gender}
                            onChange={(e) => {
                              const updatedStaff = staff.map((s) =>
                                s.id === member.id
                                  ? {
                                      ...s,
                                      user_profile: {
                                        ...s.user_profile,
                                        gender: e.target.value,
                                      },
                                    }
                                  : s
                              );
                              setStaff(updatedStaff);
                            }}
                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>

                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleUpdateStaffMember(member)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMember(null)}
                              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-primary font-medium">
                            {member.position}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {member.department}
                          </p>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {member.user_profile.email}
                            </p>
                            <p className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {member.user_profile.phone}
                            </p>
                            {member.user_profile.date_of_birth && (
                              <p className="flex items-center">
                                <CalendarDays className="w-3 h-3 mr-1" />
                                Age{" "}
                                {calculateAge(
                                  member.user_profile.date_of_birth
                                )}{" "}
                                • {member.user_profile.gender}
                              </p>
                            )}
                            <p className="flex items-center">
                              <Briefcase className="w-3 h-3 mr-1" />
                              ID: {member.employee_id}
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1">
                            {Object.entries(member.permissions).map(
                              ([key, value]) =>
                                value && (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full"
                                  >
                                    <Shield className="w-3 h-3 mr-1" />
                                    {key.replace("_", " ")}
                                  </span>
                                )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Doctors */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-card-foreground flex items-center">
                <UserCheck className="w-5 h-5 mr-2 text-primary" />
                Doctors ({doctors.length})
              </h2>
              <button className="inline-flex items-center px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </button>
            </div>

            <div className="space-y-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative group">
                      <div className="w-14 h-14 bg-primary/10 rounded-full overflow-hidden flex items-center justify-center">
                        {doctor.user.profile_image_url ? (
                          <img
                            src={doctor.user.profile_image_url}
                            alt={doctor.user.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCheck className="w-7 h-7 text-primary" />
                        )}
                      </div>
                      {editMode && (
                        <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Camera className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file)
                                handleImageUpload(
                                  file,
                                  "doctor",
                                  doctor.user_id
                                );
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-card-foreground mb-1">
                        {doctor.user.full_name}
                      </h3>
                      <p className="text-sm text-primary font-medium">
                        {doctor.specialization}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {doctor.education}
                      </p>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {doctor.user.email}
                        </p>
                        <p className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {doctor.user.phone}
                        </p>
                        <p className="flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          {doctor.license_number}
                        </p>
                        <p className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />₱
                          {doctor.consultation_fee.toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                              doctor.is_available
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {doctor.is_available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                          {doctor.rating} ({doctor.total_reviews})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicTeam;
