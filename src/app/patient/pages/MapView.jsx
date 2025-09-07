import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { useAuth } from "@/auth/context/AuthProvider";
import { useClinicDiscovery } from "@/core/hooks/useClinicDiscovery";
import { useLocationService } from "@/core/hooks/useLocationService";

const GOOGLE_MAPS_LIBRARIES = ["places"];

const MapView = () => {
  const { user, isPatient } = useAuth();

  const {
    clinics: discoveredClinics,
    loading: clinicsLoading,
    error: clinicsError,
    searchFilter,
    updateSearchFilter,
    getClinicDetails,
    availableServices,
    totalResults,
    isEmpty,
    formatDistance,
    getAllClinics,
  } = useClinicDiscovery();

  const {
    userLocation,
    locationPermission,
    locationError,
    loading: locationLoading,
    requestLocationAccess,
    canRequestLocation,
    formatCoordinates,
    formatLastUpdated,
  } = useLocationService();

  const [map, setMap] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [modalClinic, setModalClinic] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  const hasInitialized = useRef(false);
  const initTimeoutRef = useRef(null);

  const mapContainerStyle = { width: "100%", height: "100%" };
  const defaultCenter = { lat: 14.815710752120832, lng: 121.07312517865853 };
  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
  };

  // ✅ FIXED: Add coordinate validation helper
  const validateCoordinates = useCallback((lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    return {
      isValid:
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180,
      lat: latitude,
      lng: longitude,
    };
  }, []);

  // ✅ FIXED: Filter clinics with valid coordinates
  const validClinics = useCallback(() => {
    return discoveredClinics.filter((clinic) => {
      const coords = validateCoordinates(clinic.latitude, clinic.longitude);
      return coords.isValid;
    });
  }, [discoveredClinics, validateCoordinates]);

  useEffect(() => {
    if (hasInitialized.current) return;

    const initializeMap = async () => {
      hasInitialized.current = true;

      try {
        console.log("Loading all clinics...");
        const result = await getAllClinics();

        if (result.success) {
          console.log(`Loaded ${result.count} clinics successfully`);
        } else if (
          result.error !== "Too many search requests. Please wait a moment."
        ) {
          console.warn("Failed to load clinics:", result.error);
        }
      } catch (error) {
        console.error("Map initialization error:", error);
      }
    };

    initTimeoutRef.current = setTimeout(initializeMap, 2000);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [getAllClinics]);

  const handleSearch = useCallback(
    (query) => {
      setLocalSearchQuery(query);
      updateSearchFilter({ searchQuery: query });
    },
    [updateSearchFilter]
  );

  const handleLocationRequest = useCallback(async () => {
    if (!canRequestLocation || locationLoading) return;

    const result = await requestLocationAccess(false);

    if (result.success && map && result.location) {
      map.panTo({
        lat: result.location.latitude,
        lng: result.location.longitude,
      });
      map.setZoom(12);
    }
  }, [canRequestLocation, locationLoading, requestLocationAccess, map]);

  const handleFilterUpdate = useCallback(
    (newFilters) => {
      updateSearchFilter(newFilters);
    },
    [updateSearchFilter]
  );

  const handleClinicDetails = useCallback(
    async (clinicId) => {
      const result = await getClinicDetails(clinicId);

      if (result.success) {
        setModalClinic(result.clinic);
        setShowClinicModal(true);
      } else {
        console.error("Failed to load clinic details:", result.error);
      }
    },
    [getClinicDetails]
  );

  const onLoad = useCallback((map) => setMap(map), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const getDirections = useCallback(
    (clinic) => {
      const coords = validateCoordinates(clinic.latitude, clinic.longitude);
      if (!coords.isValid) {
        alert("Invalid clinic coordinates for directions");
        return;
      }

      const destination = `${coords.lat},${coords.lng}`;
      const origin = userLocation
        ? `${userLocation.latitude},${userLocation.longitude}`
        : clinic.address;

      window.open(
        `https://www.google.com/maps/dir/${encodeURIComponent(
          origin
        )}/${encodeURIComponent(destination)}`,
        "_blank"
      );
    },
    [userLocation, validateCoordinates]
  );

  const bookAppointment = useCallback((clinic) => {
    window.location.href = `/patient/book-appointment?clinic=${clinic.id}`;
  }, []);

  const renderStars = useCallback((rating) => {
    return [...Array(5)].map((_, index) => (
      <span key={index}>{index < Math.floor(rating) ? "★" : "☆"}</span>
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

  const isClinicOpen = useCallback(
    (clinic) => {
      if (!clinic.operating_hours) return false;

      try {
        const hours =
          typeof clinic.operating_hours === "string"
            ? JSON.parse(clinic.operating_hours)
            : clinic.operating_hours;

        const currentDay = getCurrentDay();
        const todayHours = hours[currentDay];

        if (!todayHours || todayHours === "Closed") return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const timeMatch = todayHours.match(
          /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/
        );
        if (timeMatch) {
          const openTime = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
          const closeTime =
            parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4]);
          return currentTime >= openTime && currentTime <= closeTime;
        }

        return false;
      } catch (error) {
        console.error("Error parsing operating hours:", error);
        return false;
      }
    },
    [getCurrentDay]
  );

  // Show error only for serious errors, not rate limiting
  if (clinicsError && !clinicsError.includes("Too many search requests")) {
    return (
      <div>
        <h2>Unable to Load Map</h2>
        <p>Error: {clinicsError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1>Find Dental Clinics Near You</h1>
        <p>Discover the best dental care in your area</p>

        {userLocation && (
          <div>
            <p>
              Location: {formatCoordinates()} • {formatLastUpdated()}
            </p>
          </div>
        )}
      </div>

      <div>
        <input
          type="text"
          placeholder="Search clinics, services, or locations..."
          value={localSearchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <button
          onClick={handleLocationRequest}
          disabled={locationLoading || !canRequestLocation}
        >
          {locationLoading
            ? "Getting Location..."
            : locationPermission === "granted"
            ? "Location Active"
            : "Use My Location"}
        </button>

        <button onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>

        <select
          value={searchFilter.sortBy}
          onChange={(e) => handleFilterUpdate({ sortBy: e.target.value })}
        >
          <option value="name">Alphabetical</option>
          <option value="distance">Nearest First</option>
          <option value="rating">Highest Rated</option>
          <option value="availability">Most Available</option>
        </select>

        <span>{totalResults} clinics found</span>

        {locationError && <div>Location Error: {locationError}</div>}

        {showFilters && (
          <div>
            <h3>Filters</h3>

            <div>
              <h4>Services ({availableServices.length} available)</h4>
              {availableServices.slice(0, 8).map((service) => (
                <label key={service}>
                  <input
                    type="checkbox"
                    checked={searchFilter.services.includes(service)}
                    onChange={(e) => {
                      const newServices = e.target.checked
                        ? [...searchFilter.services, service]
                        : searchFilter.services.filter((s) => s !== service);
                      handleFilterUpdate({ services: newServices });
                    }}
                  />
                  {service}
                </label>
              ))}
            </div>

            <div>
              <h4>Minimum Rating</h4>
              <select
                value={searchFilter.minRating}
                onChange={(e) =>
                  handleFilterUpdate({ minRating: parseFloat(e.target.value) })
                }
              >
                <option value={0}>Any Rating</option>
                <option value={3.0}>3.0+ Stars</option>
                <option value={4.0}>4.0+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>

            <div>
              <h4>Distance: {searchFilter.maxDistance}km</h4>
              <input
                type="range"
                min="1"
                max="100"
                value={searchFilter.maxDistance}
                onChange={(e) =>
                  handleFilterUpdate({ maxDistance: parseInt(e.target.value) })
                }
              />
            </div>

            <button
              onClick={() => {
                handleFilterUpdate({
                  services: [],
                  minRating: 0,
                  maxDistance: 50,
                  badges: [],
                  availableToday: false,
                  sortBy: "name",
                  searchQuery: "",
                });
                setLocalSearchQuery("");
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      <div style={{ height: "500px", width: "100%" }}>
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={GOOGLE_MAPS_LIBRARIES}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={
              userLocation
                ? { lat: userLocation.latitude, lng: userLocation.longitude }
                : defaultCenter
            }
            zoom={userLocation ? 12 : 10}
            options={mapOptions}
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {userLocation && (
              <Marker
                position={{
                  lat: userLocation.latitude,
                  lng: userLocation.longitude,
                }}
                title="Your Location"
                icon={{
                  url:
                    "data:image/svg+xml;charset=UTF-8," +
                    encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                      <circle cx="12" cy="12" r="3" fill="white"/>
                    </svg>
                  `),
                  scaledSize: new window.google.maps.Size(24, 24),
                }}
              />
            )}

            {/* ✅ FIXED: Only render markers with valid coordinates */}
            {validClinics().map((clinic) => {
              const coords = validateCoordinates(
                clinic.latitude,
                clinic.longitude
              );
              if (!coords.isValid) return null;

              const isOpen = isClinicOpen(clinic);

              return (
                <Marker
                  key={clinic.id}
                  position={{ lat: coords.lat, lng: coords.lng }}
                  onClick={() => setSelectedClinic(clinic)}
                  title={clinic.name}
                  icon={{
                    url:
                      "data:image/svg+xml;charset=UTF-8," +
                      encodeURIComponent(`
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${
                          isOpen ? "#059669" : "#DC2626"
                        }" stroke="white" stroke-width="1"/>
                        <circle cx="12" cy="9" r="2.5" fill="white"/>
                      </svg>
                    `),
                    scaledSize: new window.google.maps.Size(32, 32),
                  }}
                />
              );
            })}

            {/* ✅ FIXED: Validate coordinates for InfoWindow */}
            {selectedClinic &&
              (() => {
                const coords = validateCoordinates(
                  selectedClinic.latitude,
                  selectedClinic.longitude
                );
                if (!coords.isValid) return null;

                return (
                  <InfoWindow
                    position={{ lat: coords.lat, lng: coords.lng }}
                    onCloseClick={() => setSelectedClinic(null)}
                  >
                    <div>
                      <h3>{selectedClinic.name}</h3>
                      <p>{selectedClinic.address}</p>
                      <div>
                        {renderStars(selectedClinic.rating || 0)}
                        <span>
                          {selectedClinic.rating?.toFixed(1) || "N/A"} (
                          {selectedClinic.total_reviews || 0} reviews)
                        </span>
                      </div>
                      <div>
                        <span>
                          {isClinicOpen(selectedClinic) ? "Open" : "Closed"}
                        </span>
                        {selectedClinic.distance_km && (
                          <span>
                            {" "}
                            • {formatDistance(selectedClinic.distance_km)} away
                          </span>
                        )}
                      </div>
                      <div>
                        <button onClick={() => getDirections(selectedClinic)}>
                          Directions
                        </button>
                        <button
                          onClick={() => handleClinicDetails(selectedClinic.id)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                );
              })()}
          </GoogleMap>
        </LoadScript>
      </div>

      <div>
        {clinicsLoading ? (
          <p>Loading clinics...</p>
        ) : isEmpty ? (
          <p>No clinics found. Try adjusting your search criteria.</p>
        ) : (
          <div>
            {discoveredClinics.map((clinic) => {
              const coords = validateCoordinates(
                clinic.latitude,
                clinic.longitude
              );
              const isOpen = isClinicOpen(clinic);

              return (
                <div
                  key={clinic.id}
                  onClick={() => {
                    if (coords.isValid) {
                      setSelectedClinic(clinic);
                      if (map) {
                        map.panTo({ lat: coords.lat, lng: coords.lng });
                        map.setZoom(15);
                      }
                    }
                  }}
                  style={{
                    border:
                      selectedClinic?.id === clinic.id
                        ? "2px solid blue"
                        : "1px solid gray",
                    padding: "15px",
                    margin: "10px",
                    cursor: coords.isValid ? "pointer" : "default",
                    opacity: coords.isValid ? 1 : 0.6,
                  }}
                >
                  <h3>{clinic.name}</h3>
                  <p>{isOpen ? "Open" : "Closed"}</p>
                  <p>{clinic.address}</p>
                  <p>
                    {renderStars(clinic.rating || 0)}{" "}
                    {clinic.rating?.toFixed(1) || "N/A"} (
                    {clinic.total_reviews || 0})
                  </p>
                  {clinic.distance_km && (
                    <p>Distance: {formatDistance(clinic.distance_km)}</p>
                  )}
                  <p>Doctors: {clinic.total_doctors || 0}</p>

                  {/* ✅ Show coordinate status */}
                  {!coords.isValid && (
                    <p style={{ color: "red", fontSize: "12px" }}>
                      Invalid coordinates: lat={clinic.latitude}, lng=
                      {clinic.longitude}
                    </p>
                  )}

                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        getDirections(clinic);
                      }}
                      disabled={!coords.isValid}
                    >
                      Directions
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClinicDetails(clinic.id);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showClinicModal && modalClinic && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2>{modalClinic.name}</h2>
              <button onClick={() => setShowClinicModal(false)}>✕</button>
            </div>

            <div>
              <p>Address: {modalClinic.address}</p>
              <p>Phone: {modalClinic.phone || "Contact via booking"}</p>
              <p>Status: {isClinicOpen(modalClinic) ? "Open Now" : "Closed"}</p>
              <p>Doctors: {modalClinic.total_doctors || 0} available</p>
              <p>
                Rating: {renderStars(modalClinic.rating || 0)}{" "}
                {modalClinic.rating?.toFixed(1) || "N/A"}
              </p>
            </div>

            {modalClinic.services_offered?.length > 0 && (
              <div>
                <h3>Services</h3>
                <div>
                  {modalClinic.services_offered.map((service, index) => (
                    <span
                      key={index}
                      style={{
                        padding: "4px 8px",
                        background: "#f0f0f0",
                        margin: "2px",
                      }}
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {modalClinic.badges?.length > 0 && (
              <div>
                <h3>Awards & Certifications</h3>
                {modalClinic.badges.map((badge, index) => (
                  <div key={index}>{badge.badge_name}</div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
              <button onClick={() => getDirections(modalClinic)}>
                Get Directions
              </button>
              <button onClick={() => bookAppointment(modalClinic)}>
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DEBUG: Show coordinate validation info */}
      <div
        style={{
          padding: "10px",
          background: "#f9f9f9",
          marginTop: "10px",
          fontSize: "12px",
        }}
      >
        <p>Total clinics: {discoveredClinics.length}</p>
        <p>Valid coordinates: {validClinics().length}</p>
        <p>
          Invalid coordinates:{" "}
          {discoveredClinics.length - validClinics().length}
        </p>
        {discoveredClinics.length > 0 && (
          <details>
            <summary>Sample clinic coordinates</summary>
            <pre>
              {JSON.stringify(
                {
                  name: discoveredClinics[0]?.name,
                  lat: discoveredClinics[0]?.latitude,
                  lng: discoveredClinics[0]?.longitude,
                  type: typeof discoveredClinics[0]?.latitude,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default MapView;
