import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { MapContainer, TileLayer, Marker, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Loader from "@/core/components/Loader";
import Error from "@/core/components/ErrorFolder/Error";
import ClinicPanel from "@/public/components/map/ClinicPanel";
import MapLegend from "@/public/components/map/MapLegend";
import { supabase } from "@/lib/supabaseClient";
import styles from "../../style/components/home_styles/Map.module.scss";

// leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

const CSJDM_CENTER = [14.815710752120832, 121.07312517865853];
const CITY_ZOOM = 13;
const MAP_MIN_ZOOM = 11;
const MAP_MAX_ZOOM = 18;
const MAX_PUBLIC_CLINICS = 8; // ✅ Limit for non-authenticated users

// ✅ HELPER: Parse operating hours from JSON string
const parseOperatingHours = (hoursData) => {
  if (!hoursData) return null;

  // If it's already an object, return it
  if (typeof hoursData === "object" && hoursData !== null) {
    return hoursData;
  }

  // If it's a string, try to parse it
  if (typeof hoursData === "string") {
    try {
      return JSON.parse(hoursData);
    } catch (error) {
      console.warn("Failed to parse operating_hours:", error);
      return null;
    }
  }

  return null;
};

// ✅ HELPER: Format operating hours for display (detailed version for panel)
const formatOperatingHoursDetailed = (hoursData) => {
  const parsed = parseOperatingHours(hoursData);
  if (!parsed) return "Hours not available";

  const { weekdays, weekends } = parsed;

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get representative schedules
  const weekdaySchedule =
    weekdays?.monday ||
    weekdays?.tuesday ||
    weekdays?.wednesday ||
    weekdays?.thursday ||
    weekdays?.friday ||
    null;

  const weekendSchedule = weekends?.saturday || weekends?.sunday || null;

  if (!weekdaySchedule && !weekendSchedule) return "Hours not available";

  let result = "";

  if (weekdaySchedule && weekdaySchedule.start && weekdaySchedule.end) {
    result += `Mon-Fri: ${formatTime(weekdaySchedule.start)} - ${formatTime(
      weekdaySchedule.end
    )}`;
  }

  if (weekendSchedule && weekendSchedule.start && weekendSchedule.end) {
    if (result) result += " | ";
    result += `Sat-Sun: ${formatTime(weekendSchedule.start)} - ${formatTime(
      weekendSchedule.end
    )}`;
  }

  return result || "Hours not available";
};

// ✅ HELPER: Format operating hours for "today" (simple version for popup)
const formatOperatingHours = (hoursData) => {
  const parsed = parseOperatingHours(hoursData);
  if (!parsed) return "Hours not available";

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
    const isWeekend = currentDay === "saturday" || currentDay === "sunday";

    // Get hours for today
    const hoursGroup = isWeekend ? parsed.weekends : parsed.weekdays;
    const todayHours = hoursGroup?.[currentDay];

    if (
      !todayHours ||
      todayHours.closed === true ||
      todayHours.is_closed === true
    ) {
      return "Closed today";
    }

    const openTime = todayHours.start || todayHours.open;
    const closeTime = todayHours.end || todayHours.close;

    if (openTime && closeTime) {
      return `${openTime} - ${closeTime}`;
    }

    return "Hours not available";
  } catch (error) {
    console.warn("Error formatting operating hours:", error);
    return "Hours not available";
  }
};

// ✅ HELPER: Extract coordinates from PostGIS geography
const extractCoordinates = (location) => {
  if (!location) return null;

  try {
    // Handle different PostGIS formats
    if (typeof location === "string") {
      // WKT format: "POINT(longitude latitude)"
      const match = location.match(
        /POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i
      );
      if (match) {
        return {
          latitude: parseFloat(match[2]),
          longitude: parseFloat(match[1]),
        };
      }
    } else if (location && typeof location === "object") {
      // GeoJSON format
      if (location.coordinates && Array.isArray(location.coordinates)) {
        return {
          latitude: location.coordinates[1],
          longitude: location.coordinates[0],
        };
      }
      // PostGIS object format
      if (location.x !== undefined && location.y !== undefined) {
        return {
          latitude: location.y,
          longitude: location.x,
        };
      }
    }
    return null;
  } catch (error) {
    console.warn("Error extracting coordinates:", error);
    return null;
  }
};

// Map view adjuster
const MapViewAdjuster = React.memo(({ clinics }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !clinics.length) return;

    const validClinics = clinics.filter((c) => c.latitude && c.longitude);
    if (validClinics.length === 0) return;

    const bounds = L.latLngBounds(
      validClinics.map((clinic) => [clinic.latitude, clinic.longitude])
    );
    map.fitBounds(bounds, { padding: [50, 50], animate: true });
  }, [clinics, map]);

  return null;
});

