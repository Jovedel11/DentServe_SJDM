const SvgDental = ({ className }) => {
  return (
    <svg
      className={`
        w-full h-full 
        max-w-[400px] max-h-[300px] 
        object-contain 
        transition-transform duration-300 ease-in-out 
        hover:scale-[1.02]
        md:max-w-[300px] md:max-h-[225px] 
        sm:max-w-[250px] sm:max-h-[187px]
        ${className || ""}
      `}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dental care illustration"
    >
      {/* tooth Icon */}
      <path
        d="M200 50C180 50 165 65 165 85C165 95 170 105 175 115C180 130 185 145 190 160C195 175 200 190 200 200C200 190 205 175 210 160C215 145 220 130 225 115C230 105 235 95 235 85C235 65 220 50 200 50Z"
        fill="#4A90E2"
        opacity="0.8"
      />
      <path
        d="M200 60C188 60 178 70 178 82C178 88 181 94 184 100C187 108 190 116 193 124C196 132 199 140 200 145C201 140 204 132 207 124C210 116 213 108 216 100C219 94 222 88 222 82C222 70 212 60 200 60Z"
        fill="#FFFFFF"
      />

      {/* stethoscope */}
      <circle cx="320" cy="80" r="15" fill="#E74C3C" opacity="0.7" />
      <path
        d="M320 95C320 95 315 100 310 110C305 120 300 135 295 150C290 165 285 180 285 190"
        stroke="#E74C3C"
        strokeWidth="4"
        fill="none"
        opacity="0.7"
      />
      <circle cx="285" cy="195" r="8" fill="#E74C3C" opacity="0.7" />

      {/* medical cross */}
      <rect x="90" y="120" width="30" height="8" fill="#2ECC71" opacity="0.6" />
      <rect
        x="101"
        y="109"
        width="8"
        height="30"
        fill="#2ECC71"
        opacity="0.6"
      />

      {/* calendar icon */}
      <rect
        x="320"
        y="180"
        width="60"
        height="50"
        rx="5"
        fill="#9B59B6"
        opacity="0.5"
      />
      <rect x="325" y="190" width="50" height="35" fill="#FFFFFF" />
      <line
        x1="330"
        y1="200"
        x2="370"
        y2="200"
        stroke="#9B59B6"
        strokeWidth="2"
      />
      <line
        x1="330"
        y1="210"
        x2="350"
        y2="210"
        stroke="#9B59B6"
        strokeWidth="2"
      />
      <line
        x1="330"
        y1="220"
        x2="365"
        y2="220"
        stroke="#9B59B6"
        strokeWidth="2"
      />

      {/* location pin */}
      <path
        d="M80 200C80 185 92 173 107 173C122 173 134 185 134 200C134 215 107 240 107 240S80 215 80 200Z"
        fill="#F39C12"
        opacity="0.6"
      />
      <circle cx="107" cy="200" r="8" fill="#FFFFFF" />
    </svg>
  );
};

export default SvgDental;
