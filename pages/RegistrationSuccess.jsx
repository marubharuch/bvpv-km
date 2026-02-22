import { useLocation, useNavigate } from "react-router-dom";

export default function RegistrationSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state) return <div className="p-4">No data found.</div>;

  const { familyId, familyPin } = state;

  const shareText = `Join our family group in Community App.\nFamily ID: ${familyId}\nPIN: ${familyPin}`;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 text-center">

      <h2 className="text-xl font-bold text-green-600">
        🎉 Registration Successful
      </h2>

      <div className="bg-white shadow p-3 rounded">
        <p className="text-sm text-gray-600">Family ID</p>
        <p className="font-bold text-lg break-all">{familyId}</p>
      </div>

      <div className="bg-white shadow p-3 rounded">
        <p className="text-sm text-gray-600">Family PIN</p>
        <p className="font-bold text-2xl text-blue-600">{familyPin}</p>
      </div>

      <button
        onClick={() =>
          window.open(
            `https://wa.me/?text=${encodeURIComponent(shareText)}`,
            "_blank"
          )
        }
        className="w-full bg-green-600 text-white p-2 rounded"
      >
        Share via WhatsApp
      </button>

      <button
        onClick={() => navigate("/dashboard")}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