// reset view button
const ResetViewButton = React.memo(() => {
  const map = useMap();

  const resetView = useCallback(() => {
    map.setView(CSJDM_CENTER, CITY_ZOOM, { animate: true });
  }, [map]);

  return (
    <button
      className={styles.resetButton}
      onClick={resetView}
      aria-label="Reset map view"
    >
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
});

// clinic marker
const ClinicMarker = React.memo(({ clinic, isSelected, onClick }) => {
  const createCustomIcon = useCallback((feedbackCount, selected) => {
    let className = styles.clinicMarker;

    // ✅ Real feedback-based classification
    if (feedbackCount >= 15) className += ` ${styles.high}`;
    else if (feedbackCount >= 5) className += ` ${styles.medium}`;
    else className += ` ${styles.low}`;

    if (selected) className += ` ${styles.selected}`;

    return L.divIcon({
      className,
      html: `
        <div class="${styles.markerPin}"></div>
        <div class="${styles.markerLabel}">${feedbackCount}</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, []);

  return (
    <Marker
      position={[clinic.latitude, clinic.longitude]}
      icon={createCustomIcon(clinic.feedbackCount, isSelected)}
      eventHandlers={{ click: () => onClick(clinic) }}
      zIndexOffset={isSelected ? 1000 : clinic.feedbackCount}
    >
      <Popup>
        <div className={styles.popupContent}>
          <h3 className={styles.popupTitle}>{clinic.name}</h3>
          <p className={styles.popupAddress}>{clinic.address}</p>
          <div className={styles.popupInfo}>
            <span
              className={`${styles.popupStatus} ${
                clinic.is_open ? styles.open : styles.closed
              }`}
            >
              {clinic.is_open ? "🟢 Open" : "🔴 Closed"}
            </span>
            <span className={styles.popupRating}>
              ⭐ {clinic.rating} ({clinic.total_reviews})
            </span>
          </div>
          <p className={styles.popupHours}>
            <strong>Today:</strong> {clinic.operating_hours_today}
          </p>
        </div>
      </Popup>
    </Marker>
  );
});

const Map = () => {
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clinics, setClinics] = useState([]);
  const [error, setError] = useState(null);
  const [isMapFocused, setIsMapFocused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mapRef = useRef(null);
  const abortControllerRef = useRef(new AbortController());

  // ✅ FETCH REAL CLINIC DATA WITH FEEDBACK COUNTS
  useEffect(() => {
    const fetchClinics = async () => {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);
        setError(null);

        // ✅ Step 1: Get all active clinics using RPC function
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "find_nearest_clinics",
          {
            p_latitude: CSJDM_CENTER[0],
            p_longitude: CSJDM_CENTER[1],
            max_distance_km: 100,
            limit_count: 100,
            services_filter: null,
            min_rating: null,
          }
        );

        if (rpcError) throw rpcError;

        if (!rpcData?.success) {
          throw new Error(rpcData?.error || "Failed to fetch clinics");
        }

        const clinicsFromRPC = rpcData.data?.clinics || [];
        console.log("📍 Fetched clinics from RPC:", clinicsFromRPC.length);

        // ✅ Step 2: Get feedback counts for each clinic
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("feedback")
          .select("clinic_id, clinic_rating, is_public")
          .eq("is_public", true)
          .not("clinic_rating", "is", null);

        if (feedbackError) {
          console.warn("⚠️ Feedback fetch error:", feedbackError);
        }

        // ✅ Step 3: Count feedback per clinic
        const feedbackCounts = {};
        if (feedbackData) {
          feedbackData.forEach((feedback) => {
            const clinicId = feedback.clinic_id;
            if (!feedbackCounts[clinicId]) {
              feedbackCounts[clinicId] = 0;
            }
            feedbackCounts[clinicId]++;
          });
        }

        // ✅ Step 4: Transform and enrich clinic data
        const enrichedClinics = clinicsFromRPC
          .map((clinic) => {
            // Extract position from RPC response
            let coordinates = null;
            if (clinic.position) {
              const lat = parseFloat(clinic.position.lat);
              const lng = parseFloat(clinic.position.lng);
              if (!isNaN(lat) && !isNaN(lng)) {
                coordinates = { latitude: lat, longitude: lng };
              }
            }

            // Fallback: try extracting from location field
            if (!coordinates && clinic.location) {
              coordinates = extractCoordinates(clinic.location);
            }

            // Skip clinics without valid coordinates
            if (!coordinates) {
              console.warn(
                `⚠️ Skipping clinic ${clinic.name} - no valid coordinates`
              );
              return null;
            }

            return {
              id: clinic.id,
              name: clinic.name,
              address: clinic.address,
              city: clinic.city,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              phone: clinic.phone,
              email: clinic.email,
              website_url: clinic.website_url,
              image_url: clinic.image_url,
              operating_hours: clinic.operating_hours, // ✅ Keep original for parsing
              operating_hours_today: formatOperatingHours(
                clinic.operating_hours
              ), // ✅ For popup
              operating_hours_formatted: formatOperatingHoursDetailed(
                clinic.operating_hours
              ), // ✅ For panel
              feedbackCount: feedbackCounts[clinic.id] || 0,
              rating: parseFloat(clinic.rating || 0).toFixed(1),
              total_reviews: clinic.total_reviews || 0,
              distance_km: clinic.distance_km || 0,
              is_open: clinic.is_open || false,
              services_offered: clinic.services_offered || [],
              doctors: clinic.doctors || [],
            };
          })
          .filter(Boolean); // Remove null entries

        // ✅ Step 5: Sort by feedback count (most popular first) and limit to MAX_PUBLIC_CLINICS
        const sortedClinics = enrichedClinics
          .sort((a, b) => b.feedbackCount - a.feedbackCount)
          .slice(0, MAX_PUBLIC_CLINICS);

        console.log(
          `✅ Showing ${sortedClinics.length} clinics (limited to ${MAX_PUBLIC_CLINICS})`
        );

        setClinics(sortedClinics);
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("❌ Error fetching clinics:", err);
        setError(
          err.message ||
            "Unable to load clinic data. Please check your connection and try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinics();

    return () => {
      abortControllerRef.current.abort();
    };
  }, [retryCount]);

  // event handlers
  const handleMarkerClick = useCallback((clinic) => {
    setSelectedClinic((prev) => (prev?.id === clinic.id ? null : clinic));
  }, []);

  const handleMapFocus = useCallback(() => setIsMapFocused(true), []);
  const handleMapBlur = useCallback(() => setIsMapFocused(false), []);
  const handleClosePanel = useCallback(() => setSelectedClinic(null), []);
  const handleRetry = useCallback(() => setRetryCount((prev) => prev + 1), []);

  // handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedClinic) {
        setSelectedClinic(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClinic]);

  // memoized markers
  const markers = useMemo(() => {
    return clinics.map((clinic) => (
      <ClinicMarker
        key={clinic.id}
        clinic={clinic}
        isSelected={selectedClinic?.id === clinic.id}
        onClick={handleMarkerClick}
      />
    ));
  }, [clinics, selectedClinic, handleMarkerClick]);

  if (error) {
    return (
      <Error
        type="network"
        title="Failed to Load Clinic Data"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <section className={styles.mapSection} aria-label="Dental clinic map">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Find Dental Clinics</h1>
          <p className={styles.subtitle}>
            Locate nearby dental clinics in San Jose Del Monte with real-time
            patient feedback
          </p>
          {!isLoading && clinics.length > 0 && (
            <>
              <p className={styles.clinicCount}>
                📍 Showing <strong>{clinics.length}</strong> top-rated dental
                clinic{clinics.length !== 1 ? "s" : ""} in your area
              </p>
              {/* ✅ Sign up / Login Encouragement */}
              <div className={styles.signupPrompt}>
                <div className={styles.signupPromptIcon}>🔒</div>
                <div className={styles.signupPromptContent}>
                  <p className={styles.signupPromptTitle}>
                    <strong>Unlock Full Access!</strong>
                  </p>
                  <p className={styles.signupPromptText}>
                    Viewing {MAX_PUBLIC_CLINICS} clinics only.
                    <a href="/signup" className={styles.signupLink}>
                      {" "}
                      Sign up
                    </a>{" "}
                    or
                    <a href="/login" className={styles.loginLink}>
                      {" "}
                      log in
                    </a>{" "}
                    to see all clinics, book appointments, and access exclusive
                    features!
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.mapWrapper}>
          <div
            className={styles.mapContainer}
            onMouseEnter={handleMapFocus}
            onMouseLeave={handleMapBlur}
            onTouchStart={handleMapFocus}
            onTouchEnd={handleMapBlur}
          >
            {isLoading ? (
              <Loader message="Loading clinic locations..." />
            ) : clinics.length === 0 ? (
              <div className={styles.noData}>
                <p>No clinics found in this area.</p>
                <button onClick={handleRetry} className={styles.retryButton}>
                  Try Again
                </button>
              </div>
            ) : (
              <MapContainer
                center={CSJDM_CENTER}
                zoom={CITY_ZOOM}
                minZoom={MAP_MIN_ZOOM}
                maxZoom={MAP_MAX_ZOOM}
                className={styles.mapCanvas}
                scrollWheelZoom={isMapFocused}
                whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
                zoomControl={false}
                tap={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapViewAdjuster clinics={clinics} />
                {markers}
                <ResetViewButton />
              </MapContainer>
            )}

            {selectedClinic && (
              <ClinicPanel clinic={selectedClinic} onClose={handleClosePanel} />
            )}

            {!isLoading && clinics.length > 0 && <MapLegend />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(Map);
