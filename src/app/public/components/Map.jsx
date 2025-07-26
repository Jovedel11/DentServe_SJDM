import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { map_Clinics } from "../../../data/clinicData";
import ClinicPanel from "../../../core/components/map/ClinicPanel";
import MapLegend from "../../../core/components/map/MapLegend";
import Skeleton from "../../../core/components/Skeleton";
import styles from "../style/components/Map.module.scss";

// Fix leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

const CENTER = [14.815710752120832, 121.07312517865853];
const ZOOM = 13;

// Zoom control buttons
const ZoomControls = () => {
  const map = useMap();

  return (
    <div className={styles.zoomControls}>
      <button
        className={styles.zoomBtn}
        onClick={() => map.zoomIn()}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        className={styles.zoomBtn}
        onClick={() => map.zoomOut()}
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  );
};

// Reset view button
const ResetButton = () => {
  const map = useMap();

  return (
    <button
      className={styles.resetBtn}
      onClick={() => map.setView(CENTER, ZOOM, { animate: true })}
      aria-label="Reset map view"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
};

const Map = () => {
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create custom marker icon
  const createMarkerIcon = useCallback((feedbackCount, isSelected = false) => {
    let color = "#ff8a65"; // low (red-orange)
    if (feedbackCount >= 8) color = "#64dd9c"; // high (green)
    else if (feedbackCount >= 4) color = "#ffb74d"; // medium (orange)

    return L.divIcon({
      className: `${styles.marker} ${isSelected ? styles.selected : ""}`,
      html: `
        <div class="${
          styles.pin
        }" style="background: ${color}; box-shadow: 0 0 15px ${color}">
          <span class="${styles.count}">${feedbackCount}</span>
        </div>
        ${
          isSelected
            ? `<div class="${styles.pulse}" style="background: ${color}"></div>`
            : ""
        }
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, []);

  // Fetch clinics data
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoading(true);
        const processedClinics = map_Clinics.map((clinic) => ({
          ...clinic,
          latitude: parseFloat(clinic.latitude),
          longitude: parseFloat(clinic.longitude),
          feedbackCount: Math.floor(Math.random() * 11),
        }));

        setClinics(processedClinics);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  // Handle marker click
  const handleMarkerClick = (clinic) => {
    setSelectedClinic(selectedClinic?.id === clinic.id ? null : clinic);
  };

  // Close panel on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedClinic(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  if (loading) {
    return (
      <section className={styles.mapSection}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2>Find Your Nearest Clinic</h2>
            <p>Discovering nearby dental clinics...</p>
          </div>
          <div className={styles.loadingMap}>
            <div className={styles.spinner}></div>
            <p>Loading map...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.mapSection}>
        <div className={styles.container}>
          <div className={styles.error}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Unable to load clinic data</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Try Again</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.mapSection}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2>Find Your Nearest Clinic</h2>
          <p>Discover nearby dental clinics with real-time patient feedback</p>
        </motion.div>

        <div className={styles.mapWrapper}>
          <MapContainer
            center={CENTER}
            zoom={ZOOM}
            className={styles.map}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />

            {clinics.map((clinic) => (
              <Marker
                key={clinic.id}
                position={[clinic.latitude, clinic.longitude]}
                icon={createMarkerIcon(
                  clinic.feedbackCount,
                  selectedClinic?.id === clinic.id
                )}
                eventHandlers={{
                  click: () => handleMarkerClick(clinic),
                }}
              />
            ))}

            <ZoomControls />
            <ResetButton />
          </MapContainer>

          <MapLegend />

          <AnimatePresence>
            {selectedClinic && (
              <ClinicPanel
                clinic={selectedClinic}
                onClose={() => setSelectedClinic(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Map;
