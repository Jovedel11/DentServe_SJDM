import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { useTheme } from "@/core/contexts/ThemeProvider";
import { useClinicDiscovery } from "@/hooks/location/useClinicDiscovery";
import { useLocationService } from "@/hooks/location/useLocationService";
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
  Stethoscope,
  Building2,
  Award,
  AlertCircle,
  Loader2,
} from "lucide-react";

const GOOGLE_MAPS_LIBRARIES = ["places"];

const MapView = () => {
  const { theme } = useTheme();
  const {
    userLocation,
    locationPermission,
    getFormattedLocation,
    isLocationAvailable,
    requestLocationAccess,
  } = useLocationService();

  const {
    clinics,
    loading,
    error: hookError,
    discoverClinics,
    searchClinics: searchClinicsHook,
    getClinicDetails,
  } = useClinicDiscovery();

  // Map state
  const [map, setMap] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [modalClinic, setModalClinic] = useState(null);
  const [sortBy, setSortBy] = useState("distance");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    services: [],
    rating: 0,
    distance: 50,
    openNow: false,
  });
  const [error, setError] = useState(null);

  // Prevent concurrent API calls
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Google Maps configuration
  const mapContainerStyle = { width: "100%", height: "100%" };
  const defaultCenter = { lat: 14.8136, lng: 121.0447 }; // San Jose Del Monte

  // Get properly formatted location for Google Maps
  const mapCenter = useMemo(() => {
    const formattedLocation = getFormattedLocation();
    return formattedLocation || defaultCenter;
  }, [getFormattedLocation]);

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
    styles: lightMapStyles,
  };

  // ✅ FIXED: Check if clinic is currently open (aligned with database schema)
  const checkClinicIsOpen = useCallback((operatingHours) => {
    if (
      !operatingHours ||
      typeof operatingHours !== "object" ||
      Object.keys(operatingHours).length === 0
    ) {
      return false;
    }

    try {
      const now = new Date();
      const daysOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const currentDay = daysOfWeek[now.getDay()];

      // Get current time in minutes for comparison
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Get today's hours using the database schema format
      const dayHours = operatingHours[currentDay];

      if (!dayHours) {
        return false; // Day not defined = closed
      }

      // Check if explicitly closed
      if (dayHours.closed === true || dayHours.is_closed === true) {
        return false;
      }

      // ✅ Database uses "open" and "close" keys (not "start" and "end")
      const openTime = dayHours.open || dayHours.start;
      const closeTime = dayHours.close || dayHours.end;

      if (!openTime || !closeTime) {
        return false;
      }

      // Parse times
      const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (!match) return null;
        const [, hours, minutes] = match;
        return parseInt(hours) * 60 + parseInt(minutes);
      };

      const openMinutes = parseTime(openTime);
      const closeMinutes = parseTime(closeTime);

      if (openMinutes === null || closeMinutes === null) {
        return false;
      }

      // Check if currently open
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } catch (error) {
      console.error("Error checking clinic hours:", error);
      return false;
    }
  }, []);

  // ✅ Format distance
  const formatDistance = useCallback(
    (clinic) => {
      const distance =
        clinic.distance_km ||
        clinic.distance_numeric ||
        clinic.distance ||
        (clinic.position && userLocation
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              clinic.position.lat,
              clinic.position.lng
            )
          : null);

      if (!distance || distance === 0 || isNaN(distance)) {
        return "N/A";
      }

      const distanceNum = parseFloat(distance);
      return distanceNum > 0 ? distanceNum.toFixed(1) : "N/A";
    },
    [userLocation]
  );

  // Calculate distance using Haversine formula
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Load clinics
  useEffect(() => {
    const loadClinics = async () => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setError(null);

      try {
        const searchLocation = isLocationAvailable()
          ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }
          : null;

        const options = {
          maxDistance: filters.distance,
          services: filters.services,
          minRating: filters.rating > 0 ? filters.rating : null,
          limit: 50,
        };

        await discoverClinics(searchLocation, options);
      } catch (error) {
        console.error("Error loading clinics:", error);
        setError("Failed to load clinics. Please try again.");
      } finally {
        loadingRef.current = false;
      }
    };

    loadClinics();
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
    filters.distance,
    filters.services,
    filters.rating,
    discoverClinics,
    isLocationAvailable,
  ]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...clinics].map((clinic) => {
      const isCurrentlyOpen = checkClinicIsOpen(
        clinic.operating_hours || clinic.hours
      );

      return {
        ...clinic,
        is_open: isCurrentlyOpen,
        isOpen: isCurrentlyOpen,
        distance: formatDistance(clinic),
        distance_numeric: parseFloat(formatDistance(clinic)) || 0,
      };
    });

    // Apply service filter
    if (filters.services.length > 0) {
      filtered = filtered.filter((clinic) =>
        clinic.services?.some((service) =>
          filters.services.some((filterService) =>
            service.name?.toLowerCase().includes(filterService.toLowerCase())
          )
        )
      );
    }

    // Apply rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter((clinic) => clinic.rating >= filters.rating);
    }

    // Apply distance filter
    if (filters.distance < 50) {
      filtered = filtered.filter((clinic) => {
        const dist = parseFloat(
          clinic.distance_numeric || clinic.distance || 0
        );
        return !isNaN(dist) && dist <= filters.distance;
      });
    }

    // Apply open now filter
    if (filters.openNow) {
      filtered = filtered.filter((clinic) => clinic.is_open === true);
    }

    // Sort results
    switch (sortBy) {
      case "distance":
        filtered.sort((a, b) => {
          const distA = parseFloat(a.distance_numeric || a.distance || 99999);
          const distB = parseFloat(b.distance_numeric || b.distance || 99999);
          return distA - distB;
        });
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "recommended":
        filtered.sort((a, b) => {
          const scoreA =
            (a.rating || 0) * 0.6 +
            (1 /
              Math.max(
                parseFloat(a.distance_numeric || a.distance || 1),
                0.1
              )) *
              0.3 +
            Math.log(Math.max(a.total_reviews || 1, 1)) * 0.1;
          const scoreB =
            (b.rating || 0) * 0.6 +
            (1 /
              Math.max(
                parseFloat(b.distance_numeric || b.distance || 1),
                0.1
              )) *
              0.3 +
            Math.log(Math.max(b.total_reviews || 1, 1)) * 0.1;
          return scoreB - scoreA;
        });
        break;
      default:
        break;
    }

    setFilteredClinics(filtered);
  }, [clinics, filters, sortBy, checkClinicIsOpen, formatDistance]);

  // Search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        await searchClinicsHook(searchQuery, {
          maxDistance: filters.distance,
          services: filters.services,
          minRating: filters.rating > 0 ? filters.rating : null,
        });
      } catch (error) {
        console.error("Error searching clinics:", error);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, filters, searchClinicsHook]);

  // Location functions
  const getUserLocation = useCallback(async () => {
    try {
      const result = await requestLocationAccess(true);
      if (!result.success) {
        setError(result.error);
      }
    } catch (error) {
      console.error("Error getting user location:", error);
      setError("Failed to get your location.");
    }
  }, [requestLocationAccess]);

  const onLoad = useCallback((map) => setMap(map), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const getDirections = (clinic) => {
    const destination = `${clinic.position.lat},${clinic.position.lng}`;
    const formattedLocation = getFormattedLocation();
    const origin = formattedLocation
      ? `${formattedLocation.lat},${formattedLocation.lng}`
      : clinic.address;
    window.open(
      `https://www.google.com/maps/dir/${origin}/${destination}`,
      "_blank"
    );
  };

  const bookAppointment = (clinic) => {
    window.location.href = `/patient/book-appointment?clinic=${clinic.id}`;
  };

  const openClinicModal = async (clinic) => {
    const isCurrentlyOpen = checkClinicIsOpen(
      clinic.operating_hours || clinic.hours
    );
    const updatedClinic = {
      ...clinic,
      is_open: isCurrentlyOpen,
      isOpen: isCurrentlyOpen,
      distance: formatDistance(clinic),
    };

    setShowClinicModal(true);
    setModalClinic(updatedClinic);

    try {
      const result = await getClinicDetails(clinic.id);
      if (result.success && result.clinic) {
        const detailedIsOpen = checkClinicIsOpen(
          result.clinic.operating_hours || result.clinic.hours
        );
        setModalClinic({
          ...result.clinic,
          is_open: detailedIsOpen,
          isOpen: detailedIsOpen,
          distance: formatDistance(result.clinic),
        });
      }
    } catch (error) {
      console.error("Error loading clinic details:", error);
    }
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

  // ✅ Format operating hours for display (aligned with database schema)
  const formatOperatingHours = (hours) => {
    if (
      !hours ||
      typeof hours !== "object" ||
      Object.keys(hours).length === 0
    ) {
      return "Hours not available";
    }

    const currentDay = getCurrentDay();
    const dayHours = hours[currentDay];

    if (!dayHours) {
      return "Closed today";
    }

    if (dayHours.closed === true || dayHours.is_closed === true) {
      return "Closed";
    }

    // Database uses "open" and "close" keys
    const openTime = dayHours.open || dayHours.start;
    const closeTime = dayHours.close || dayHours.end;

    if (openTime && closeTime) {
      return `${openTime} - ${closeTime}`;
    }

    return "Hours not available";
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
            Discover quality dental care in your area with real-time
            availability.
          </p>
        </motion.div>

        {/* Error Message */}
        {(error || hookError) && (
          <motion.div
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-destructive">{error || hookError}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto px-3 py-1 bg-destructive text-destructive-foreground rounded-lg text-sm hover:bg-destructive/90"
            >
              Dismiss
            </button>
          </motion.div>
        )}

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
                placeholder="Search clinics or services..."
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
                    ? "Getting..."
                    : locationPermission === "granted"
                    ? "Location Set"
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
                <option value="recommended">Recommended</option>
                <option value="distance">Nearest First</option>
                <option value="rating">Highest Rated</option>
              </select>
              <span className="text-sm text-muted-foreground">
                {filteredClinics.length} clinic
                {filteredClinics.length !== 1 ? "s" : ""} found
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-sm text-muted-foreground">Open Now</span>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Services Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Services
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {[
                        "Teeth Cleaning",
                        "Dental Checkup",
                        "Teeth Whitening",
                        "Root Canal",
                        "Dental Implants",
                        "Orthodontics",
                      ].map((service) => (
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
                      max="50"
                      value={filters.distance}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          distance: parseInt(e.target.value),
                        }))
                      }
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="mt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.openNow}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              openNow: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-foreground">
                          Open Now Only
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <button
                    onClick={() =>
                      setFilters({
                        services: [],
                        rating: 0,
                        distance: 50,
                        openNow: false,
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
                libraries={GOOGLE_MAPS_LIBRARIES}
              >
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={isLocationAvailable() ? 12 : 11}
                  options={mapOptions}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                >
                  {/* User Location */}
                  {isLocationAvailable() && (
                    <Marker
                      position={getFormattedLocation()}
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
                  {filteredClinics.map((clinic, index) => {
                    if (
                      !clinic.position ||
                      typeof clinic.position.lat !== "number" ||
                      typeof clinic.position.lng !== "number" ||
                      isNaN(clinic.position.lat) ||
                      isNaN(clinic.position.lng)
                    ) {
                      return null;
                    }

                    return (
                      <Marker
                        key={`${clinic.id}-${index}`}
                        position={clinic.position}
                        onClick={() => setSelectedClinic(clinic)}
                        icon={{
                          url:
                            "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${
                clinic.is_open ? "#059669" : "#DC2626"
              }" stroke="white" stroke-width="1"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `),
                          scaledSize: new window.google.maps.Size(32, 32),
                          anchor: new window.google.maps.Point(16, 32),
                        }}
                        title={`${clinic.name} - ${
                          clinic.is_open ? "Open" : "Closed"
                        }`}
                      />
                    );
                  })}

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
                            {selectedClinic.rating.toFixed(1)} (
                            {selectedClinic.total_reviews ||
                              selectedClinic.reviews}{" "}
                            reviews)
                          </span>
                        </div>
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              selectedClinic.is_open
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedClinic.is_open ? "Open Now" : "Closed"}
                          </span>
                          {selectedClinic.distance !== "N/A" && (
                            <span className="text-sm text-gray-600">
                              • {selectedClinic.distance}km away
                            </span>
                          )}
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
                            Details
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
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
                    distance: 50,
                    openNow: false,
                  });
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  transition={{ delay: index * 0.05 }}
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
                      src={
                        clinic.image ||
                        clinic.image_url ||
                        "/assets/images/dental.png"
                      }
                      alt={clinic.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "/assets/images/dental.png";
                      }}
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-white text-xs font-medium rounded-full ${
                          clinic.is_open ? "bg-success/90" : "bg-destructive/90"
                        }`}
                      >
                        {clinic.is_open ? "Open" : "Closed"}
                      </span>
                      {clinic.badges?.length > 0 && (
                        <span className="px-2 py-1 bg-yellow-500/90 text-white text-xs font-medium rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      {clinic.distance !== "N/A" && (
                        <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                          {clinic.distance}km
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clinic Info */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
                        {clinic.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {renderStars(clinic.rating || 0)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(clinic.rating || 0).toFixed(1)} (
                          {clinic.total_reviews || clinic.reviews || 0})
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{clinic.address}</span>
                      </div>
                    </div>

                    {/* Services Preview */}
                    {clinic.services && clinic.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {clinic.services.slice(0, 2).map((service, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                          >
                            {service.name || service}
                          </span>
                        ))}
                        {clinic.services.length > 2 && (
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                            +{clinic.services.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick Info */}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>
                        {formatOperatingHours(
                          clinic.hours || clinic.operating_hours
                        )}
                      </span>
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
                  src={
                    modalClinic.image ||
                    modalClinic.image_url ||
                    "/assets/images/dental.png"
                  }
                  alt={modalClinic.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "/assets/images/dental.png";
                  }}
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
                      {renderStars(modalClinic.rating || 0)}
                    </div>
                    <span className="text-sm">
                      {(modalClinic.rating || 0).toFixed(1)} (
                      {modalClinic.total_reviews || modalClinic.reviews || 0}{" "}
                      reviews)
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
                        {modalClinic.phone || "Call for info"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                      <span
                        className={
                          modalClinic.is_open
                            ? "text-success font-medium"
                            : "text-destructive font-medium"
                        }
                      >
                        {modalClinic.is_open ? "Open Now" : "Closed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Navigation className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {modalClinic.distance !== "N/A"
                          ? `${modalClinic.distance}km away`
                          : "Distance unavailable"}
                      </span>
                    </div>
                  </div>

                  {/* Services */}
                  {modalClinic.services && modalClinic.services.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">
                        Services & Pricing
                      </h3>
                      <div className="space-y-3">
                        {modalClinic.services
                          .slice(0, 6)
                          .map((service, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Stethoscope className="w-4 h-4 text-primary" />
                                <div>
                                  <div className="font-medium text-foreground">
                                    {service.name || service}
                                  </div>
                                  {service.duration && (
                                    <div className="text-xs text-muted-foreground">
                                      {service.duration}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-primary">
                                {service.price || "Call for pricing"}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Doctors */}
                  {modalClinic.doctors && modalClinic.doctors.length > 0 && (
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
                              src={
                                doctor.image ||
                                doctor.profile_image_url ||
                                doctor.image_url ||
                                "/assets/images/dental.png"
                              }
                              alt={doctor.name || doctor.full_name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border"
                              onError={(e) => {
                                e.target.src = "/assets/images/dental.png";
                              }}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground">
                                {doctor.name || doctor.full_name}
                              </div>
                              <div className="text-sm text-primary">
                                {doctor.specialty || doctor.specialization}
                              </div>
                              {doctor.experience && (
                                <div className="text-xs text-muted-foreground">
                                  {doctor.experience}
                                </div>
                              )}
                            </div>
                            {(doctor.rating || doctor.average_rating) && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm font-medium">
                                  {doctor.rating || doctor.average_rating}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opening Hours */}
                  {modalClinic.hours &&
                    Object.keys(modalClinic.hours).length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">
                          Opening Hours
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(modalClinic.hours)
                            .filter(([day]) => !day.startsWith("_"))
                            .map(([day, hours]) => {
                              const isToday = day === getCurrentDay();
                              const isClosed =
                                hours.closed === true ||
                                hours.is_closed === true;
                              const openTime = hours.open || hours.start;
                              const closeTime = hours.close || hours.end;
                              const displayTime = isClosed
                                ? "Closed"
                                : openTime && closeTime
                                ? `${openTime} - ${closeTime}`
                                : "Hours vary";

                              return (
                                <div
                                  key={day}
                                  className={`flex justify-between p-2 rounded ${
                                    isToday
                                      ? "bg-primary/10 text-primary font-medium"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <span className="capitalize">{day}</span>
                                  <span>{displayTime}</span>
                                </div>
                              );
                            })}
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

// Light theme map styles
const lightMapStyles = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
];

export default MapView;
