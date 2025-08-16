import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "../style/layout/PublicLayout.module.scss";
import "@/core/styles/global.scss";

const PublicLayout = () => {
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
