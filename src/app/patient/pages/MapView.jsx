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
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useClinicDiscovery } from "@/core/hooks/useClinicDiscovery";
import { useLocationService } from "@/core/hooks/useLocationService";

const MapView = () => {
  const { theme } = useTheme();

  // Custom hooks
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
  } = useClinicDiscovery();

  // Local state
  const [map, setMap] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [modalClinic, setModalClinic] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");

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

  // Convert userLocation format for Google Maps
  const googleMapsUserLocation = useMemo(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return null;
    return {
      lat: userLocation.latitude,
      lng: userLocation.longitude,
    };
  }, [userLocation]);

  // Convert clinic positions for Google Maps
  const googleMapsClinics = useMemo(() => {
    return clinics.map((clinic) => ({
      ...clinic,
      position: {
        lat: clinic.latitude || clinic.position?.lat || 0,
        lng: clinic.longitude || clinic.position?.lng || 0,
      },
    }));
  }, [clinics]);

  // Handle location request with better UX
  const handleLocationRequest = useCallback(async () => {
    try {
      const result = await requestLocationAccess(true);

      if (result.success) {
        // Auto-discover clinics when location is available
        await discoverClinics();

        // Center map on user location
        if (map && result.location) {
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
    }
  }, [requestLocationAccess, discoverClinics, map]);

  // Search handler with debouncing
  const handleSearch = useCallback(
    async (query) => {
      setLocalSearchQuery(query);
      await searchClinics(query);
    },
    [searchClinics]
  );

  // Filter update handler
  const handleFilterUpdate = useCallback(
    (newFilters) => {
      updateSearchFilter(newFilters);
    },
    [updateSearchFilter]
  );

  // Clinic details modal handler
  const openClinicModal = useCallback(
    async (clinic) => {
      setModalLoading(true);
      setShowClinicModal(true);
      setModalClinic(clinic);

      try {
        const result = await getClinicDetails(clinic.id);
        if (result.success && result.clinic) {
          setModalClinic(result.clinic);
        }
      } catch (error) {
        console.error("Error loading clinic details:", error);
      } finally {
        setModalLoading(false);
      }
    },
    [getClinicDetails]
  );

  // Map event handlers
  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Utility functions
  const getDirections = useCallback(
    (clinic) => {
      const destination = `${clinic.position?.lat || clinic.latitude},${
        clinic.position?.lng || clinic.longitude
      }`;
      const origin = googleMapsUserLocation
        ? `${googleMapsUserLocation.lat},${googleMapsUserLocation.lng}`
        : clinic.address;
      window.open(
        `https://www.google.com/maps/dir/${origin}/${destination}`,
        "_blank"
      );
    },
    [googleMapsUserLocation]
  );

  const bookAppointment = useCallback((clinic) => {
    window.location.href = `/patient/book-appointment?clinic=${clinic.id}`;
  }, []);

  const renderStars = useCallback((rating) => {
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
  }, []);

  const getCurrentDay = useCallback(() => {
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
  }, []);

  // Auto-discover clinics when location becomes available
  useEffect(() => {
    if (hasLocation && !clinicsLoading && clinics.length === 0) {
      discoverClinics();
    }
  }, [hasLocation, clinicsLoading, clinics.length, discoverClinics]);

  // Loading state
  const isLoading = locationLoading || clinicsLoading;

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

        {/* Error Alert */}
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
                  ? "Location Error"
                  : "Clinic Discovery Error"}
              </h3>
              <p className="text-sm text-destructive/80">
                {locationServiceError || clinicsError}
              </p>
            </div>
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
                placeholder="Search clinics, services, or locations..."
                value={localSearchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Location Button */}
              <button
                onClick={handleLocationRequest}
                disabled={locationLoading}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  hasLocation && isLocationFresh
                    ? "bg-success/10 text-success border-2 border-success/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                } ${locationLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {locationLoading
                    ? "Getting Location..."
                    : hasLocation && isLocationFresh
                    ? "Location Active"
                    : locationPermission === "denied"
                    ? "Location Denied"
                    : "Use My Location"}
                </span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => discoverClinics()}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Filters Button */}
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

          {/* Location Info */}
          {hasLocation && (
            <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Using location: {formatCoordinates()}</span>
              </div>
              <span>Updated: {formatLastUpdated()}</span>
            </div>
          )}

          {/* Sort and Stats */}
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
                {hasLocation ? ` within ${searchFilter.maxDistance}km` : ""}
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-muted-foreground">Open Now</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Top Rated</span>
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
                className="bg-card border border-border rounded-xl p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Services Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Services ({availableServices.length})
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availableServices.slice(0, 8).map((service) => (
                        <label
                          key={service}
                          className="flex items-center space-x-2"
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
                      ))}
                    </div>
                  </div>

                  {/* Rating Filter */}
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

                  {/* Distance Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Distance: {searchFilter.maxDistance}km
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
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Quick Options */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Quick Options
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
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
                    </div>
                  </div>
                </div>

                {/* Badges Filter */}
                {availableBadges.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Clinic Badges
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

                <div className="flex justify-between items-center pt-4 border-t border-border">
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
                  center={googleMapsUserLocation || defaultCenter}
                  zoom={googleMapsUserLocation ? 12 : 10}
                  options={mapOptions}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                >
                  {/* User Location Marker */}
                  {googleMapsUserLocation && (
                    <Marker
                      position={googleMapsUserLocation}
                      icon={{
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" fill="white"/>
                          </svg>
                        `)}`,
                        scaledSize: new window.google.maps.Size(24, 24),
                      }}
                      title="Your Location"
                    />
                  )}

                  {/* Clinic Markers */}
                  {googleMapsClinics.map((clinic) => (
                    <Marker
                      key={clinic.id}
                      position={clinic.position}
                      onClick={() => setSelectedClinic(clinic)}
                      icon={{
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${
                              clinic.availableDoctors > 0
                                ? "#059669"
                                : "#DC2626"
                            }" stroke="white" stroke-width="1"/>
                            <circle cx="12" cy="9" r="2.5" fill="white"/>
                          </svg>
                        `)}`,
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
                            {selectedClinic.rating || 0} rating
                          </span>
                        </div>
                        {selectedClinic.distance_km && (
                          <p className="text-sm text-gray-600 mb-3">
                            {formatDistance(selectedClinic.distance_km)} away
                          </p>
                        )}
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
              <Loader2 className="w-12 h-12 text-primary mb-4 animate-spin" />
              <p className="text-muted-foreground">
                {locationLoading
                  ? "Getting your location..."
                  : "Finding nearby clinics..."}
              </p>
            </div>
          ) : isEmpty ? (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Clinics Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasLocation
                  ? "Try expanding your search distance or adjusting filters."
                  : "Enable location access to find clinics near you."}
              </p>
              <div className="flex justify-center gap-3">
                {!hasLocation && (
                  <button
                    onClick={handleLocationRequest}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
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
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
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
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setSelectedClinic(clinic);
                    if (map) {
                      map.panTo(
                        clinic.position || {
                          lat: clinic.latitude,
                          lng: clinic.longitude,
                        }
                      );
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
                          clinic.availableDoctors > 0
                            ? "bg-success/90"
                            : "bg-destructive/90"
                        }`}
                      >
                        {clinic.availableDoctors > 0 ? "Available" : "Busy"}
                      </span>
                      {clinic.badges && clinic.badges.length > 0 && (
                        <span className="px-2 py-1 bg-primary/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {clinic.badges[0].badge_name}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3">
                      {clinic.distance_km && (
                        <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                          {formatDistance(clinic.distance_km)}
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
                          {clinic.rating
                            ? clinic.rating.toFixed(1)
                            : "No rating"}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{clinic.address}</span>
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
                          >
                            {service}
                          </span>
                        )) || []}
                      {clinic.services_offered?.length > 2 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                          +{clinic.services_offered.length - 2} more
                        </span>
                      )}
                    </div>

                    {/* Quick Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        <span>
                          {clinic.availableDoctors || 0} doctors available
                        </span>
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
                          <span className="text-xs text-muted-foreground">
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
