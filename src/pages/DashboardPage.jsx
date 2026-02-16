import { useContext, useEffect, useState, useCallback } from "react";
import { signOut } from "firebase/auth";
import { ref, get, push, set, update } from "firebase/database";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { loadCache, saveCache, clearCache } from "../utils/cache";
import { AuthContext } from "../context/AuthContext";
import { restoreFromFirebase } from "../services/studentSubmitService";
import OswalConnectorsPopup from "./ConnectorsPage";

/**
 * Family Dashboard Page - Main dashboard for family management
 * 
 * Features:
 * - View family profile and PIN
 * - Manage students (view, add, edit)
 * - Manage family contacts
 * - Invite members via WhatsApp
 * 
 * @component
 */
export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // State management
  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Popup state
  const [showPopup, setShowPopup] = useState(true);
  
  // Add member form state
  const [showAddMember, setShowAddMember] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    relation: "parent",
    countryCode: "+91",
    mobile: "",
    email: ""
  });
  const [memberErrors, setMemberErrors] = useState({});

  // Get app URL from environment or use default
  const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

  // ⭐ Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ⭐ Show connectors popup only once
  useEffect(() => {
    const shown = localStorage.getItem("connectorsPopupShown");
    if (shown) setShowPopup(false);
  }, []);

  /**
   * Load family data from Firebase with caching
   * Optimized to use cache first, then fetch fresh data
   */
  const loadFamilyData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get user's familyId
      const userSnap = await get(ref(db, `users/${user.uid}`));
      const userData = userSnap.val();

      if (!userData?.familyId) {
        setLoading(false);
        setError("No family found. Please register to create a family.");
        return;
      }

      const foundId = userData.familyId;
      setFamilyId(foundId);

      // Step 2: Try to load from cache first for instant display
      const cached = await loadCache(`family_${foundId}`);
      if (cached) {
        setFamily(cached);
        setLoading(false); // Show cached data immediately
        
        // Then fetch fresh data in background
        const famSnap = await get(ref(db, `families/${foundId}`));
        const freshData = famSnap.val();
        
        if (freshData) {
          // Restore arrays from Firebase numeric-key objects
          const restoredData = restoreFromFirebase(freshData);
          setFamily(restoredData);
          await saveCache(`family_${foundId}`, restoredData);
        }
      } else {
        // No cache, fetch fresh data
        const famSnap = await get(ref(db, `families/${foundId}`));
        const famData = famSnap.val();
        
        if (!famData) {
          throw new Error("Family data not found. It may have been deleted.");
        }

        // Restore arrays from Firebase numeric-key objects
        const restoredData = restoreFromFirebase(famData);
        setFamily(restoredData);
        await saveCache(`family_${foundId}`, restoredData);
        setLoading(false);
      }

    } catch (err) {
      console.error("Error loading family data:", err);
      setError(
        err.message || 
        "Failed to load family data. Please check your connection and try again."
      );
      setLoading(false);
    }
  }, [user]);

  // 🔹 Load family data on mount
  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  /**
   * Refresh family data from Firebase
   * Shows loading indicator during refresh
   */
  const refreshFromFirebase = async () => {
    if (!familyId || !isOnline) {
      if (!isOnline) {
        setError("You are offline. Please check your internet connection.");
      }
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const snap = await get(ref(db, `families/${familyId}`));
      const data = snap.val();

      if (!data) {
        throw new Error("Family data not found.");
      }

      // Restore arrays from Firebase numeric-key objects
      const restoredData = restoreFromFirebase(data);
      
      setFamily(restoredData);
      await saveCache(`family_${familyId}`, restoredData);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Logout user and clear cache
   */
  const logout = async () => {
    try {
      // Clear cached family data
      if (familyId) {
        await clearCache(`family_${familyId}`);
      }
      
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout. Please try again.");
    }
  };

  /**
   * Sanitize user input to prevent XSS
   */
  const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  };

  /**
   * Validate new member form
   */
  const validateMemberForm = () => {
    const errors = {};

    // Name validation
    if (!newMember.name.trim()) {
      errors.name = "Name is required";
    } else if (newMember.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (newMember.name.trim().length > 50) {
      errors.name = "Name must be less than 50 characters";
    }

    // Mobile validation (if provided)
    if (newMember.mobile) {
      const digits = newMember.mobile.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10) {
        errors.mobile = "Mobile number must be 10 digits";
      } else if (digits.length === 10 && !/^[6-9]/.test(digits)) {
        errors.mobile = "Mobile number must start with 6, 7, 8, or 9";
      }
    }

    // Email validation (if provided)
    if (newMember.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newMember.email)) {
        errors.email = "Please provide a valid email address";
      }
    }

    // Relation validation
    if (!newMember.relation) {
      errors.relation = "Relationship is required";
    }

    setMemberErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Save new family member with validation and error handling
   */
  const saveNewMember = async () => {
    // Validate form
    if (!validateMemberForm()) {
      return;
    }

    if (!isOnline) {
      setError("You are offline. Please check your internet connection.");
      return;
    }

    setSavingMember(true);
    setError(null);

    try {
      // Sanitize inputs
      const sanitizedName = sanitizeInput(newMember.name.trim());
      const sanitizedRelation = sanitizeInput(newMember.relation);
      
      // Format mobile number
      const cleanMobile = newMember.mobile.replace(/\D/g, '');
      const fullMobile = cleanMobile
        ? `${newMember.countryCode}${cleanMobile}`
        : "";

      // Create new contact reference
      const newRef = push(ref(db, `families/${familyId}/familyContacts`));

      await set(newRef, {
        name: sanitizedName,
        relation: sanitizedRelation,
        mobile: fullMobile,
        email: newMember.email.trim(),
        addedAt: Date.now(),
        addedBy: user.uid
      });

      // Update family's lastUpdated timestamp
      await update(ref(db, `families/${familyId}`), {
        updatedAt: Date.now()
      });

      // Refresh data to show new member
      await refreshFromFirebase();

      // Reset form
      setNewMember({
        name: "",
        relation: "parent",
        countryCode: "+91",
        mobile: "",
        email: ""
      });
      setMemberErrors({});
      setShowAddMember(false);

    } catch (err) {
      console.error("Error saving member:", err);
      setError("Failed to add family member. Please try again.");
    } finally {
      setSavingMember(false);
    }
  };

  /**
   * Invite family member via WhatsApp
   */
  const inviteMember = (contact) => {
    const mobile = contact.mobile || contact.phone;
    if (!mobile) {
      setError("This contact doesn't have a mobile number.");
      return;
    }

    try {
      // Extract digits only
      const clean = mobile.replace(/\D/g, "");

      if (clean.length < 10) {
        setError("Invalid mobile number format.");
        return;
      }

      // Create invite message
      const message =
        `🎓 You're invited to join our family directory!\n\n` +
        `Family Name: ${family.familyName || 'Our Family'}\n` +
        `Family PIN: ${family.familyPin}\n\n` +
        `Register here: ${APP_URL}/register\n\n` +
        `Use the Family PIN to join our family group.`;

      // Open WhatsApp
      const whatsappUrl = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

    } catch (err) {
      console.error("Error opening WhatsApp:", err);
      setError("Failed to open WhatsApp. Please try again.");
    }
  };

  /**
   * Navigate to student edit page
   */
  const editStudent = (studentId) => {
    try {
      navigate(`/registration?edit=${studentId}`);
    } catch (err) {
      console.error("Navigation error:", err);
      setError("Failed to navigate. Please try again.");
    }
  };

  /**
   * Navigate to add student page
   */
  const addStudent = () => {
    try {
      navigate("/registration");
    } catch (err) {
      console.error("Navigation error:", err);
      setError("Failed to navigate. Please try again.");
    }
  };

  // 🔢 Compute derived data
  const contacts = family?.familyContacts
    ? (Array.isArray(family.familyContacts) 
        ? family.familyContacts 
        : Object.values(family.familyContacts))
    : [];

  const students = family?.students
    ? (Array.isArray(family.students)
        ? family.students.map((data, index) => ({ id: `STU_${index}`, ...data }))
        : Object.entries(family.students).map(([id, data]) => ({ id, ...data })))
    : [];

  // 🔹 Loading state
  if (!user) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-yellow-800">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded shadow p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading family data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !family) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={loadFamilyData}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/")}
              className="border border-red-600 text-red-600 px-4 py-2 rounded hover:bg-red-50"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
          <p className="text-gray-600 mb-4">No family data found.</p>
          <button
            onClick={() => navigate("/registration")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Register Your Family
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* OFFLINE INDICATOR */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
          <p className="text-yellow-800 text-sm">
            ⚠️ You are offline. Changes may not be saved.
          </p>
        </div>
      )}

      {/* ERROR ALERT */}
      {error && family && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex justify-between items-start">
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <button
          onClick={refreshFromFirebase}
          disabled={refreshing || !isOnline}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            refreshing || !isOnline
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {refreshing ? (
            <>
              <span className="inline-block animate-spin mr-1">🔄</span>
              Refreshing...
            </>
          ) : (
            <>🔄 Refresh</>
          )}
        </button>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* CONNECTORS POPUP - Commented out as in original */}
      {/* {showPopup && <OswalConnectorsPopup onClose={() => setShowPopup(false)} />} */}

      {/* FAMILY PROFILE */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-bold text-lg mb-3 text-gray-800">Family Profile</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Family Name:</span>
            <span className="font-medium">{family.familyName || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Family PIN:</span>
            <span className="font-mono font-bold text-blue-600">{family.familyPin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Family ID:</span>
            <span className="font-mono text-xs text-gray-500">{familyId}</span>
          </div>
        </div>
      </div>

      {/* STUDENTS SECTION */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-3 text-gray-800">
          Students ({students.length})
        </h3>

        {students.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No students added yet.</p>
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex justify-between items-center border-b border-gray-200 py-3 last:border-b-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{student.name}</p>
                  {student.education && (
                    <p className="text-sm text-gray-500">{student.education}</p>
                  )}
                </div>
                <button
                  onClick={() => editStudent(student.id)}
                  className="text-blue-600 text-sm border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addStudent}
          className="w-full bg-blue-600 text-white p-2 rounded mt-3 hover:bg-blue-700 transition-colors font-medium"
        >
          + Add Student
        </button>
      </div>

      {/* FAMILY CONTACTS SECTION */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-3 text-gray-800">
          Family Contacts ({contacts.length})
        </h3>

        {contacts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No contacts added yet.</p>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b border-gray-200 py-3 last:border-b-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{contact.name}</p>
                  {contact.relation && (
                    <p className="text-sm text-gray-500 capitalize">{contact.relation}</p>
                  )}
                  {contact.mobile && (
                    <p className="text-sm text-gray-600">📱 {contact.mobile}</p>
                  )}
                  {contact.email && (
                    <p className="text-sm text-gray-600">✉️ {contact.email}</p>
                  )}
                </div>

                {contact.mobile && (
                  <button
                    onClick={() => inviteMember(contact)}
                    className="text-green-600 text-sm border border-green-600 px-3 py-1 rounded hover:bg-green-50 transition-colors"
                  >
                    Invite
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ADD MEMBER BUTTON/FORM */}
        {!showAddMember ? (
          <button
            onClick={() => setShowAddMember(true)}
            disabled={!isOnline}
            className={`w-full p-2 rounded mt-3 font-medium transition-colors ${
              isOnline
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            + Add Family Contact
          </button>
        ) : (
          <div className="mt-3 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700">Add Family Contact</h4>
            
            {/* Name Input */}
            <div>
              <input
                placeholder="Name *"
                value={newMember.name}
                onChange={(e) => {
                  setNewMember({ ...newMember, name: e.target.value });
                  setMemberErrors({ ...memberErrors, name: null });
                }}
                className={`w-full border p-2 rounded ${
                  memberErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={savingMember}
              />
              {memberErrors.name && (
                <p className="text-red-500 text-xs mt-1">{memberErrors.name}</p>
              )}
            </div>

            {/* Relation Input */}
            <div>
              <select
                value={newMember.relation}
                onChange={(e) => {
                  setNewMember({ ...newMember, relation: e.target.value });
                  setMemberErrors({ ...memberErrors, relation: null });
                }}
                className={`w-full border p-2 rounded ${
                  memberErrors.relation ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={savingMember}
              >
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="sibling">Sibling</option>
                <option value="grandparent">Grandparent</option>
                <option value="other">Other</option>
              </select>
              {memberErrors.relation && (
                <p className="text-red-500 text-xs mt-1">{memberErrors.relation}</p>
              )}
            </div>

            {/* Mobile Input */}
            <div>
              <div className="flex gap-2">
                <input
                  value={newMember.countryCode}
                  onChange={(e) =>
                    setNewMember({ ...newMember, countryCode: e.target.value })
                  }
                  className="w-20 border border-gray-300 p-2 rounded"
                  disabled={savingMember}
                />
                <input
                  placeholder="Mobile (optional)"
                  value={newMember.mobile}
                  onChange={(e) => {
                    setNewMember({ ...newMember, mobile: e.target.value });
                    setMemberErrors({ ...memberErrors, mobile: null });
                  }}
                  className={`flex-1 border p-2 rounded ${
                    memberErrors.mobile ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={savingMember}
                />
              </div>
              {memberErrors.mobile && (
                <p className="text-red-500 text-xs mt-1">{memberErrors.mobile}</p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <input
                type="email"
                placeholder="Email (optional)"
                value={newMember.email}
                onChange={(e) => {
                  setNewMember({ ...newMember, email: e.target.value });
                  setMemberErrors({ ...memberErrors, email: null });
                }}
                className={`w-full border p-2 rounded ${
                  memberErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={savingMember}
              />
              {memberErrors.email && (
                <p className="text-red-500 text-xs mt-1">{memberErrors.email}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={saveNewMember}
                disabled={savingMember || !isOnline}
                className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                  savingMember || !isOnline
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {savingMember ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setNewMember({
                    name: "",
                    relation: "parent",
                    countryCode: "+91",
                    mobile: "",
                    email: ""
                  });
                  setMemberErrors({});
                }}
                disabled={savingMember}
                className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
