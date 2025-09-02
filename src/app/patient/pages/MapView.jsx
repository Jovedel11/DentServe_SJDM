import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { useTheme } from "@/core/contexts/ThemeProvider";
import { useAuth } from "@/auth/context/AuthProvider"; // ✅ ADD: Auth context for better UX
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
  AlertCircle,
  RefreshCw,
  Loader2,
  MapIcon,
  Filter,
} from "lucide-react";
import { useClinicDiscovery } from "@/core/hooks/useClinicDiscovery";
import { useLocationService } from "@/core/hooks/useLocationService";

const MapView = () => {
  const { theme } = useTheme();
  const { isPatient, profile, user } = useAuth(); // ✅ ADD: Auth context integration

  // ✅ ENHANCED: Custom hooks with better error handling
  const {
    userLocation,
    locationPermission,
    locationError: locationServiceError,
    loading: locationLoading,
    requestLocationAccess,
    hasLocation,
    isLocationFresh,
    formatCoordinates,
    formatLastUpdated,
    canRequestLocation, // ✅ ADD: Better permission checking
  } = useLocationService();

  const {
    clinics,
    loading: clinicsLoading,
    error: clinicsError,
    searchFilter,
    discoverClinics,
    searchClinics,
    updateSearchFilter,
    getClinicDetails,
    availableServices,
    availableBadges,
    totalResults,
    isEmpty,
    formatDistance,
    getNearestClinics,
    getTopRatedClinics,
    hasLocation: hookHasLocation, // ✅ FIX: Use hook's location state
  } = useClinicDiscovery();

  // ✅ ENHANCED: Local state with better management
  const [map, setMap] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [modalClinic, setModalClinic] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState(null); // ✅ ADD: Debouncing

  // ✅ ENHANCED: Google Maps configuration
  const mapContainerStyle = { width: "100%", height: "100%" };
  const defaultCenter = { lat: 14.815710752120832, lng: 121.07312517865853 };

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: true,
      mapTypeControl: true,
      fullscreenControl: true,
      gestureHandling: "cooperative", // ✅ ADD: Better mobile experience
      styles: theme === "dark" ? darkMapStyles : lightMapStyles,
    }),
    [theme]
  );

  // ✅ ENHANCED: Location conversion with validation
  const googleMapsUserLocation = useMemo(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return null;

    // ✅ ADD: Validate coordinates
    const lat = parseFloat(userLocation.latitude);
    const lng = parseFloat(userLocation.longitude);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      console.warn("Invalid user location coordinates:", userLocation);
      return null;
    }

    return { lat, lng };
  }, [userLocation]);

  // ✅ ENHANCED: Clinic markers with error handling
  const googleMapsClinics = useMemo(() => {
    return clinics
      .map((clinic) => {
        // ✅ FIX: Better coordinate extraction
        let lat, lng;

        if (clinic.latitude && clinic.longitude) {
          lat = parseFloat(clinic.latitude);
          lng = parseFloat(clinic.longitude);
        } else if (clinic.position?.lat && clinic.position?.lng) {
          lat = parseFloat(clinic.position.lat);
          lng = parseFloat(clinic.position.lng);
        } else {
          console.warn("Clinic missing coordinates:", clinic.name);
          return null;
        }

        // Validate coordinates
        if (
          isNaN(lat) ||
          isNaN(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          console.warn("Invalid clinic coordinates:", clinic.name, {
            lat,
            lng,
          });
          return null;
        }

        return {
          ...clinic,
          position: { lat, lng },
        };
      })
      .filter(Boolean); // Remove invalid clinics
  }, [clinics]);

  // ✅ ENHANCED: Location request with better error handling
  const handleLocationRequest = useCallback(async () => {
    if (!canRequestLocation) {
      console.warn(
        "Cannot request location: permission denied or not supported"
      );
      return;
    }

    try {
      const result = await requestLocationAccess(true);

      if (result.success && result.location) {
        // ✅ ENHANCED: Auto-discover with loading state management
        const discoverResult = await discoverClinics(result.location);

        if (discoverResult.success && map) {
          const googleLocation = {
            lat: result.location.latitude,
            lng: result.location.longitude,
          };
          map.panTo(googleLocation);
          map.setZoom(12);
        }
      }
    } catch (error) {
      console.error("Location request failed:", error);
      // Error is already handled by the hook
    }
  }, [canRequestLocation, requestLocationAccess, discoverClinics, map]);

  // ✅ ENHANCED: Search with proper debouncing
  const handleSearch = useCallback(
    (query) => {
      setLocalSearchQuery(query);

      // Clear existing timeout
      if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
      }

      // Set new timeout
      const newTimeout = setTimeout(async () => {
        await searchClinics(query);
      }, 500); // 500ms debounce

      setSearchDebounceTimeout(newTimeout);
    },
    [searchClinics, searchDebounceTimeout]
  );

  // ✅ ENHANCED: Filter updates with validation
  const handleFilterUpdate = useCallback(
    (newFilters) => {
      // ✅ ADD: Validate filter values
      const validatedFilters = {
        ...newFilters,
        maxDistance: newFilters.maxDistance
          ? Math.max(1, Math.min(100, newFilters.maxDistance))
          : undefined,
        minRating: newFilters.minRating
          ? Math.max(0, Math.min(5, newFilters.minRating))
          : undefined,
      };

      updateSearchFilter(validatedFilters);
    },
    [updateSearchFilter]
  );

  // ✅ ENHANCED: Clinic modal with better error handling
  const openClinicModal = useCallback(
    async (clinic) => {
      setModalLoading(true);
      setShowClinicModal(true);
      setModalClinic(clinic);

      try {
        const result = await getClinicDetails(clinic.id);
        if (result.success && result.clinic) {
          setModalClinic(result.clinic);
        } else {
          console.error("Failed to load clinic details:", result.error);
          // Keep showing basic clinic info even if detailed fetch fails
        }
      } catch (error) {
        console.error("Error loading clinic details:", error);
        // Modal will show with basic clinic info
      } finally {
        setModalLoading(false);
      }
    },
    [getClinicDetails]
  );

  // ✅ ENHANCED: Map event handlers
  const onLoad = useCallback(
    (mapInstance) => {
      setMap(mapInstance);

      // ✅ ADD: Auto-fit bounds if clinics are available
      if (googleMapsClinics.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        googleMapsClinics.forEach((clinic) => {
          bounds.extend(clinic.position);
        });

        if (googleMapsUserLocation) {
          bounds.extend(googleMapsUserLocation);
        }

        mapInstance.fitBounds(bounds, { padding: 50 });
      }
    },
    [googleMapsClinics, googleMapsUserLocation]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // ✅ ENHANCED: Utility functions
  const getDirections = useCallback(
    (clinic) => {
      const destination = `${clinic.position?.lat || clinic.latitude},${
        clinic.position?.lng || clinic.longitude
      }`;
      const origin = googleMapsUserLocation
        ? `${googleMapsUserLocation.lat},${googleMapsUserLocation.lng}`
        : "current location";

      const url = `https://www.google.com/maps/dir/${encodeURIComponent(
        origin
      )}/${encodeURIComponent(destination)}`;
      window.open(url, "_blank");
    },
    [googleMapsUserLocation]
  );

  // ✅ ENHANCED: Booking with auth check
  const bookAppointment = useCallback(
    (clinic) => {
      if (!user) {
        // Redirect to login if not authenticated
        window.location.href = `/auth/login?redirect=/patient/book-appointment?clinic=${clinic.id}`;
        return;
      }

      if (!isPatient()) {
        console.warn("Only patients can book appointments");
        return;
      }

      window.location.href = `/patient/book-appointment?clinic=${clinic.id}`;
    },
    [user, isPatient]
  );

  // ✅ ENHANCED: Star rating component
  const renderStars = useCallback((rating) => {
    const numRating = parseFloat(rating) || 0;
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(numRating)
            ? "text-yellow-400 fill-yellow-400"
            : index < numRating
            ? "text-yellow-400 fill-yellow-400 opacity-50" // Half star
            : "text-gray-300"
        }`}
      />
    ));
  }, []);

  // ✅ ENHANCED: Auto-discovery with better conditions
  useEffect(() => {
    // Only auto-discover if we have location and no clinics loaded yet
    if (
      hookHasLocation &&
      !clinicsLoading &&
      clinics.length === 0 &&
      !clinicsError
    ) {
      discoverClinics();
    }
  }, [
    hookHasLocation,
    clinicsLoading,
    clinics.length,
    clinicsError,
    discoverClinics,
  ]);

  // ✅ ENHANCED: Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
      }
    };
  }, [searchDebounceTimeout]);

  // ✅ ENHANCED: Loading states
  const isLoading = locationLoading || clinicsLoading;
  const hasValidLocation = googleMapsUserLocation !== null;
  const hasClinicData = clinics.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* ✅ ENHANCED: Header with better messaging */}
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

          {/* ✅ ADD: User-specific messaging */}
          {user && profile && (
            <div className="mt-4 text-sm text-muted-foreground">
              Welcome back, {profile.profile?.first_name || "User"}!
              {isPatient()
                ? " Ready to book your next appointment?"
                : " Exploring clinic options."}
            </div>
          )}
        </motion.div>

        {/* ✅ ENHANCED: Error handling with better UX */}
        {(locationServiceError || clinicsError) && (
          <motion.div
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-destructive mb-1">
                {locationServiceError
                  ? "Location Access Issue"
                  : "Clinic Discovery Error"}
              </h3>
              <p className="text-sm text-destructive/80 mb-2">
                {locationServiceError || clinicsError}
              </p>
              {locationServiceError && (
                <div className="flex gap-2">
                  <button
                    onClick={handleLocationRequest}
                    className="text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-1 rounded-md transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      // Search without location
                      discoverClinics(null, { maxDistance: 50 });
                    }}
                    className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1 rounded-md transition-colors"
                  >
                    Search All Clinics
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Search and Controls - Keep existing implementation */}
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
                value={localSearchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
              />
              {/* ✅ ADD: Search loading indicator */}
              {clinicsLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* ✅ ENHANCED: Location Button with better states */}
              <button
                onClick={handleLocationRequest}
                disabled={locationLoading || !canRequestLocation}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  hasValidLocation && isLocationFresh
                    ? "bg-success/10 text-success border-2 border-success/20"
                    : locationPermission === "denied"
                    ? "bg-destructive/10 text-destructive border-2 border-destructive/20 cursor-not-allowed"
                    : canRequestLocation
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                } ${locationLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                title={
                  !canRequestLocation
                    ? "Location access not available"
                    : locationPermission === "denied"
                    ? "Location access denied. Please enable in browser settings."
                    : hasValidLocation
                    ? "Location active and up to date"
                    : "Click to enable location services"
                }
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {locationLoading
                    ? "Getting Location..."
                    : hasValidLocation && isLocationFresh
                    ? "Location Active"
                    : locationPermission === "denied"
                    ? "Location Denied"
                    : "Use My Location"}
                </span>
              </button>

              {/* ✅ ENHANCED: Refresh Button */}
              <button
                onClick={() => discoverClinics()}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                title="Refresh clinic search"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* ✅ ENHANCED: Filters Button with count indicator */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2 ${
                  showFilters
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {/* ✅ ADD: Active filters indicator */}
                {(searchFilter.services.length > 0 ||
                  searchFilter.badges.length > 0 ||
                  searchFilter.minRating > 0 ||
                  searchFilter.availableToday) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                )}
              </button>
            </div>
          </div>

          {/* ✅ ENHANCED: Location Info with more details */}
          {hasValidLocation && (
            <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-success" />
                  <span>Location: {formatCoordinates()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Updated: {formatLastUpdated()}</span>
                </div>
              </div>
              <div className="text-xs text-success font-medium">
                {userLocation?.source === "gps"
                  ? "📍 GPS Active"
                  : "📌 Saved Location"}
              </div>
            </div>
          )}

          {/* ✅ ENHANCED: Sort and Stats with better information */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <select
                value={searchFilter.sortBy}
                onChange={(e) => handleFilterUpdate({ sortBy: e.target.value })}
                className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none"
              >
                <option value="distance">Nearest First</option>
                <option value="rating">Highest Rated</option>
                <option value="name">Name A-Z</option>
                <option value="availability">Most Available</option>
              </select>
              <span className="text-sm text-muted-foreground">
                {totalResults} clinic{totalResults !== 1 ? "s" : ""} found
                {hasValidLocation
                  ? ` within ${searchFilter.maxDistance}km`
                  : ""}
                {searchFilter.services.length > 0 && (
                  <span className="text-primary">
                    {" "}
                    • {searchFilter.services.length} service filter
                    {searchFilter.services.length !== 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-muted-foreground">Available Now</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Certified</span>
              </div>
              {hasValidLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="text-muted-foreground">Near You</span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Filters Panel - Keep existing implementation with minor enhancements */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border border-border rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Filter Options
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Services Filter - Enhanced */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Services ({availableServices.length})
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {availableServices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No services available
                        </p>
                      ) : (
                        availableServices.slice(0, 10).map((service) => (
                          <label
                            key={service}
                            className="flex items-center space-x-2 hover:bg-muted/30 p-1 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={searchFilter.services.includes(service)}
                              onChange={(e) => {
                                const newServices = e.target.checked
                                  ? [...searchFilter.services, service]
                                  : searchFilter.services.filter(
                                      (s) => s !== service
                                    );
                                handleFilterUpdate({ services: newServices });
                              }}
                              className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-sm text-foreground">
                              {service}
                            </span>
                          </label>
                        ))
                      )}
                      {availableServices.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          +{availableServices.length - 10} more services...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rating Filter - Keep existing */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Minimum Rating
                    </label>
                    <select
                      value={searchFilter.minRating}
                      onChange={(e) =>
                        handleFilterUpdate({
                          minRating: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:border-primary focus:outline-none"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={3.0}>3.0+ Stars</option>
                      <option value={4.0}>4.0+ Stars</option>
                      <option value={4.5}>4.5+ Stars</option>
                      <option value={4.8}>4.8+ Stars</option>
                    </select>
                  </div>

                  {/* Distance Filter - Enhanced with validation */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Distance: {searchFilter.maxDistance}km
                      {!hasValidLocation && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Location required)
                        </span>
                      )}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={searchFilter.maxDistance}
                      onChange={(e) =>
                        handleFilterUpdate({
                          maxDistance: parseInt(e.target.value),
                        })
                      }
                      disabled={!hasValidLocation}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1km</span>
                      <span>100km</span>
                    </div>
                  </div>

                  {/* Quick Options - Enhanced */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Quick Options
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 hover:bg-muted/30 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={searchFilter.availableToday}
                          onChange={(e) =>
                            handleFilterUpdate({
                              availableToday: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-foreground">
                          Available Today
                        </span>
                      </label>
                      {/* ✅ ADD: More quick options */}
                      <label className="flex items-center space-x-2 hover:bg-muted/30 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={searchFilter.minRating >= 4}
                          onChange={(e) =>
                            handleFilterUpdate({
                              minRating: e.target.checked ? 4 : 0,
                            })
                          }
                          className="w-4 h-4 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-foreground">
                          4+ Star Rating
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Badges Filter - Enhanced */}
                {availableBadges.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Clinic Badges ({availableBadges.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableBadges.map((badge) => (
                        <button
                          key={badge}
                          onClick={() => {
                            const newBadges = searchFilter.badges.includes(
                              badge
                            )
                              ? searchFilter.badges.filter((b) => b !== badge)
                              : [...searchFilter.badges, badge];
                            handleFilterUpdate({ badges: newBadges });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            searchFilter.badges.includes(badge)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-primary/10"
                          }`}
                        >
                          {badge}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ✅ ENHANCED: Filter Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        handleFilterUpdate({
                          services: [],
                          minRating: 0,
                          maxDistance: 25,
                          badges: [],
                          availableToday: false,
                          searchQuery: "",
                        });
                        setLocalSearchQuery("");
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear All Filters
                    </button>
                    {/* ✅ ADD: Filter count */}
                    {(searchFilter.services.length > 0 ||
                      searchFilter.badges.length > 0 ||
                      searchFilter.minRating > 0 ||
                      searchFilter.availableToday) && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {[
                          searchFilter.services.length > 0 &&
                            `${searchFilter.services.length} services`,
                          searchFilter.badges.length > 0 &&
                            `${searchFilter.badges.length} badges`,
                          searchFilter.minRating > 0 &&
                            `${searchFilter.minRating}+ rating`,
                          searchFilter.availableToday && "available today",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ✅ ENHANCED: Map Section with better error handling */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="h-96 md:h-[500px] lg:h-[600px] w-full relative">
              {/* ✅ ADD: Map loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 bg-card/90 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary mb-2 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      {locationLoading
                        ? "Getting your location..."
                        : "Loading clinics..."}
                    </p>
                  </div>
                </div>
              )}

              <LoadScript
                googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                libraries={["places"]}
                onError={() => console.error("Google Maps failed to load")}
              >
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={googleMapsUserLocation || defaultCenter}
                  zoom={googleMapsUserLocation ? 12 : 10}
                  options={mapOptions}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                >
                  {/* ✅ ENHANCED: User Location Marker */}
                  {googleMapsUserLocation && (
                    <Marker
                      position={googleMapsUserLocation}
                      icon={{
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="3"/>
                            <circle cx="16" cy="16" r="4" fill="white"/>
                            <circle cx="16" cy="16" r="16" fill="#3B82F6" fill-opacity="0.2" stroke="#3B82F6" stroke-width="1"/>
                          </svg>
                        `)}`,
                        scaledSize: new window.google.maps.Size(32, 32),
                      }}
                      title="Your Current Location"
                      animation={window.google.maps.Animation.DROP}
                    />
                  )}

                  {/* ✅ ENHANCED: Clinic Markers with better icons and validation */}
                  {googleMapsClinics.map((clinic) => {
                    if (!clinic || !clinic.position) return null;

                    const isAvailable = (clinic.availableDoctors || 0) > 0;
                    const isTopRated = (clinic.rating || 0) >= 4.5;

                    return (
                      <Marker
                        key={clinic.id}
                        position={clinic.position}
                        onClick={() => setSelectedClinic(clinic)}
                        icon={{
                          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 3C13.03 3 9 7.03 9 12c0 7.88 9 21 9 21s9-13.13 9-21c0-4.97-4.03-9-9-9z" 
                                fill="${isAvailable ? "#059669" : "#DC2626"}" 
                                stroke="white" 
                                stroke-width="2"/>
                              <circle cx="18" cy="12" r="4" fill="white"/>
                              ${
                                isTopRated
                                  ? `<circle cx="26" cy="8" r="6" fill="#F59E0B" stroke="white" stroke-width="1"/>
                              <text x="26" y="11" text-anchor="middle" fill="white" font-size="8" font-weight="bold">★</text>`
                                  : ""
                              }
                            </svg>
                          `)}`,
                          scaledSize: new window.google.maps.Size(36, 36),
                        }}
                        title={`${clinic.name} - ${
                          isAvailable ? "Available" : "Busy"
                        }`}
                        animation={
                          selectedClinic?.id === clinic.id
                            ? window.google.maps.Animation.BOUNCE
                            : null
                        }
                      />
                    );
                  })}

                  {/* ✅ ENHANCED: Info Window */}
                  {selectedClinic && (
                    <InfoWindow
                      position={selectedClinic.position}
                      onCloseClick={() => setSelectedClinic(null)}
                      options={{
                        pixelOffset: new window.google.maps.Size(0, -10),
                        maxWidth: 350,
                      }}
                    >
                      <div className="p-4 min-w-[280px] max-w-[340px]">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                            {selectedClinic.name}
                          </h3>
                          {selectedClinic.badges &&
                            selectedClinic.badges.length > 0 && (
                              <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1 flex-shrink-0">
                                <Award className="w-3 h-3" />
                                Certified
                              </span>
                            )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                          {selectedClinic.address}
                        </p>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {renderStars(selectedClinic.rating)}
                              </div>
                              <span className="text-sm text-gray-600">
                                {selectedClinic.rating
                                  ? selectedClinic.rating.toFixed(1)
                                  : "No rating"}
                              </span>
                            </div>
                            {selectedClinic.distance_km && (
                              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {formatDistance(selectedClinic.distance_km)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">
                                {selectedClinic.availableDoctors || 0} doctors
                              </span>
                            </div>
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                (selectedClinic.availableDoctors || 0) > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {(selectedClinic.availableDoctors || 0) > 0
                                ? "Available"
                                : "Busy"}
                            </div>
                          </div>

                          {selectedClinic.services_offered &&
                            selectedClinic.services_offered.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {selectedClinic.services_offered
                                  .slice(0, 2)
                                  .map((service, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                                    >
                                      {service}
                                    </span>
                                  ))}
                                {selectedClinic.services_offered.length > 2 && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    +
                                    {selectedClinic.services_offered.length - 2}{" "}
                                    more
                                  </span>
                                )}
                              </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => getDirections(selectedClinic)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded-lg transition-colors"
                          >
                            <Navigation className="w-4 h-4" />
                            Directions
                          </button>
                          <button
                            onClick={() => openClinicModal(selectedClinic)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Building2 className="w-4 h-4" />
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

        {/* ✅ ENHANCED: Clinics Grid - Keep existing implementation with minor improvements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-primary mb-4 animate-spin" />
              <p className="text-muted-foreground mb-2">
                {locationLoading
                  ? "Getting your location..."
                  : "Finding nearby clinics..."}
              </p>
              <p className="text-sm text-muted-foreground">
                This might take a few moments...
              </p>
            </div>
          ) : isEmpty ? (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Clinics Found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {hasValidLocation
                  ? "Try expanding your search distance or adjusting filters to find more clinics."
                  : "Enable location access to find clinics near you, or search without location for all available clinics."}
              </p>
              <div className="flex justify-center gap-3">
                {!hasValidLocation && canRequestLocation && (
                  <button
                    onClick={handleLocationRequest}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Enable Location
                  </button>
                )}
                <button
                  onClick={() => {
                    handleFilterUpdate({
                      services: [],
                      minRating: 0,
                      maxDistance: 50,
                      badges: [],
                      availableToday: false,
                      searchQuery: "",
                    });
                    setLocalSearchQuery("");
                  }}
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => discoverClinics(null, { maxDistance: 100 })}
                  className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Search All Clinics
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ✅ ADD: Quick stats and recommendations */}
              {hasClinicData && (
                <div className="mb-6 p-4 bg-muted/30 rounded-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {totalResults}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total Clinics
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-success">
                          {clinics.filter((c) => c.availableDoctors > 0).length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Available Now
                        </div>
                      </div>
                      {hasValidLocation && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">
                            {
                              clinics.filter(
                                (c) => c.distance_km && c.distance_km <= 5
                              ).length
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Within 5km
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ✅ ADD: Quick action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const topRated = getTopRatedClinics(1)[0];
                          if (topRated) {
                            setSelectedClinic(topRated);
                            if (map) {
                              map.panTo(topRated.position);
                              map.setZoom(15);
                            }
                          }
                        }}
                        className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
                      >
                        Show Top Rated
                      </button>
                      {hasValidLocation && (
                        <button
                          onClick={() => {
                            const nearest = getNearestClinics(1)[0];
                            if (nearest) {
                              setSelectedClinic(nearest);
                              if (map) {
                                map.panTo(nearest.position);
                                map.setZoom(15);
                              }
                            }
                          }}
                          className="text-xs bg-success/10 text-success px-3 py-1 rounded-full hover:bg-success/20 transition-colors"
                        >
                          Show Nearest
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Clinic Cards Grid - Keep existing implementation */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clinics.map((clinic, index) => (
                  <motion.div
                    key={clinic.id}
                    className={`bg-card border border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                      selectedClinic?.id === clinic.id
                        ? "ring-2 ring-primary shadow-primary/20"
                        : ""
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.1, 0.5) }} // ✅ FIX: Cap delay
                    onClick={() => {
                      setSelectedClinic(clinic);
                      if (map && clinic.position) {
                        map.panTo(clinic.position);
                        map.setZoom(15);
                      }
                    }}
                  >
                    {/* Clinic Image */}
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {clinic.image_url ? (
                        <img
                          src={clinic.image_url}
                          alt={clinic.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                          loading="lazy" // ✅ ADD: Lazy loading
                        />
                      ) : null}
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-muted"
                        style={{ display: clinic.image_url ? "none" : "flex" }}
                      >
                        <Building2 className="w-12 h-12 text-muted-foreground" />
                      </div>

                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-white text-xs font-medium rounded-full ${
                            (clinic.availableDoctors || 0) > 0
                              ? "bg-success/90"
                              : "bg-destructive/90"
                          }`}
                        >
                          {(clinic.availableDoctors || 0) > 0
                            ? "Available"
                            : "Busy"}
                        </span>
                        {clinic.badges && clinic.badges.length > 0 && (
                          <span className="px-2 py-1 bg-primary/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {clinic.badges[0].badge_name}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 flex flex-col gap-1">
                        {clinic.distance_km && (
                          <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                            {formatDistance(clinic.distance_km)}
                          </span>
                        )}
                        {(clinic.rating || 0) >= 4.5 && (
                          <span className="px-2 py-1 bg-yellow-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Top
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clinic Info - Keep existing implementation */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">
                          {clinic.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {renderStars(clinic.rating || 0)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {clinic.rating
                              ? clinic.rating.toFixed(1)
                              : "No rating"}
                            {clinic.total_reviews > 0 &&
                              ` (${clinic.total_reviews})`}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate" title={clinic.address}>
                            {clinic.address}
                          </span>
                        </div>
                      </div>

                      {/* Services Preview */}
                      <div className="flex flex-wrap gap-1">
                        {clinic.services_offered
                          ?.slice(0, 2)
                          .map((service, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                              title={service}
                            >
                              {service.length > 15
                                ? `${service.substring(0, 15)}...`
                                : service}
                            </span>
                          )) || []}
                        {(clinic.services_offered?.length || 0) > 2 && (
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                            +{clinic.services_offered.length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Quick Info */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{clinic.availableDoctors || 0} doctors</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {clinic.specializations &&
                            clinic.specializations.length > 0 && (
                              <span
                                className="text-primary"
                                title="Specialized Care"
                              >
                                <Stethoscope className="w-4 h-4" />
                              </span>
                            )}
                          {clinic.consultationFeeRange?.min > 0 && (
                            <span
                              className="text-xs text-muted-foreground"
                              title="Consultation Fee Range"
                            >
                              ₱{clinic.consultationFeeRange.min}-
                              {clinic.consultationFeeRange.max}
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
                          title="Get directions to this clinic"
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
                          title="View detailed information"
                        >
                          <Building2 className="w-4 h-4" />
                          Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ✅ ENHANCED: Clinic Details Modal - Keep existing implementation with minor improvements */}
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
              <div className="relative h-48 overflow-hidden bg-muted">
                {modalClinic.image_url ? (
                  <img
                    src={modalClinic.image_url}
                    alt={modalClinic.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ display: modalClinic.image_url ? "none" : "flex" }}
                >
                  <Building2 className="w-16 h-16 text-muted-foreground" />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <button
                  onClick={() => setShowClinicModal(false)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                  title="Close modal"
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
                      {modalClinic.rating
                        ? modalClinic.rating.toFixed(1)
                        : "No rating"}
                      {modalClinic.total_reviews > 0 &&
                        ` (${modalClinic.total_reviews} reviews)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(90vh-192px)] overflow-y-auto">
                {modalLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Quick Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {modalClinic.address}
                        </span>
                      </div>
                      {modalClinic.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {modalClinic.phone}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {modalClinic.availableDoctors || 0} doctors available
                        </span>
                      </div>
                      {modalClinic.distance_km && (
                        <div className="flex items-center gap-2 text-sm">
                          <Navigation className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {formatDistance(modalClinic.distance_km)} away
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    {modalClinic.badges && modalClinic.badges.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">
                          Certifications
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {modalClinic.badges.map((badge, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg"
                            >
                              <Award className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-foreground">
                                {badge.badge_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Services */}
                    {modalClinic.services_offered &&
                      modalClinic.services_offered.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-3">
                            Services Offered
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modalClinic.services_offered.map(
                              (service, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg"
                                >
                                  <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
                                  <span className="text-sm text-foreground">
                                    {service}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Doctors */}
                    {modalClinic.doctors && modalClinic.doctors.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">
                          Available Doctors
                        </h3>
                        <div className="space-y-3">
                          {modalClinic.doctors.slice(0, 5).map((doctor) => (
                            <div
                              key={doctor.id}
                              className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                            >
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-foreground">
                                  {doctor.name ||
                                    `Dr. ${doctor.specialization}`}
                                </div>
                                <div className="text-sm text-primary">
                                  {doctor.specialization}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {doctor.experience_years &&
                                    `${doctor.experience_years} years experience`}
                                  {doctor.consultation_fee &&
                                    ` • ₱${doctor.consultation_fee} consultation`}
                                </div>
                              </div>
                              {doctor.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                  <span className="text-sm font-medium">
                                    {doctor.rating}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {modalClinic.doctors.length > 5 && (
                            <div className="text-center text-sm text-muted-foreground">
                              +{modalClinic.doctors.length - 5} more doctors
                              available
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Consultation Fee Range */}
                    {modalClinic.consultationFeeRange &&
                      modalClinic.consultationFeeRange.min > 0 && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-3">
                            Consultation Fees
                          </h3>
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Price Range
                              </span>
                              <span className="font-medium text-foreground">
                                ₱{modalClinic.consultationFeeRange.min} - ₱
                                {modalClinic.consultationFeeRange.max}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}
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

// Map styles remain the same
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

export default MapView;
