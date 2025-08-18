import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "../style/layout/PublicLayout.module.scss";
import PublicStyle from "@/core/layout/PublicStyle";
import ScrollTop from "@/core/layout/scroll-top";

const PublicLayout = () => {
  return (
    <>
      <ScrollTop />
      <PublicStyle>
        <div className={styles.layoutContainer}>
          <Navbar />
          <main className={styles.mainContent}>
            <Outlet />
          </main>
          <Footer />
        </div>
      </PublicStyle>
    </>
  );
};

export default PublicLayout;
