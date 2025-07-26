import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "../style/layout/PublicLayout.module.scss";

const PublicLayout = () => {
  const location = useLocation();
  return (
    <div>
      {location.pathname !== "/login" && location.pathname !== "/signup" && (
        <div className={styles.layoutContainer}>
          <Navbar />
          <main className={styles.mainContent}>
            <Outlet />
          </main>
          <Footer />
        </div>
      )}
    </div>
  );
};

export default PublicLayout;
