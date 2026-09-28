export default function SectionTitle({ children, className = "" }) {
  return (
    <h3 className={`mb-4 border-b-2 border-red-600 ${className}`}>
      <span className="inline-block bg-red-600 px-4 py-2 text-sm font-bold uppercase text-white">
        {children}
      </span>
    </h3>
  );
}