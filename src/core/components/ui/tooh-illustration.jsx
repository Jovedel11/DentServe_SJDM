export const ToothIllustration = () => (
  <div className="relative w-32 h-40 mx-auto">
    {/* Tooth Crown */}
    <div className="absolute w-full h-[70%] top-0 bg-white rounded-t-full border-2 border-cyan-500 shadow-inner">
      <div className="absolute bottom-[-1px] left-1/2 transform -translate-x-1/2 w-[90%] h-5 bg-white border-t-2 border-cyan-500 rounded-full"></div>
    </div>

    {/* Tooth Root */}
    <div className="absolute w-3/5 h-[45%] bottom-0 left-1/2 transform -translate-x-1/2 bg-white border-2 border-t-0 border-cyan-500 rounded-b-xl"></div>
  </div>
);
