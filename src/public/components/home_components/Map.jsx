import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Loader from "@/core/components/Loader";
import Error from "@/core/components/ui/Error";
import ClinicPanel from "@/public/components/map/ClinicPanel";
import MapLegend from "@/public/components/map/MapLegend";
import { map_Clinics } from "@/data/home_data/clinicData";
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

// Map view adjuster
const MapViewAdjuster = React.memo(({ clinics }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !clinics.length) return;

    const bounds = L.latLngBounds(
      clinics.map((clinic) => [clinic.latitude, clinic.longitude])
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

    if (feedbackCount >= 8) className += ` ${styles.high}`;
    else if (feedbackCount >= 4) className += ` ${styles.medium}`;
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
    />
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

  // get clinic data
  useEffect(() => {
    const fetchClinics = async () => {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);
        setError(null);

        const validatedClinics = map_Clinics.map((clinic) => ({
          id: clinic.id,
          name: clinic.name,
          address: clinic.address,
          latitude: parseFloat(clinic.latitude),
          longitude: parseFloat(clinic.longitude),
          operating_hours: clinic.operating_hours,
          feedbackCount: Math.floor(Math.random() * 11),
          rating: (Math.random() * 0.5 + 4.5).toFixed(1),
          availability: Math.floor(Math.random() * 101),
        }));

        setClinics(validatedClinics);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching clinics:", err);
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
            Locate nearby dental clinics with real-time patient feedback
          </p>
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

            {!isLoading && <MapLegend />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(Map);
