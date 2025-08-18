import { Link } from "react-router-dom";
import { useSidebar } from "@/core/components/ui/sidebar";

export default function Logo({
  to = "/",
  text = "DentServe",
  imageSrc = "/assets/images/logo.png",
}) {
  const { open } = useSidebar();

  return (
    <Link
      to={to}
      className="flex items-center gap-3 no-underline z-[1001] cursor-pointer 
                flex-shrink-0 transition-transform duration-200 
                hover:scale-[1.02] active:scale-[0.98] 
                focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded-lg"
    >
      {/* Image wrapper */}
      <div
        className="w-[45px] h-[45px] rounded-xl 
                bg-gradient-to-br from-sky-50 to-sky-100 
                flex items-center justify-center 
                shadow-[0_4px_12px_rgba(56,189,248,0.15)] 
                transition-all duration-300 
                hover:shadow-[0_6px_20px_rgba(56,189,248,0.25)] 
                hover:-translate-y-[1px]"
      >
        <img
          src={imageSrc}
          alt={`${text} Logo`}
          loading="eager"
          width="28"
          height="28"
          className="w-7 h-7 object-contain 
                    drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] 
                    transition duration-200 
                    hover:drop-shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
        />
      </div>

      {/* Text (only when sidebar is open) */}
      {open && (
        <span
          className="text-foreground text-2xl font-bold tracking-tight
                    transition duration-300 ease-in-out
                    hover:text-sky-500 hover:scale-105 hover:drop-shadow-sm
                    max-sm:text-lg"
        >
          {text}
        </span>
      )}
    </Link>
  );
}
