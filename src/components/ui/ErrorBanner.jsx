export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mx-4 mt-2 px-4 py-3 rounded-xl text-sm font-semibold"
      style={{ background: "#FDE8EC", color: "#7B1C2E", border: "1px solid #f0c0c0" }}>
      ⚠️ {message}
    </div>
  );
}
