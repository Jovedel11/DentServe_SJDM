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
  AlertCircle,
  Loader2,
  MapPinOff,
  Target,
  ChevronDown,
} from "lucide-react";

const GOOGLE_MAPS_LIBRARIES = ["places"];

const MapView = () => {
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
  const [sortBy, setSortBy] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    services: [],
    rating: 0,
    distance: 50,
    openNow: false,
  });
  const [error, setError] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Prevent concurrent API calls
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Google Maps configuration
  const mapContainerStyle = { width: "100%", height: "100%" };
  const defaultCenter = { lat: 14.8136, lng: 121.0447 }; // San Jose Del Monte

  // ✅ Get map center from user location or default
  const mapCenter = useMemo(() => {
    const formattedLocation = getFormattedLocation();
    return formattedLocation || defaultCenter;
  }, [getFormattedLocation]);

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    styles: lightMapStyles,
  };

  // ✅ Format distance for display
  const formatDistanceDisplay = useCallback((distanceKm) => {
    if (!distanceKm || distanceKm === 0 || isNaN(distanceKm)) {
      return null;
    }
    const distanceNum = parseFloat(distanceKm);
    return distanceNum > 0 ? `${distanceNum.toFixed(1)} km` : null;
  }, []);

  // ✅ Format operating hours for display
  const formatOperatingHours = useCallback((hours) => {
    if (
      !hours ||
      typeof hours !== "object" ||
      Object.keys(hours).length === 0
    ) {
      return "Hours not available";
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

      let todayHours = null;
      const isWeekend = currentDay === "saturday" || currentDay === "sunday";

      // Handle nested weekdays/weekends structure
      if (hours.weekdays || hours.weekends) {
        const hoursGroup = isWeekend ? hours.weekends : hours.weekdays;
        todayHours = hoursGroup?.[currentDay];
      } else {
        todayHours = hours[currentDay];
      }

      if (!todayHours) return "Closed today";
      if (todayHours.closed === true || todayHours.is_closed === true)
        return "Closed";

      const openTime = todayHours.start || todayHours.open;
      const closeTime = todayHours.end || todayHours.close;

      if (openTime && closeTime) {
        return `${openTime} - ${closeTime}`;
      }

      return "Hours not available";
    } catch (error) {
      return "Hours not available";
    }
  }, []);

  // ✅ Create marker icon URLs (no dependency on Google Maps API)
  const getUserMarkerIcon = useCallback(() => {
    return {
      url:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="3"/>
            <circle cx="16" cy="16" r="5" fill="white"/>
            <circle cx="16" cy="16" r="14" fill="none" stroke="#3B82F6" stroke-width="1" opacity="0.3"/>
          </svg>
        `),
      scaledSize: { width: 32, height: 32 },
      anchor: { x: 16, y: 16 },
    };
  }, []);

  const getClinicMarkerIcon = useCallback((isOpen) => {
    return {
      url:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
          <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2C11.163 2 4 9.163 4 18c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" 
                  fill="${isOpen ? "#10B981" : "#EF4444"}" 
                  stroke="white" 
                  stroke-width="2"/>
            <circle cx="20" cy="18" r="6" fill="white"/>
            <circle cx="20" cy="18" r="3" fill="${
              isOpen ? "#10B981" : "#EF4444"
            }"/>
          </svg>
        `),
      scaledSize: { width: 40, height: 48 },
      anchor: { x: 20, y: 48 },
    };
  }, []);

  // ✅ Load clinics on mount and when filters change
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

  // ✅ Apply filters and sorting
  useEffect(() => {
    let filtered = [...clinics];

    // Service filter
    if (filters.services.length > 0) {
      filtered = filtered.filter((clinic) =>
        clinic.services?.some((service) =>
          filters.services.some((filterService) =>
            service.name?.toLowerCase().includes(filterService.toLowerCase())
          )
        )
      );
    }

    // Rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter((clinic) => clinic.rating >= filters.rating);
    }

    // Distance filter
    if (filters.distance < 50 && isLocationAvailable()) {
      filtered = filtered.filter((clinic) => {
        const dist = clinic.distance_numeric || clinic.distance_km || 0;
        return !isNaN(dist) && dist > 0 && dist <= filters.distance;
      });
    }

    // Open now filter
    if (filters.openNow) {
      filtered = filtered.filter((clinic) => clinic.is_open === true);
    }

    // Sort results
    switch (sortBy) {
      case "distance":
        if (isLocationAvailable()) {
          filtered.sort((a, b) => {
            const distA = a.distance_numeric || a.distance_km || 99999;
            const distB = b.distance_numeric || b.distance_km || 99999;
            return distA - distB;
          });
        }
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "recommended":
        filtered.sort((a, b) => {
          const distA = a.distance_numeric || a.distance_km || 1;
          const distB = b.distance_numeric || b.distance_km || 1;
          const scoreA =
            (a.rating || 0) * 0.6 +
            (1 / Math.max(distA, 0.1)) * 0.3 +
            Math.log(Math.max(a.total_reviews || 1, 1)) * 0.1;
          const scoreB =
            (b.rating || 0) * 0.6 +
            (1 / Math.max(distB, 0.1)) * 0.3 +
            Math.log(Math.max(b.total_reviews || 1, 1)) * 0.1;
          return scoreB - scoreA;
        });
        break;
      default:
        break;
    }

    setFilteredClinics(filtered);
  }, [clinics, filters, sortBy, isLocationAvailable]);

  // ✅ Search with debounce
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

  // ✅ Location functions
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

  const onLoad = useCallback((map) => {
    setMap(map);
    setIsMapLoaded(true);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    setIsMapLoaded(false);
  }, []);

  const getDirections = useCallback(
    (clinic) => {
      if (!clinic.position || !clinic.position.lat || !clinic.position.lng) {
        console.error("Clinic has no valid position:", clinic);
        return;
      }

      const destination = `${clinic.position.lat},${clinic.position.lng}`;
      const formattedLocation = getFormattedLocation();
      const origin = formattedLocation
        ? `${formattedLocation.lat},${formattedLocation.lng}`
        : clinic.address;
      window.open(
        `https://www.google.com/maps/dir/${origin}/${destination}`,
        "_blank"
      );
    },
    [getFormattedLocation]
  );

  const bookAppointment = useCallback((clinic) => {
    window.location.href = `/patient/book-appointment?clinic=${clinic.id}`;
  }, []);

  // ✅ Open clinic modal with loading state
  const openClinicModal = useCallback(
    async (clinic) => {
      setShowClinicModal(true);
      setModalClinic(clinic);
      setLoadingDetails(true);

      try {
        const result = await getClinicDetails(clinic.id);
        if (result.success && result.clinic) {
          setModalClinic(result.clinic);
        }
      } catch (error) {
        console.error("Error loading clinic details:", error);
      } finally {
        setLoadingDetails(false);
      }
    },
    [getClinicDetails]
  );

  const renderStars = useCallback((rating) => {
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
  }, []);

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

  // ✅ Select clinic and pan map
  const handleSelectClinic = useCallback(
    (clinic) => {
      setSelectedClinic(clinic);
      if (map && clinic.position) {
        map.panTo(clinic.position);
        map.setZoom(15);
      }
    },
    [map]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <motion.div
          className="text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-2xl mb-3 sm:mb-4">
            <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-3">
            Find Dental Clinics Near You
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Discover quality dental care in San Jose Del Monte with real-time
            availability
          </p>
        </motion.div>

        {/* Location Warning */}
        <AnimatePresence>
          {!isLocationAvailable() && (
            <motion.div
              className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <MapPinOff className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-900 dark:text-amber-100 font-medium text-sm sm:text-base">
                  Location access not enabled
                </p>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  Enable location to see accurate distances and find nearest
                  clinics
                </p>
              </div>
              <button
                onClick={getUserLocation}
                disabled={locationPermission === "requesting"}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Target className="w-4 h-4" />
                Enable Location
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {(error || hookError) && (
            <motion.div
              className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-900 dark:text-red-100 flex-1 text-sm sm:text-base">
                {error || hookError}
              </p>
              <button
                onClick={() => {
                  setError(null);
                }}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm font-medium"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Controls */}
        <motion.div
          className="mb-6 sm:mb-8 space-y-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Search and Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search clinics, services, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={getUserLocation}
                disabled={locationPermission === "requesting"}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base ${
                  locationPermission === "granted"
                    ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-800"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                <span className="inline sm:hidden">Location</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 border-2 text-sm sm:text-base ${
                  showFilters
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                <span className="inline sm:hidden">Filter</span>
                {(filters.services.length > 0 ||
                  filters.rating > 0 ||
                  filters.openNow) && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Sort and Stats */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto appearance-none px-4 py-2 pr-10 border border-border bg-card text-foreground rounded-lg focus:border-primary focus:outline-none cursor-pointer text-sm sm:text-base"
                >
                  <option value="recommended">✨ Recommended</option>
                  <option value="distance" disabled={!isLocationAvailable()}>
                    📍 Nearest First{" "}
                    {!isLocationAvailable() && "(Enable Location)"}
                  </option>
                  <option value="rating">⭐ Highest Rated</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {filteredClinics.length}{" "}
                {filteredClinics.length === 1 ? "clinic" : "clinics"}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              {isLocationAvailable() && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Location Active</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Open</span>
                <div className="w-2 h-2 bg-red-500 rounded-full ml-2" />
                <span>Closed</span>
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
                className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {/* Services Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Services
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
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
                          className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded"
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
                            className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none cursor-pointer"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={4.0}>4.0+ ⭐⭐⭐⭐</option>
                      <option value={4.5}>4.5+ ⭐⭐⭐⭐½</option>
                      <option value={4.8}>4.8+ ⭐⭐⭐⭐⭐</option>
                    </select>
                  </div>

                  {/* Distance Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Max Distance: {filters.distance}km
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
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      disabled={!isLocationAvailable()}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1km</span>
                      <span>50km</span>
                    </div>
                    <div className="mt-3">
                      <label className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={filters.openNow}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              openNow: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        />
                        <span className="text-sm text-foreground font-medium">
                          Show Open Clinics Only
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() =>
                      setFilters({
                        services: [],
                        rating: 0,
                        distance: 50,
                        openNow: false,
                      })
                    }
                    className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full sm:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
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
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="h-80 sm:h-96 md:h-[500px] lg:h-[600px] w-full">
              <LoadScript
                googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                libraries={GOOGLE_MAPS_LIBRARIES}
              >
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={isLocationAvailable() ? 13 : 12}
                  options={mapOptions}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                >
                  {/* User Location Marker */}
                  {isMapLoaded && isLocationAvailable() && (
                    <Marker
                      position={getFormattedLocation()}
                      icon={getUserMarkerIcon()}
                      title="Your Location"
                    />
                  )}

                  {/* Clinic Markers */}
                  {isMapLoaded &&
                    filteredClinics.map((clinic, index) => {
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
                          icon={getClinicMarkerIcon(clinic.is_open)}
                          title={`${clinic.name} - ${
                            clinic.is_open ? "Open" : "Closed"
                          }`}
                        />
                      );
                    })}

                  {/* Info Window */}
                  {isMapLoaded && selectedClinic && selectedClinic.position && (
                    <InfoWindow
                      position={selectedClinic.position}
                      onCloseClick={() => setSelectedClinic(null)}
                    >
                      <div className="p-4 min-w-[250px] max-w-[300px]">
                        <h3 className="font-semibold text-gray-900 mb-2 text-base">
                          {selectedClinic.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {selectedClinic.address}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex">
                            {renderStars(selectedClinic.rating || 0)}
                          </div>
                          <span className="text-sm text-gray-600">
                            {(selectedClinic.rating || 0).toFixed(1)} (
                            {selectedClinic.total_reviews || 0})
                          </span>
                        </div>
                        <div className="mb-3 flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              selectedClinic.is_open
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedClinic.is_open ? "Open Now" : "Closed"}
                          </span>
                          {formatDistanceDisplay(
                            selectedClinic.distance_km
                          ) && (
                            <span className="text-sm text-gray-600">
                              •{" "}
                              {formatDistanceDisplay(
                                selectedClinic.distance_km
                              )}{" "}
                              away
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              getDirections(selectedClinic);
                            }}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded-lg transition-colors font-medium"
                          >
                            Directions
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openClinicModal(selectedClinic);
                            }}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
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
          transition={{ delay: 0.3 }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">
                Finding dental clinics near you...
              </p>
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-muted/50 rounded-full mb-4">
                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                No Clinics Found
              </h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base max-w-md mx-auto px-4">
                Try adjusting your search criteria or expanding your search
                radius
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
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors text-sm sm:text-base"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredClinics.map((clinic, index) => (
                <motion.div
                  key={clinic.id}
                  className={`bg-card border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                    selectedClinic?.id === clinic.id
                      ? "ring-2 ring-primary border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.3) }}
                  onClick={() => handleSelectClinic(clinic)}
                >
                  {/* Clinic Image */}
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-muted">
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
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 text-white text-xs font-semibold rounded-full backdrop-blur-sm shadow-sm ${
                          clinic.is_open ? "bg-green-500/90" : "bg-red-500/90"
                        }`}
                      >
                        {clinic.is_open ? "Open" : "Closed"}
                      </span>
                      {clinic.badges?.length > 0 && (
                        <span className="px-2.5 py-1 bg-yellow-500/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm shadow-sm">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    {formatDistanceDisplay(clinic.distance_km) && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 bg-black/70 text-white text-xs font-semibold rounded-full backdrop-blur-sm shadow-sm">
                          {formatDistanceDisplay(clinic.distance_km)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clinic Info */}
                  <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                    <div>
                      <h3 className="font-bold text-foreground text-base sm:text-lg mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
                        {clinic.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {renderStars(clinic.rating || 0)}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                          {(clinic.rating || 0).toFixed(1)} (
                          {clinic.total_reviews || 0})
                        </span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{clinic.address}</span>
                      </div>
                    </div>

                    {/* Services Preview */}
                    {clinic.services && clinic.services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {clinic.services.slice(0, 2).map((service, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                          >
                            {service.name || service}
                          </span>
                        ))}
                        {clinic.services.length > 2 && (
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                            +{clinic.services.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Operating Hours */}
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {formatOperatingHours(
                          clinic.operating_hours || clinic.hours
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
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-xs sm:text-sm font-medium"
                      >
                        <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Directions
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openClinicModal(clinic);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium"
                      >
                        <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="relative h-48 overflow-hidden bg-muted">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <button
                  onClick={() => setShowClinicModal(false)}
                  className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="text-2xl font-bold mb-1 drop-shadow-lg">
                    {modalClinic.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {renderStars(modalClinic.rating || 0)}
                    </div>
                    <span className="text-sm font-medium drop-shadow">
                      {(modalClinic.rating || 0).toFixed(1)} (
                      {modalClinic.total_reviews || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(90vh-192px-73px)] overflow-y-auto custom-scrollbar">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Loading details...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex items-start gap-2.5 text-sm">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">
                          {modalClinic.address}
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5 text-sm">
                        <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">
                          {modalClinic.phone || "Call for information"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5 text-sm">
                        <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span
                          className={`font-medium ${
                            modalClinic.is_open
                              ? "text-green-600 dark:text-green-500"
                              : "text-red-600 dark:text-red-500"
                          }`}
                        >
                          {modalClinic.is_open ? "Open Now" : "Closed"}
                        </span>
                      </div>
                      {formatDistanceDisplay(modalClinic.distance_km) && (
                        <div className="flex items-start gap-2.5 text-sm">
                          <Navigation className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-foreground">
                            {formatDistanceDisplay(modalClinic.distance_km)}{" "}
                            away
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Services */}
                    {modalClinic.services &&
                      modalClinic.services.length > 0 && (
                        <div>
                          <h3 className="font-bold text-foreground mb-3 text-base">
                            Services & Pricing
                          </h3>
                          <div className="space-y-2">
                            {modalClinic.services
                              .slice(0, 6)
                              .map((service, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <Stethoscope className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-foreground text-sm">
                                        {service.name || service}
                                      </div>
                                      {service.duration && (
                                        <div className="text-xs text-muted-foreground">
                                          {service.duration}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm font-semibold text-primary whitespace-nowrap ml-2">
                                    {service.price || "Call for pricing"}
                                  </div>
                                </div>
                              ))}
                            {modalClinic.services.length > 6 && (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                +{modalClinic.services.length - 6} more services
                                available
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Doctors */}
                    {modalClinic.doctors && modalClinic.doctors.length > 0 && (
                      <div>
                        <h3 className="font-bold text-foreground mb-3 text-base">
                          Our Dental Team
                        </h3>
                        <div className="space-y-2">
                          {modalClinic.doctors.map((doctor) => (
                            <div
                              key={doctor.id}
                              className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                            >
                              <img
                                src={
                                  doctor.image ||
                                  doctor.profile_image_url ||
                                  "/assets/images/dental.png"
                                }
                                alt={doctor.name || doctor.full_name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-border flex-shrink-0 bg-muted"
                                onError={(e) => {
                                  e.target.src = "/assets/images/dental.png";
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground text-sm truncate">
                                  {doctor.name || doctor.full_name}
                                </div>
                                <div className="text-xs text-primary font-medium">
                                  {doctor.specialty || doctor.specialization}
                                </div>
                                {doctor.experience && (
                                  <div className="text-xs text-muted-foreground">
                                    {doctor.experience}
                                  </div>
                                )}
                              </div>
                              {(doctor.rating || doctor.average_rating) && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                  <span className="text-sm font-semibold text-foreground">
                                    {(
                                      doctor.rating || doctor.average_rating
                                    ).toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Opening Hours */}
                    {modalClinic.operating_hours &&
                      typeof modalClinic.operating_hours === "object" &&
                      Object.keys(modalClinic.operating_hours).length > 0 && (
                        <div>
                          <h3 className="font-bold text-foreground mb-3 text-base">
                            Opening Hours
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(() => {
                              const allDays = [];
                              const hours = modalClinic.operating_hours;
                              const daysOrder = [
                                "monday",
                                "tuesday",
                                "wednesday",
                                "thursday",
                                "friday",
                                "saturday",
                                "sunday",
                              ];

                              // Extract days from nested structure
                              if (hours.weekdays) {
                                Object.entries(hours.weekdays).forEach(
                                  ([day, dayHours]) => {
                                    allDays.push([day, dayHours]);
                                  }
                                );
                              }
                              if (hours.weekends) {
                                Object.entries(hours.weekends).forEach(
                                  ([day, dayHours]) => {
                                    allDays.push([day, dayHours]);
                                  }
                                );
                              }

                              // Sort by day order
                              allDays.sort(
                                (a, b) =>
                                  daysOrder.indexOf(a[0]) -
                                  daysOrder.indexOf(b[0])
                              );

                              return allDays.map(([day, dayHours]) => {
                                const isToday = day === getCurrentDay();
                                const isClosed =
                                  dayHours.closed === true ||
                                  dayHours.is_closed === true;
                                const openTime =
                                  dayHours.start || dayHours.open;
                                const closeTime =
                                  dayHours.end || dayHours.close;
                                const displayTime = isClosed
                                  ? "Closed"
                                  : openTime && closeTime
                                  ? `${openTime} - ${closeTime}`
                                  : "Hours vary";

                                return (
                                  <div
                                    key={day}
                                    className={`flex justify-between items-center p-2.5 rounded-lg text-sm ${
                                      isToday
                                        ? "bg-primary/15 text-primary font-semibold"
                                        : "bg-muted/50 text-foreground"
                                    }`}
                                  >
                                    <span className="capitalize font-medium">
                                      {day}
                                    </span>
                                    <span
                                      className={
                                        isToday
                                          ? "font-semibold"
                                          : "text-muted-foreground"
                                      }
                                    >
                                      {displayTime}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-border bg-muted/20">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => getDirections(modalClinic)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-semibold"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </button>
                  <button
                    onClick={() => bookAppointment(modalClinic)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-sm shadow-primary/30"
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

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
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
