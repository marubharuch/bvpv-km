import { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    if (!email) return alert("Enter your registered email");

    try {
      await sendPasswordResetEmail(getAuth(), email);
      setSent(true);
    } catch (err) {
      alert("Unable to send reset link. Check email.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-lg font-bold text-center">Reset Password</h2>

      {!sent ? (
        <>
          <p className="text-sm text-gray-600 text-center">
            Enter your registered email to receive a password reset link.
          </p>

          <input
            type="email"
            placeholder="Registered Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="border w-full p-2 rounded"
          />

          <button
            onClick={handleReset}
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            Send Reset Link
          </button>
        </>
      ) : (
        <p className="text-green-600 text-center">
          Reset link sent! Check your email (Spam folder also).
        </p>
      )}

      <button
        onClick={() => navigate("/login")}
        className="w-full text-sm text-gray-500"
      >
        Back to Login
      </button>
    </div>
  );
}
