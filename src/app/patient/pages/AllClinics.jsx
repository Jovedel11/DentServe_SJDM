import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Phone,
  Clock,
  Star,
  Navigation,
  Calendar,
  X,
  Users,
  Stethoscope,
  Building2,
  Award,
  ThumbsUp,
  List,
  Grid3X3,
  ChevronDown,
  Filter,
  Zap,
  Shield,
  Heart,
  ArrowUpDown,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { mockClinics } from "@/data/mock-clinics";
import { availableServices } from "@/data/mock-services";
import { availableLocations } from "@/data/mock-location";

const AllClinics = () => {
  // State management
  const [clinics, setClinics] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const [viewMode, setViewMode] = useState("list"); // list or grid
  const [showFilters, setShowFilters] = useState(false);
  const [savedClinics, setSavedClinics] = useState(new Set());
  const [preferredLocation, setPreferredLocation] = useState("");
  const [filters, setFilters] = useState({
    services: [],
    rating: 0,
    distance: 25,
    priceRange: "all",
    openNow: false,
    emergencyHours: false,
    acceptsInsurance: false,
    hasParking: false,
    wheelchairAccessible: false,
  });

  // Smart recommendations algorithm (same as your map component)
  const getRecommendedClinics = useMemo(() => {
    return clinics
      .map((clinic) => {
        let score = 0;
        score += (clinic.rating / 5) * 40; // Rating weight (40%)
        const feedbackRatio = clinic.helpfulFeedback / clinic.totalFeedback;
        score += feedbackRatio * 30; // Feedback helpfulness (30%)
        const maxDistance = 10;
        const distanceScore = Math.max(
          0,
          (maxDistance - clinic.distance) / maxDistance
        );
        score += distanceScore * 20; // Distance weight (20%)

        // Bonus factors (10%)
        if (clinic.isOpen) score += 3;
        if (clinic.emergencyHours) score += 2;
        if (clinic.acceptsInsurance) score += 2;
        if (clinic.specialOffers?.length > 0) score += 3;

        return { ...clinic, recommendationScore: score };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
  }, [clinics]);

  // Load clinics data
  useEffect(() => {
    const loadClinics = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setClinics(mockClinics);
      setFilteredClinics(mockClinics);
      setIsLoading(false);
    };
    loadClinics();
  }, []);

  // Filter and sort logic
  useEffect(() => {
    let filtered = [...clinics];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (clinic) =>
          clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          clinic.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          clinic.services?.some((service) =>
            service.name?.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          clinic.doctors?.some((doctor) =>
            doctor.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Preferred location filter
    if (preferredLocation && preferredLocation !== "Any Location") {
      filtered = filtered.filter((clinic) =>
        clinic.address.toLowerCase().includes(preferredLocation.toLowerCase())
      );
    }

    // Apply advanced filters
    if (filters.services.length > 0) {
      filtered = filtered.filter((clinic) =>
        clinic.services?.some((service) =>
          filters.services.includes(service.name)
        )
      );
    }
    if (filters.rating > 0)
      filtered = filtered.filter((clinic) => clinic.rating >= filters.rating);
    if (filters.distance < 25)
      filtered = filtered.filter(
        (clinic) => clinic.distance <= filters.distance
      );
    if (filters.priceRange !== "all") {
      const priceFilters = {
        budget: (clinic) =>
          clinic.services?.some(
            (s) => parseInt(s.price.replace(/[^0-9]/g, "")) < 5000
          ),
        moderate: (clinic) =>
          clinic.services?.some((s) => {
            const price = parseInt(s.price.replace(/[^0-9]/g, ""));
            return price >= 5000 && price <= 15000;
          }),
        premium: (clinic) =>
          clinic.services?.some(
            (s) => parseInt(s.price.replace(/[^0-9]/g, "")) > 15000
          ),
      };
      filtered = filtered.filter(
        priceFilters[filters.priceRange] || (() => true)
      );
    }
    if (filters.openNow) filtered = filtered.filter((clinic) => clinic.isOpen);
    if (filters.emergencyHours)
      filtered = filtered.filter((clinic) => clinic.emergencyHours);
    if (filters.acceptsInsurance)
      filtered = filtered.filter((clinic) => clinic.acceptsInsurance);
    if (filters.hasParking)
      filtered = filtered.filter((clinic) => clinic.hasParking);
    if (filters.wheelchairAccessible)
      filtered = filtered.filter((clinic) => clinic.wheelchairAccessible);

    // Sort results
    switch (sortBy) {
      case "distance":
        filtered.sort((a, b) => a.distance - b.distance);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "price-low":
        filtered.sort((a, b) => {
          const aPrice = Math.min(
            ...(a.services?.map((s) =>
              parseInt(s.price.replace(/[^0-9]/g, ""))
            ) || [0])
          );
          const bPrice = Math.min(
            ...(b.services?.map((s) =>
              parseInt(s.price.replace(/[^0-9]/g, ""))
            ) || [0])
          );
          return aPrice - bPrice;
        });
        break;
      case "alphabetical":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recommended":
      default:
        const recommended = getRecommendedClinics.filter((clinic) =>
          filtered.some((f) => f.id === clinic.id)
        );
        filtered = recommended;
        break;
    }

    setFilteredClinics(filtered);
  }, [
    searchQuery,
    preferredLocation,
    filters,
    sortBy,
    clinics,
    getRecommendedClinics,
  ]);

  // Utility functions
  const toggleSavedClinic = (clinicId) => {
    const newSaved = new Set(savedClinics);
    if (newSaved.has(clinicId)) {
      newSaved.delete(clinicId);
    } else {
      newSaved.add(clinicId);
    }
    setSavedClinics(newSaved);
  };

  const getDirections = (clinic) => {
    const destination = `${clinic.position.lat},${clinic.position.lng}`;
    window.open(`https://www.google.com/maps/dir//${destination}`, "_blank");
  };

  const bookAppointment = (clinic) => {
    window.location.href = `/patient/book-appointment?clinic=${clinic.id}`;
  };

  const openClinicModal = (clinic) => {
    setSelectedClinic(clinic);
    setShowClinicModal(true);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating)
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-300"
        }`}
      />
    ));
  };

  const getCurrentDay = () => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[new Date().getDay()];
  };

  const getPriceRange = (clinic) => {
    if (!clinic.services?.length) return "N/A";
    const prices = clinic.services.map((s) =>
      parseInt(s.price.replace(/[^0-9]/g, ""))
    );
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
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
            <List className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Browse All Dental Clinics
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete directory of dental clinics with detailed information,
            reviews, and booking capabilities.
          </p>
        </motion.div>

        {/* Search and Controls */}
        <motion.div
          className="mb-8 space-y-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Search Bar and Preferred Location */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clinics, services, doctors, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors text-lg"
              />
            </div>
            <div className="relative min-w-[200px]">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <select
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className="w-full pl-12 pr-10 py-4 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors appearance-none text-lg"
              >
                {availableLocations.map((location) => (
                  <option
                    key={location}
                    value={location === "Any Location" ? "" : location}
                  >
                    {location}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
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
                  className="pl-4 pr-10 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none appearance-none min-w-[180px]"
                >
                  <option value="recommended">🏆 Recommended</option>
                  <option value="distance">📍 Nearest First</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="price-low">💰 Price: Low to High</option>
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
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-3 transition-colors ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
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
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">
                {filteredClinics.length} clinic
                {filteredClinics.length !== 1 ? "s" : ""} found
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-muted-foreground">Open Now</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Recommended</span>
                </div>
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
                  {/* Services Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Services
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableServices.slice(0, 8).map((service) => (
                        <label
                          key={service}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-muted/30 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={filters.services.includes(service)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters((prev) => ({
                                  ...prev,
                                  services: [...prev.services, service],
                                }));
                              } else {
                                setFilters((prev) => ({
                                  ...prev,
                                  services: prev.services.filter(
                                    (s) => s !== service
                                  ),
                                }));
                              }
                            }}
                            className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="text-sm text-foreground">
                            {service}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Rating & Price */}
                  <div className="space-y-4">
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
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Price Range
                      </label>
                      <select
                        value={filters.priceRange}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceRange: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none"
                      >
                        <option value="all">All Prices</option>
                        <option value="budget">Budget (Under ₱5K)</option>
                        <option value="moderate">Moderate (₱5K - ₱15K)</option>
                        <option value="premium">Premium (Above ₱15K)</option>
                      </select>
                    </div>
                  </div>

                  {/* Distance Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Distance: {filters.distance}km
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      value={filters.distance}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          distance: parseInt(e.target.value),
                        }))
                      }
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1km</span>
                      <span>25km</span>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Advanced Options
                    </label>
                    <div className="space-y-2">
                      {[
                        { key: "openNow", label: "Open Now", icon: Clock },
                        {
                          key: "emergencyHours",
                          label: "Emergency Hours",
                          icon: Zap,
                        },
                        {
                          key: "acceptsInsurance",
                          label: "Accepts Insurance",
                          icon: Shield,
                        },
                        {
                          key: "hasParking",
                          label: "Has Parking",
                          icon: Building2,
                        },
                        {
                          key: "wheelchairAccessible",
                          label: "Wheelchair Accessible",
                          icon: Heart,
                        },
                      ].map(({ key, label, icon: Icon }) => (
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
                          <Icon className="w-4 h-4 text-muted-foreground" />
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
                        services: [],
                        rating: 0,
                        distance: 25,
                        priceRange: "all",
                        openNow: false,
                        emergencyHours: false,
                        acceptsInsurance: false,
                        hasParking: false,
                        wheelchairAccessible: false,
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

        {/* Clinics List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-6"></div>
              <p className="text-muted-foreground text-lg">
                Loading clinics...
              </p>
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                No Clinics Found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Try adjusting your search criteria, location preference, or
                filters to find more clinics.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPreferredLocation("");
                  setFilters({
                    services: [],
                    rating: 0,
                    distance: 25,
                    priceRange: "all",
                    openNow: false,
                    emergencyHours: false,
                    acceptsInsurance: false,
                    hasParking: false,
                    wheelchairAccessible: false,
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
              {filteredClinics.map((clinic, index) => (
                <motion.div
                  key={clinic.id}
                  className={`bg-card border-2 border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer group ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openClinicModal(clinic)}
                >
                  {/* Clinic Image */}
                  <div
                    className={`relative overflow-hidden ${
                      viewMode === "list" ? "w-80 h-64" : "h-48"
                    }`}
                  >
                    <img
                      src={clinic.image}
                      alt={clinic.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-white text-xs font-medium rounded-full backdrop-blur-sm ${
                          clinic.isOpen ? "bg-success/90" : "bg-destructive/90"
                        }`}
                      >
                        {clinic.isOpen ? "Open" : "Closed"}
                      </span>
                      {sortBy === "recommended" && index < 5 && (
                        <span className="px-2 py-1 bg-primary/90 text-white text-xs font-medium rounded-full backdrop-blur-sm flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Top Pick
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                        {clinic.distance}km
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSavedClinic(clinic.id);
                        }}
                        className="p-1.5 bg-black/70 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors"
                      >
                        {savedClinics.has(clinic.id) ? (
                          <BookmarkCheck className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Clinic Info */}
                  <div className="p-6 space-y-4 flex-1">
                    {/* Header */}
                    <div>
                      <h3 className="font-bold text-foreground text-xl mb-2 group-hover:text-primary transition-colors">
                        {clinic.name}
                      </h3>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1">
                          {renderStars(clinic.rating)}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {clinic.rating}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({clinic.reviews} reviews)
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm">
                            {Math.round(
                              (clinic.helpfulFeedback / clinic.totalFeedback) *
                                100
                            )}
                            % helpful
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{clinic.address}</span>
                      </div>
                    </div>

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                        <span
                          className={
                            clinic.isOpen ? "text-success" : "text-destructive"
                          }
                        >
                          {clinic.hours?.[getCurrentDay()] ||
                            "Hours not available"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">
                          Next: {clinic.nextAvailable}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {clinic.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {getPriceRange(clinic)}
                        </span>
                      </div>
                    </div>

                    {/* Services Preview */}
                    <div className="flex flex-wrap gap-2">
                      {clinic.services?.slice(0, 3).map((service, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                        >
                          {service.name}
                        </span>
                      )) || []}
                      {clinic.services?.length > 3 && (
                        <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                          +{clinic.services.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Features */}
                    <div className="flex items-center gap-4 text-sm">
                      {clinic.acceptsInsurance && (
                        <div className="flex items-center gap-1 text-success">
                          <Shield className="w-4 h-4" />
                          <span>Insurance</span>
                        </div>
                      )}
                      {clinic.emergencyHours && (
                        <div className="flex items-center gap-1 text-warning">
                          <Zap className="w-4 h-4" />
                          <span>Emergency</span>
                        </div>
                      )}
                      {clinic.hasParking && (
                        <div className="flex items-center gap-1 text-info">
                          <Building2 className="w-4 h-4" />
                          <span>Parking</span>
                        </div>
                      )}
                    </div>

                    {/* Special Offers */}
                    {clinic.specialOffers?.length > 0 && (
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Award className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-primary mb-1">
                              Special Offer
                            </div>
                            <div className="text-sm text-foreground">
                              {clinic.specialOffers[0]}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          getDirections(clinic);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
                      >
                        <Navigation className="w-4 h-4" />
                        Directions
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${clinic.phone}`, "_self");
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-border text-foreground rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-colors font-medium"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bookAppointment(clinic);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
                      >
                        <Calendar className="w-4 h-4" />
                        Book Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Clinic Details Modal (Reuse from your map component) */}
      <AnimatePresence>
        {showClinicModal && selectedClinic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowClinicModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={selectedClinic.image}
                  alt={selectedClinic.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <button
                  onClick={() => setShowClinicModal(false)}
                  className="absolute top-4 right-4 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute bottom-6 left-6 text-white">
                  <h2 className="text-3xl font-bold mb-2">
                    {selectedClinic.name}
                  </h2>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex">
                      {renderStars(selectedClinic.rating)}
                    </div>
                    <span className="text-lg font-medium">
                      {selectedClinic.rating}
                    </span>
                    <span className="text-sm opacity-90">
                      ({selectedClinic.reviews} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 text-white text-sm font-medium rounded-full backdrop-blur-sm ${
                        selectedClinic.isOpen
                          ? "bg-success/90"
                          : "bg-destructive/90"
                      }`}
                    >
                      {selectedClinic.isOpen ? "Open Now" : "Closed"}
                    </span>
                    <span className="text-sm opacity-90">
                      {selectedClinic.distance}km away
                    </span>
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
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-medium text-foreground">
                            Address
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedClinic.address}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-medium text-foreground">
                            Phone
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedClinic.phone}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-medium text-foreground">
                            Hours Today
                          </div>
                          <div
                            className={`text-sm ${
                              selectedClinic.isOpen
                                ? "text-success"
                                : "text-destructive"
                            }`}
                          >
                            {selectedClinic.hours?.[getCurrentDay()] ||
                              "Hours not available"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-medium text-foreground">
                            Next Available
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedClinic.nextAvailable}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Special Offers */}
                    {selectedClinic.specialOffers?.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-4">
                          Special Offers
                        </h3>
                        <div className="space-y-3">
                          {selectedClinic.specialOffers.map((offer, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-xl"
                            >
                              <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-foreground">{offer}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Services & Pricing */}
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-4">
                        Services & Pricing
                      </h3>
                      <div className="grid gap-3">
                        {selectedClinic.services?.map((service, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Stethoscope className="w-5 h-5 text-primary" />
                              <div>
                                <div className="font-medium text-foreground">
                                  {service.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {service.duration}
                                </div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {service.price}
                            </div>
                          </div>
                        )) || []}
                      </div>
                    </div>

                    {/* Doctors */}
                    {selectedClinic.doctors?.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-4">
                          Our Dental Team
                        </h3>
                        <div className="grid gap-4">
                          {selectedClinic.doctors.map((doctor) => (
                            <div
                              key={doctor.id}
                              className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl"
                            >
                              <img
                                src={doctor.image}
                                alt={doctor.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-border"
                              />
                              <div className="flex-1">
                                <div className="font-bold text-foreground text-lg">
                                  {doctor.name}
                                </div>
                                <div className="text-primary font-medium">
                                  {doctor.specialty}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {doctor.experience} • {doctor.availability}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                <span className="font-bold">
                                  {doctor.rating}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Opening Hours */}
                    {selectedClinic.hours && (
                      <div>
                        <h3 className="text-lg font-bold text-foreground mb-4">
                          Opening Hours
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(selectedClinic.hours).map(
                            ([day, hours]) => (
                              <div
                                key={day}
                                className={`flex justify-between p-3 rounded-lg ${
                                  day === getCurrentDay()
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <span className="capitalize">{day}</span>
                                <span>{hours}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Features */}
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-4">
                        Clinic Features
                      </h3>
                      <div className="space-y-3">
                        {[
                          {
                            key: "acceptsInsurance",
                            label: "Accepts Insurance",
                            icon: Shield,
                            color: "text-success",
                          },
                          {
                            key: "emergencyHours",
                            label: "Emergency Hours",
                            icon: Zap,
                            color: "text-warning",
                          },
                          {
                            key: "hasParking",
                            label: "Parking Available",
                            icon: Building2,
                            color: "text-info",
                          },
                          {
                            key: "wheelchairAccessible",
                            label: "Wheelchair Accessible",
                            icon: Heart,
                            color: "text-primary",
                          },
                        ].map(
                          ({ key, label, icon: Icon, color }) =>
                            selectedClinic[key] && (
                              <div
                                key={key}
                                className="flex items-center gap-3"
                              >
                                <Icon className={`w-5 h-5 ${color}`} />
                                <span className="text-foreground">{label}</span>
                              </div>
                            )
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                      <button
                        onClick={() => getDirections(selectedClinic)}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
                      >
                        <Navigation className="w-5 h-5" />
                        Get Directions
                      </button>
                      <button
                        onClick={() =>
                          window.open(`tel:${selectedClinic.phone}`, "_self")
                        }
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-border text-foreground rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-colors font-medium"
                      >
                        <Phone className="w-5 h-5" />
                        Call Now
                      </button>
                      <button
                        onClick={() => bookAppointment(selectedClinic)}
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

export default AllClinics;
