import { Link } from "react-router-dom";
import styles from "./Logo.module.scss";
import { useSidebar } from "@/components/ui/sidebar";
export default function Logo({
  to = "/",
  text = "DentServe",
  imageSrc = "/assets/images/logo.png",
}) {
  const { open } = useSidebar();

  return (
    <div className={styles.logoContainer}>
      <div className={styles.logoImageWrapper}>
        <img
          src={imageSrc}
          alt={`${text} Logo`}
          className={styles.logoImage}
          loading="eager"
          width="28"
          height="28"
        />
      </div>
      {open ? (
        <span
          className="text-foreground text-2xl font-semibold tracking-tighter 
                  transition duration-300 ease-in-out
                  hover:text-sky-400 hover:scale-105 hover:drop-shadow-sm"
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}
