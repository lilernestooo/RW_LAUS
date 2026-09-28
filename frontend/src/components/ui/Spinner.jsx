// Full-screen black loader with a concentric double spinning arc matching the image
export default function Spinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
    >
      {/* Outer Circle (with Red Progress Arc) */}
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-neutral-700 border-t-red-600 animate-spin">
        
        {/* Inner Circle (Slightly smaller, concentric ring) */}
        <div className="h-9 w-9 rounded-full border border-neutral-700" />
        
      </div>
    </div>
  );
}
