import { useEffect } from "react";

export default function PublicStyle({ children }) {
  useEffect(() => {
    // Add public-page class to body for global styles
    document.body.classList.add("public-page");

    return () => {
      document.body.classList.remove("public-page");
    };
  }, []);

  return <div className="public-content">{children}</div>;
}
