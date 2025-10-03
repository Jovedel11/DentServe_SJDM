export const FileSizeWarning = ({ maxSize = "5MB", type = "image" }) => {
  return (
    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
      <span>⚠️</span>
      <span>
        Maximum {type} size: <strong>{maxSize}</strong>
      </span>
    </div>
  );
};
