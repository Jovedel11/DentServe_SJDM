import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "../style/layout/PublicLayout.module.scss";

const PublicLayout = () => {
  const location = useLocation();

  // Define routes that shouldn't show navbar and footer
  const noLayoutRoutes = ["/login", "/signup"];
  const shouldShowLayout = !noLayoutRoutes.includes(location.pathname);

  // If no layout needed, render outlet directly
  if (!shouldShowLayout) {
    return <Outlet />;
  }

  return (
    <div className={styles.layoutContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
