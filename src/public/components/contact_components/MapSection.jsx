import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin } from "lucide-react";
import styles from "../../style/components/contact_styles/MapSection.module.scss";

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const MapSection = () => {
  const mapCenter = useMemo(() => [15.7908, 121.0008], []);

  return (
    <section className={styles.mapSection}>
      <div className={styles.mapContainer}>
        <h3>Find Our Office</h3>
        <div className={styles.mapWrapper}>
          <MapContainer
            center={mapCenter}
            zoom={15}
            className={styles.leafletMap}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={mapCenter}>
              <Popup>
                <strong>San Jose Dental Headquarters</strong>
                <br />
                123 Dental Ave, San Jose City
                <br />
                San Jose Del Monte, Bulacan, Philippines
              </Popup>
            </Marker>
          </MapContainer>

          <div className={styles.mapInfoCard}>
            <div className={styles.mapMarker}>
              <MapPin size={24} />
            </div>
            <div>
              <h4>San Jose Dental Headquarters</h4>
              <p>123 Dental Ave, San Jose City</p>
              <p>San Jose Del Monte, Bulacan, Philippines</p>
              <p className={styles.hours}>Open: Mon-Fri, 8:00 AM - 5:00 PM</p>
              <a
                href="https://maps.google.com/?q=123 Dental Ave, San Jose City, Nueva Ecija"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.directionsBtn}
              >
                Get Directions
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
