import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDoctorSystem } from "@/hooks/location/useDoctorSystem";
import { useLocationService } from "@/hooks/location/useLocationService";
import {
  Search,
  MapPin,
  Phone,
  Star,
  Calendar,
  X,
  Stethoscope,
  Building2,
  Award,
  List,
  Grid3X3,
  ChevronDown,
  Filter,
  ArrowUpDown,
  GraduationCap,
  Badge,
  CheckCircle2,
  DollarSign,
  Mail,
  User,
  Trophy,
  AlertCircle,
  Loader2,
} from "lucide-react";

const Dentist = () => {
  const { userLocation, isLocationAvailable } = useLocationService();
  const {
    findNearestDoctors,
    searchDoctors,
    getDoctorDetail,
    getAvailableSpecializations,
    loading,
    error,
    clearError,
  } = useDoctorSystem();

  // State management
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [showDentistModal, setShowDentistModal] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [availableSpecializations, setAvailableSpecializations] = useState([]);

  const [filters, setFilters] = useState({
    specializations: [],
    experience: 0,
    rating: 0,
    consultationFee: "all",
    availability: false,
    certifications: false,
    awards: false,
  });

  // ✅ FIX: Deduplicate doctors who work at multiple clinics
  const deduplicateDoctors = useCallback((doctorsList) => {
    const doctorMap = new Map();

    doctorsList.forEach((doctor) => {
      if (!doctorMap.has(doctor.id)) {
        doctorMap.set(doctor.id, {
          ...doctor,
          all_clinics: [
            {
              id: doctor.clinic_id,
              name: doctor.clinic_name,
              address: doctor.clinic_address,
              city: doctor.clinic_city,
              phone: doctor.clinic_phone,
              email: doctor.clinic_email,
            },
          ],
        });
      } else {
        // Add clinic to existing doctor entry
        const existing = doctorMap.get(doctor.id);
        existing.all_clinics.push({
          id: doctor.clinic_id,
          name: doctor.clinic_name,
          address: doctor.clinic_address,
          city: doctor.clinic_city,
          phone: doctor.clinic_phone,
          email: doctor.clinic_email,
        });
      }
    });

    return Array.from(doctorMap.values());
  }, []);

  // ✅ FIX: Safe certification count helper
  const getCertificationCount = useCallback((certifications) => {
    if (!certifications) return 0;

    if (Array.isArray(certifications)) {
      return certifications.length;
    }

    if (typeof certifications === "object") {
      return Object.keys(certifications).length;
    }

    return 0;
  }, []);

  // ✅ FIX: Render certifications safely
  const renderCertifications = useCallback((certifications) => {
    if (!certifications) return null;

    let certArray = [];

    // Handle different certification formats
    if (Array.isArray(certifications)) {
      // Format: [{name: "...", year: "..."}] or ["cert1", "cert2"]
      certArray = certifications
        .map((cert, idx) => {
          if (typeof cert === "string") {
            return { name: cert, year: "Certified", key: `cert-${idx}` };
          }
          if (cert && typeof cert === "object") {
            return {
              name: cert.name || cert.certification || "Certification",
              year: cert.year || cert.date || "Certified",
              key: `cert-${idx}`,
            };
          }
          return null;
        })
        .filter(Boolean);
    } else if (typeof certifications === "object") {
      // Format: {name: year} or {name: {year: "...", details: "..."}}
      certArray = Object.entries(certifications).map(([cert, value], idx) => {
        let year = "Certified";

        if (typeof value === "string" || typeof value === "number") {
          year = String(value);
        } else if (value && typeof value === "object") {
          year = value.year || value.date || "Certified";
        }

        return {
          name: cert,
          year: year,
          key: `cert-${idx}`,
        };
      });
    }

    return certArray.map((cert) => (
      <div
        key={cert.key}
        className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">{cert.name}</span>
        </div>
        <span className="text-sm text-primary font-medium">{cert.year}</span>
      </div>
    ));
  }, []);

  // ✅ FIXED: Smart recommendations using actual database fields
  const getRecommendedDentists = useMemo(() => {
    return doctors
      .map((dentist) => {
        let score = 0;

        // Rating weight (40%)
        score += ((dentist.rating || 0) / 5) * 40;

        // Experience weight (30%)
        const experienceScore = Math.min(
          (dentist.experience_years || 0) / 20,
          1
        );
        score += experienceScore * 30;

        // Total reviews weight (20%)
        const reviewScore = Math.min((dentist.total_reviews || 0) / 500, 1);
        score += reviewScore * 20;

        // Bonus factors (10%)
        if (dentist.is_available) score += 3;
        if (dentist.awards?.length > 0) score += 2;
        if (getCertificationCount(dentist.certifications) > 2) score += 2;
        if (dentist.distance_numeric && dentist.distance_numeric < 5)
          score += 3;

        return { ...dentist, recommendationScore: score };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
  }, [doctors, getCertificationCount]);

  // ✅ Load available specializations
  useEffect(() => {
    const loadSpecializations = async () => {
      try {
        const result = await getAvailableSpecializations();
        if (result.success && result.specializations) {
          setAvailableSpecializations(result.specializations);
        }
      } catch (error) {
        console.error("Error loading specializations:", error);
      }
    };
    loadSpecializations();
  }, [getAvailableSpecializations]);

  // ✅ FIXED: Load doctors with proper location format and deduplication
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const searchLocation = isLocationAvailable()
          ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }
          : null;

        const options = {
          maxDistance: 50,
          limit: 100, // Get more initially to account for deduplication
          sortBy: "rating",
        };

        console.log("🚀 Loading doctors with:", { searchLocation, options });

        const result = await findNearestDoctors(searchLocation, options);

        if (result.success && result.doctors) {
          console.log("✅ Doctors loaded:", result.doctors.length);
          // ✅ Deduplicate doctors who work at multiple clinics
          const uniqueDoctors = deduplicateDoctors(result.doctors);
          console.log(
            "✅ Unique doctors after deduplication:",
            uniqueDoctors.length
          );
          setDoctors(uniqueDoctors);
          setFilteredDoctors(uniqueDoctors);
        } else {
          console.log("❌ No doctors found:", result.error);
          setDoctors([]);
          setFilteredDoctors([]);
        }
      } catch (error) {
        console.error("💥 Error loading doctors:", error);
        setDoctors([]);
        setFilteredDoctors([]);
      }
    };

    loadDoctors();
  }, [
    findNearestDoctors,
    userLocation,
    isLocationAvailable,
    deduplicateDoctors,
  ]);

  // ✅ FIXED: Search and filter logic with deduplication
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim()) {
        try {
          const result = await searchDoctors(searchQuery, {
            specializations: filters.specializations,
            minRating: filters.rating,
            minExperience: filters.experience,
            isAvailable: filters.availability || null,
          });

          if (result.success) {
            let searchResults = result.doctors || [];
            // ✅ Deduplicate before applying client-side filters
            searchResults = deduplicateDoctors(searchResults);
            searchResults = applyClientSideFilters(searchResults);
            setFilteredDoctors(searchResults);
          }
        } catch (error) {
          console.error("Error searching doctors:", error);
        }
      } else {
        const filtered = applyClientSideFilters(doctors);
        setFilteredDoctors(filtered);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, doctors, filters, searchDoctors, deduplicateDoctors]);

  // ✅ FIXED: Apply filters with actual database fields
  const applyClientSideFilters = useCallback(
    (doctorsList) => {
      let filtered = [...doctorsList];

      // Specialization filter
      if (filters.specializations.length > 0) {
        filtered = filtered.filter((dentist) =>
          filters.specializations.some((spec) =>
            dentist.specialization?.toLowerCase().includes(spec.toLowerCase())
          )
        );
      }

      // Experience filter
      if (filters.experience > 0) {
        filtered = filtered.filter(
          (dentist) => (dentist.experience_years || 0) >= filters.experience
        );
      }

      // Rating filter
      if (filters.rating > 0) {
        filtered = filtered.filter(
          (dentist) => (dentist.rating || 0) >= filters.rating
        );
      }

      // Consultation fee filter
      if (filters.consultationFee !== "all") {
        const feeFilters = {
          budget: (dentist) =>
            dentist.consultation_fee && dentist.consultation_fee <= 2500,
          moderate: (dentist) =>
            dentist.consultation_fee &&
            dentist.consultation_fee > 2500 &&
            dentist.consultation_fee <= 3500,
          premium: (dentist) =>
            dentist.consultation_fee && dentist.consultation_fee > 3500,
        };
        if (feeFilters[filters.consultationFee]) {
          filtered = filtered.filter(feeFilters[filters.consultationFee]);
        }
      }

      // Availability filter
      if (filters.availability) {
        filtered = filtered.filter((dentist) => dentist.is_available);
      }

      // Certifications filter
      if (filters.certifications) {
        filtered = filtered.filter(
          (dentist) => getCertificationCount(dentist.certifications) > 0
        );
      }

      // Awards filter
      if (filters.awards) {
        filtered = filtered.filter(
          (dentist) => dentist.awards && dentist.awards.length > 0
        );
      }

      // Apply sorting
      switch (sortBy) {
        case "experience":
          filtered.sort(
            (a, b) => (b.experience_years || 0) - (a.experience_years || 0)
          );
          break;
        case "rating":
          filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case "fee-low":
          filtered.sort(
            (a, b) =>
              (a.consultation_fee || 999999) - (b.consultation_fee || 999999)
          );
          break;
        case "fee-high":
          filtered.sort(
            (a, b) => (b.consultation_fee || 0) - (a.consultation_fee || 0)
          );
          break;
        case "alphabetical":
          filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          break;
        case "reviews":
          filtered.sort(
            (a, b) => (b.total_reviews || 0) - (a.total_reviews || 0)
          );
          break;
        case "recommended":
        default:
          const recommended = getRecommendedDentists.filter((dentist) =>
            filtered.some((f) => f.id === dentist.id)
          );
          filtered = recommended;
          break;
      }

      return filtered;
    },
    [filters, sortBy, getRecommendedDentists, getCertificationCount]
  );

  const bookAppointment = (dentist) => {
    window.location.href = `/patient/book-appointment?doctor=${dentist.id}`;
  };

  // ✅ FIXED: Use getDoctorDetail from useDoctorSystem (which calls getDoctorDetails)
  const openDentistModal = async (dentist) => {
    console.log("getDoctorDetail called for:", dentist.id);
    setShowDentistModal(true);
    setSelectedDentist(dentist);

    // Load detailed information
    try {
      const result = await getDoctorDetail(dentist.id);
      if (result.success && result.doctor) {
        setSelectedDentist({
          ...dentist,
          ...result.doctor,
          clinics: result.doctor.clinics || dentist.all_clinics || [],
        });
      }
    } catch (error) {
      console.error("Error loading dentist details:", error);
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating || 0)
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-300"
        }`}
      />
    ));
  };

  const getExperienceLevel = (years) => {
    if (years >= 15) return { label: "Senior Expert", color: "text-primary" };
    if (years >= 10) return { label: "Expert", color: "text-success" };
    if (years >= 5) return { label: "Experienced", color: "text-info" };
    return { label: "Practitioner", color: "text-warning" };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Find Your Perfect Dentist
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse our directory of qualified dental professionals. Find
            specialists who match your needs and book appointments directly.
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-destructive flex-1">{error}</p>
            <button
              onClick={clearError}
              className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg text-sm hover:bg-destructive/90"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Search and Controls */}
        <motion.div
          className="mb-8 space-y-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search dentists, specializations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors text-lg"
              />
              {loading && (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
              )}
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-4 pr-10 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none appearance-none min-w-[200px]"
                >
                  <option value="recommended">🏆 Recommended</option>
                  <option value="experience">👨‍⚕️ Most Experienced</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="reviews">💬 Most Reviewed</option>
                  <option value="fee-low">💰 Fee: Low to High</option>
                  <option value="fee-high">💰 Fee: High to Low</option>
                  <option value="alphabetical">🔤 A-Z</option>
                </select>
                <ArrowUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              {/* Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2 ${
                  showFilters ||
                  Object.values(filters).some((v) =>
                    Array.isArray(v)
                      ? v.length > 0
                      : v !== false && v !== 0 && v !== "all"
                  )
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {Object.values(filters).some((v) =>
                  Array.isArray(v)
                    ? v.length > 0
                    : v !== false && v !== 0 && v !== "all"
                ) && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {Object.values(filters).reduce((acc, v) => {
                      if (Array.isArray(v)) return acc + v.length;
                      if (v !== false && v !== 0 && v !== "all") return acc + 1;
                      return acc;
                    }, 0)}
                  </span>
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center border-2 border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-3 transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-3 transition-colors ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">
                {filteredDoctors.length} doctor
                {filteredDoctors.length !== 1 ? "s" : ""} found
              </span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-muted-foreground">Available</span>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border-2 border-border rounded-2xl p-6 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Specializations Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Specializations
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableSpecializations.length > 0 ? (
                        availableSpecializations.map((spec) => (
                          <label
                            key={spec}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-muted/30 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={filters.specializations.includes(spec)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters((prev) => ({
                                    ...prev,
                                    specializations: [
                                      ...prev.specializations,
                                      spec,
                                    ],
                                  }));
                                } else {
                                  setFilters((prev) => ({
                                    ...prev,
                                    specializations:
                                      prev.specializations.filter(
                                        (s) => s !== spec
                                      ),
                                  }));
                                }
                              }}
                              className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-sm text-foreground">
                              {spec}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Loading specializations...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Experience & Rating */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Minimum Experience
                      </label>
                      <select
                        value={filters.experience}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            experience: parseInt(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none"
                      >
                        <option value={0}>Any Experience</option>
                        <option value={5}>5+ Years</option>
                        <option value={10}>10+ Years</option>
                        <option value={15}>15+ Years</option>
                        <option value={20}>20+ Years</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Minimum Rating
                      </label>
                      <select
                        value={filters.rating}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            rating: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none"
                      >
                        <option value={0}>Any Rating</option>
                        <option value={4.0}>4.0+ Stars</option>
                        <option value={4.5}>4.5+ Stars</option>
                        <option value={4.8}>4.8+ Stars</option>
                      </select>
                    </div>
                  </div>

                  {/* Consultation Fee */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Consultation Fee
                    </label>
                    <select
                      value={filters.consultationFee}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          consultationFee: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none"
                    >
                      <option value="all">Any Fee Range</option>
                      <option value="budget">Budget (Under ₱2,500)</option>
                      <option value="moderate">
                        Moderate (₱2,500 - ₱3,500)
                      </option>
                      <option value="premium">Premium (Above ₱3,500)</option>
                    </select>
                  </div>

                  {/* Advanced Options */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Advanced Options
                    </label>
                    <div className="space-y-2">
                      {[
                        { key: "availability", label: "Available Now" },
                        { key: "certifications", label: "Has Certifications" },
                        { key: "awards", label: "Has Awards" },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-muted/30 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={filters[key]}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                [key]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="text-sm text-foreground">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <button
                    onClick={() =>
                      setFilters({
                        specializations: [],
                        experience: 0,
                        rating: 0,
                        consultationFee: "all",
                        availability: false,
                        certifications: false,
                        awards: false,
                      })
                    }
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear All Filters
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFilters(false)}
                      className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Dentists Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
              <p className="text-muted-foreground text-lg">
                Loading dentists...
              </p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-20">
              <Stethoscope className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                No Doctors Found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Try adjusting your search criteria or filters to find dentists
                that match your needs.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilters({
                    specializations: [],
                    experience: 0,
                    rating: 0,
                    consultationFee: "all",
                    availability: false,
                    certifications: false,
                    awards: false,
                  });
                }}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-medium"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-6"
              }
            >
              {filteredDoctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  className={`bg-card border-2 border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer group ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openDentistModal(doctor)}
                >
                  {/* Doctor Image */}
                  <div
                    className={`relative overflow-hidden ${
                      viewMode === "list" ? "w-80 h-72" : "h-56"
                    }`}
                  >
                    <img
                      src={
                        doctor.image_url ||
                        doctor.image ||
                        "/assets/images/dental.png"
                      }
                      alt={doctor.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "/assets/images/dental.png";
                      }}
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-white text-xs font-medium rounded-full backdrop-blur-sm ${
                          doctor.is_available ? "bg-success/90" : "bg-muted/90"
                        }`}
                      >
                        {doctor.is_available ? "Available" : "Busy"}
                      </span>
                      {sortBy === "recommended" && index < 5 && (
                        <span className="px-2 py-1 bg-primary/90 text-white text-xs font-medium rounded-full backdrop-blur-sm flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Top Pick
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      {doctor.consultation_fee && (
                        <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                          ₱{doctor.consultation_fee?.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="px-3 py-1 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                        {getExperienceLevel(doctor.experience_years || 0).label}
                      </span>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="p-6 space-y-4 flex-1">
                    <div>
                      <h3 className="font-bold text-foreground text-xl mb-2 group-hover:text-primary transition-colors">
                        {doctor.name}
                      </h3>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1">
                          {renderStars(doctor.rating || 0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {(doctor.rating || 0).toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({doctor.total_reviews || 0} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
                        <Stethoscope className="w-4 h-4" />
                        <span>{doctor.specialization}</span>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {doctor.experience_years || 0} years exp.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {doctor.clinic_name}
                        </span>
                      </div>
                      {doctor.distance && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {doctor.distance}km away
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Awards & Certifications */}
                    <div className="flex items-center gap-4 text-sm">
                      {doctor.awards?.length > 0 && (
                        <div className="flex items-center gap-1 text-warning">
                          <Trophy className="w-4 h-4" />
                          <span>
                            {doctor.awards.length} award
                            {doctor.awards.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {getCertificationCount(doctor.certifications) > 0 && (
                        <div className="flex items-center gap-1 text-info">
                          <Badge className="w-4 h-4" />
                          <span>
                            {getCertificationCount(doctor.certifications)} cert
                            {getCertificationCount(doctor.certifications) !== 1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bio Preview */}
                    {doctor.bio && (
                      <div className="text-sm text-muted-foreground">
                        {doctor.bio.substring(0, 100)}
                        {doctor.bio.length > 100 && "..."}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Dentist Details Modal */}
      <AnimatePresence>
        {showDentistModal && selectedDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDentistModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={selectedDentist.image_url || "/assets/images/dental.png"}
                  alt={selectedDentist.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "/assets/images/dental.png";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <button
                  onClick={() => setShowDentistModal(false)}
                  className="absolute top-4 right-4 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute bottom-6 left-6 text-white">
                  <h2 className="text-3xl font-bold mb-2">
                    {selectedDentist.name}
                  </h2>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {renderStars(selectedDentist.rating || 0)}
                      </div>
                      <span className="text-lg font-medium">
                        {(selectedDentist.rating || 0).toFixed(1)}
                      </span>
                      <span className="text-sm opacity-90">
                        ({selectedDentist.total_reviews || 0} reviews)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 text-white text-sm font-medium rounded-full backdrop-blur-sm ${
                        selectedDentist.is_available
                          ? "bg-success/90"
                          : "bg-muted/90"
                      }`}
                    >
                      {selectedDentist.is_available
                        ? "Available for Appointments"
                        : "Currently Busy"}
                    </span>
                    {selectedDentist.consultation_fee && (
                      <span className="text-sm opacity-90 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />₱
                        {selectedDentist.consultation_fee?.toLocaleString()}{" "}
                        consultation
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 max-h-[calc(90vh-256px)] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <Stethoscope className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-medium text-foreground">
                            Specialization
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedDentist.specialization}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <GraduationCap className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-medium text-foreground">
                            Experience
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedDentist.experience_years || 0} years
                            practicing
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* About */}
                    {selectedDentist.bio && (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                          <User className="w-5 h-5" />
                          About Dr. {selectedDentist.last_name}
                        </h3>
                        <p className="text-foreground leading-relaxed">
                          {selectedDentist.bio}
                        </p>
                      </div>
                    )}

                    {/* Education */}
                    {selectedDentist.education && (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          Education & Training
                        </h3>
                        <div className="bg-muted/30 rounded-xl p-4">
                          <p className="text-foreground leading-relaxed">
                            {selectedDentist.education}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {getCertificationCount(selectedDentist.certifications) >
                      0 && (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                          <Badge className="w-5 h-5" />
                          Certifications
                        </h3>
                        <div className="grid gap-3">
                          {renderCertifications(selectedDentist.certifications)}
                        </div>
                      </div>
                    )}

                    {/* Awards */}
                    {selectedDentist.awards?.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                          <Trophy className="w-5 h-5" />
                          Awards & Recognition
                        </h3>
                        <div className="grid gap-3">
                          {selectedDentist.awards.map((award, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-4 bg-warning/5 border border-warning/10 rounded-xl"
                            >
                              <Award className="w-5 h-5 text-warning" />
                              <span className="font-medium text-foreground">
                                {award}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Practice Locations */}
                    {selectedDentist.clinics &&
                      selectedDentist.clinics.length > 0 && (
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Practice Locations
                          </h3>
                          <div className="grid gap-4">
                            {selectedDentist.clinics.map((clinic, index) => (
                              <div
                                key={clinic.id || index}
                                className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-foreground text-lg mb-2">
                                      {clinic.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                      <MapPin className="w-4 h-4" />
                                      <span>{clinic.address}</span>
                                    </div>
                                    {clinic.phone && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="w-4 h-4" />
                                        <span>{clinic.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-4">
                        Quick Stats
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">
                            Years Practicing
                          </span>
                          <span className="font-bold text-primary">
                            {selectedDentist.experience_years || 0} years
                          </span>
                        </div>
                        {selectedDentist.consultation_fee && (
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm text-muted-foreground">
                              Consultation Fee
                            </span>
                            <span className="font-bold text-primary">
                              ₱
                              {selectedDentist.consultation_fee?.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                      <button
                        onClick={() => bookAppointment(selectedDentist)}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium text-lg"
                      >
                        <Calendar className="w-5 h-5" />
                        Book Appointment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dentist;
