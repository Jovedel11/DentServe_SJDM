export const LockIllustration = () => (
  <div className="relative w-32 h-40 mx-auto">
    {/* Lock Body */}
    <div className="absolute w-24 h-24 bottom-0 left-1/2 transform -translate-x-1/2 bg-amber-500 rounded-xl border-4 border-amber-600"></div>

    {/* Lock Shackle */}
    <div className="absolute w-8 h-16 top-0 left-1/2 transform -translate-x-1/2 bg-amber-600 rounded-t-full"></div>

    {/* Lock Keyhole */}
    <div className="absolute w-4 h-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-700 rounded-full"></div>
  </div>
);
