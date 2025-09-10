import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { useTheme } from "@/core/contexts/ThemeProvider";
import {
  Search,
  MapPin,
  Phone,
  Clock,
  Star,
  Navigation,
  Calendar,
  SlidersHorizontal,
  X,
  Users,
  Stethoscope,
  Building2,
  Award,
  ThumbsUp,
} from "lucide-react";
import { mockClinics } from "@/data/mock-clinics";
import { availableServices } from "@/data/mock-services";

const Map = () => {
  const { theme } = useTheme();

  // Map state
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState("prompt");
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [modalClinic, setModalClinic] = useState(null);
  const [sortBy, setSortBy] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    services: [],
    rating: 0,
    distance: 25,
    openNow: false,
    emergencyHours: false,
    acceptsInsurance: false,
  });

  // Google Maps configuration
  const mapContainerStyle = { width: "100%", height: "100%" };
  const defaultCenter = { lat: 14.815710752120832, lng: 121.07312517865853 };
  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
    styles: theme === "dark" ? darkMapStyles : lightMapStyles,
  };

  // Smart recommendations algorithm
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
      // YOUR API CALL HERE - replace mockClinics with actual data
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setClinics(mockClinics);
      setFilteredClinics(mockClinics);
      setIsLoading(false);
    };
    loadClinics();
  }, []);

  // Filter and sort logic
  useEffect(() => {
    let filtered = [...clinics];

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (clinic) =>
          clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          clinic.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          clinic.services?.some((service) =>
            service.name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Apply filters
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
    if (filters.openNow) filtered = filtered.filter((clinic) => clinic.isOpen);
    if (filters.emergencyHours)
      filtered = filtered.filter((clinic) => clinic.emergencyHours);
    if (filters.acceptsInsurance)
      filtered = filtered.filter((clinic) => clinic.acceptsInsurance);

    // Sort results
    switch (sortBy) {
      case "distance":
        filtered.sort((a, b) => a.distance - b.distance);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
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
  }, [searchQuery, filters, sortBy, clinics, getRecommendedClinics]);

  // Location functions
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      setLocationPermission("requesting");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setLocationPermission("granted");
          if (map) {
            map.panTo(location);
            map.setZoom(12);
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          setLocationPermission("denied");
        }
      );
    } else {
      setLocationPermission("unavailable");
    }
  }, [map]);

  const onLoad = useCallback((map) => setMap(map), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const getDirections = (clinic) => {
    const destination = `${clinic.position.lat},${clinic.position.lng}`;
    const origin = userLocation
      ? `${userLocation.lat},${userLocation.lng}`
      : clinic.address;
    window.open(
      `https://www.google.com/maps/dir/${origin}/${destination}`,
      "_blank"
    );
  };

  const bookAppointment = (clinic) => {
    window.location.href = `/patient/book-appointment?clinic=${clinic.id}`;
  };

  const openClinicModal = (clinic) => {
    setModalClinic(clinic);
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
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Find Dental Clinics Near You
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the best dental care in your area with smart
            recommendations and real-time availability.
          </p>
        </motion.div>

        {/* Search and Controls */}
        <motion.div
          className="mb-8 space-y-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clinics, services, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={getUserLocation}
                disabled={locationPermission === "requesting"}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  locationPermission === "granted"
                    ? "bg-success/10 text-success border-2 border-success/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                } ${
                  locationPermission === "requesting"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <Navigation
                  className={`w-4 h-4 ${
                    locationPermission === "requesting" ? "animate-pulse" : ""
                  }`}
                />
                <span className="hidden sm:inline">
                  {locationPermission === "requesting"
                    ? "Getting Location..."
                    : locationPermission === "granted"
                    ? "Location Found"
                    : "Use My Location"}
                </span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2 ${
                  showFilters
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>

          {/* Sort and Stats */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none"
              >
                <option value="recommended">Smart Recommendations</option>
                <option value="distance">Nearest First</option>
                <option value="rating">Highest Rated</option>
              </select>
              <span className="text-sm text-muted-foreground">
                {filteredClinics.length} clinic
                {filteredClinics.length !== 1 ? "s" : ""} found
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
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

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border border-border rounded-xl p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Services Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Services
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availableServices.slice(0, 6).map((service) => (
                        <label
                          key={service}
                          className="flex items-center space-x-2"
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

                  {/* Rating Filter */}
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
                  </div>

                  {/* Quick Options */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Quick Options
                    </label>
                    <div className="space-y-2">
                      {[
                        { key: "openNow", label: "Open Now" },
                        { key: "emergencyHours", label: "Emergency Hours" },
                        { key: "acceptsInsurance", label: "Accepts Insurance" },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center space-x-2"
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
                        services: [],
                        rating: 0,
                        distance: 25,
                        openNow: false,
                        emergencyHours: false,
                        acceptsInsurance: false,
                      })
                    }
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear All Filters
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Map Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="h-96 md:h-[500px] lg:h-[600px] w-full">
              <LoadScript
                googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                libraries={["places"]}
              >
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={userLocation || defaultCenter}
                  zoom={userLocation ? 12 : 10}
                  options={mapOptions}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                >
                  {/* User Location */}
                  {userLocation && (
                    <Marker
                      position={userLocation}
                      icon={{
                        url:
                          "data:image/svg+xml;charset=UTF-8," +
                          encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                              <circle cx="12" cy="12" r="3" fill="white"/>
                            </svg>
                          `),
                        scaledSize: new window.google.maps.Size(24, 24),
                      }}
                      title="Your Location"
                    />
                  )}

                  {/* Clinic Markers */}
                  {filteredClinics.map((clinic) => (
                    <Marker
                      key={clinic.id}
                      position={clinic.position}
                      onClick={() => setSelectedClinic(clinic)}
                      icon={{
                        url:
                          "data:image/svg+xml;charset=UTF-8," +
                          encodeURIComponent(`
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${
                                clinic.isOpen ? "#059669" : "#DC2626"
                              }" stroke="white" stroke-width="1"/>
                              <circle cx="12" cy="9" r="2.5" fill="white"/>
                            </svg>
                          `),
                        scaledSize: new window.google.maps.Size(32, 32),
                      }}
                      title={clinic.name}
                    />
                  ))}

                  {/* Info Window */}
                  {selectedClinic && (
                    <InfoWindow
                      position={selectedClinic.position}
                      onCloseClick={() => setSelectedClinic(null)}
                    >
                      <div className="p-4 min-w-[250px] max-w-[300px]">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {selectedClinic.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {selectedClinic.address}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex">
                            {renderStars(selectedClinic.rating)}
                          </div>
                          <span className="text-sm text-gray-600">
                            {selectedClinic.rating} ({selectedClinic.reviews}{" "}
                            reviews)
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => getDirections(selectedClinic)}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded-lg transition-colors"
                          >
                            Directions
                          </button>
                          <button
                            onClick={() => openClinicModal(selectedClinic)}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </LoadScript>
            </div>
          </div>
        </motion.div>

        {/* Clinics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading nearby clinics...</p>
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Clinics Found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or expanding your search
                area.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilters({
                    services: [],
                    rating: 0,
                    distance: 25,
                    openNow: false,
                    emergencyHours: false,
                    acceptsInsurance: false,
                  });
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredClinics.map((clinic, index) => (
                <motion.div
                  key={clinic.id}
                  className={`bg-card border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                    selectedClinic?.id === clinic.id
                      ? "ring-2 ring-primary shadow-primary/20"
                      : ""
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setSelectedClinic(clinic);
                    if (map) {
                      map.panTo(clinic.position);
                      map.setZoom(15);
                    }
                  }}
                >
                  {/* Clinic Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={clinic.image}
                      alt={clinic.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-white text-xs font-medium rounded-full ${
                          clinic.isOpen ? "bg-success/90" : "bg-destructive/90"
                        }`}
                      >
                        {clinic.isOpen ? "Open" : "Closed"}
                      </span>
                      {sortBy === "recommended" && index < 3 && (
                        <span className="px-2 py-1 bg-primary/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Top Pick
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                        {clinic.distance}km
                      </span>
                    </div>
                  </div>

                  {/* Clinic Info */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
                        {clinic.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">{renderStars(clinic.rating)}</div>
                        <span className="text-sm text-muted-foreground">
                          {clinic.rating} ({clinic.reviews})
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{clinic.address}</span>
                      </div>
                    </div>

                    {/* Services Preview */}
                    <div className="flex flex-wrap gap-1">
                      {clinic.services?.slice(0, 2).map((service, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                        >
                          {service.name}
                        </span>
                      )) || []}
                      {clinic.services?.length > 2 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                          +{clinic.services.length - 2} more
                        </span>
                      )}
                    </div>

                    {/* Quick Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>
                          {clinic.hours?.[getCurrentDay()] ||
                            "Hours not available"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {clinic.acceptsInsurance && (
                          <span
                            className="text-success"
                            title="Accepts Insurance"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </span>
                        )}
                        {clinic.emergencyHours && (
                          <span
                            className="text-warning"
                            title="Emergency Hours Available"
                          >
                            <Clock className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          getDirections(clinic);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                      >
                        <Navigation className="w-4 h-4" />
                        Directions
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openClinicModal(clinic);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        <Building2 className="w-4 h-4" />
                        Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Clinic Details Modal */}
      <AnimatePresence>
        {showClinicModal && modalClinic && (
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
              className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={modalClinic.image}
                  alt={modalClinic.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <button
                  onClick={() => setShowClinicModal(false)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-4 text-white">
                  <h2 className="text-2xl font-bold mb-1">
                    {modalClinic.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {renderStars(modalClinic.rating)}
                    </div>
                    <span className="text-sm">
                      {modalClinic.rating} ({modalClinic.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(90vh-192px)] overflow-y-auto">
                <div className="space-y-6">
                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {modalClinic.address}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {modalClinic.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                      <span
                        className={
                          modalClinic.isOpen
                            ? "text-success"
                            : "text-destructive"
                        }
                      >
                        {modalClinic.isOpen ? "Open Now" : "Closed"} •{" "}
                        {modalClinic.hours?.[getCurrentDay()]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Next: {modalClinic.nextAvailable}
                      </span>
                    </div>
                  </div>

                  {/* Special Offers */}
                  {modalClinic.specialOffers?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">
                        Special Offers
                      </h3>
                      <div className="space-y-2">
                        {modalClinic.specialOffers.map((offer, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg"
                          >
                            <Award className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">
                              {offer}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">
                      Services & Pricing
                    </h3>
                    <div className="space-y-3">
                      {modalClinic.services
                        ?.slice(0, 4)
                        .map((service, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Stethoscope className="w-4 h-4 text-primary" />
                              <div>
                                <div className="font-medium text-foreground">
                                  {service.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {service.duration}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-primary">
                              {service.price}
                            </div>
                          </div>
                        )) || []}
                      {modalClinic.services?.length > 4 && (
                        <div className="text-center">
                          <span className="text-sm text-muted-foreground">
                            +{modalClinic.services.length - 4} more services
                            available
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctors */}
                  {modalClinic.doctors?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">
                        Our Doctors
                      </h3>
                      <div className="space-y-3">
                        {modalClinic.doctors.map((doctor) => (
                          <div
                            key={doctor.id}
                            className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                          >
                            <img
                              src={doctor.image}
                              alt={doctor.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground">
                                {doctor.name}
                              </div>
                              <div className="text-sm text-primary">
                                {doctor.specialty}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {doctor.experience} • {doctor.availability}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm font-medium">
                                {doctor.rating}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule */}
                  {modalClinic.hours && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">
                        Opening Hours
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(modalClinic.hours).map(
                          ([day, hours]) => (
                            <div
                              key={day}
                              className={`flex justify-between p-2 rounded ${
                                day === getCurrentDay()
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span className="capitalize font-medium">
                                {day}
                              </span>
                              <span>{hours}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border bg-muted/20">
                <div className="flex gap-3">
                  <button
                    onClick={() => getDirections(modalClinic)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </button>
                  <button
                    onClick={() => bookAppointment(modalClinic)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
                  >
                    <Calendar className="w-4 h-4" />
                    Book Appointment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const lightMapStyles = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
];

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
];

export default Map;
