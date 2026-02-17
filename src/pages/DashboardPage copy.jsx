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
  const [editFamilyField, setEditFamilyField] = useState(null);
const [familyFieldValue, setFamilyFieldValue] = useState("");
const [showLocationPopup, setShowLocationPopup] = useState(false);
const [showConfirmGps, setShowConfirmGps] = useState(false);
const [showFamilyNameEditor, setShowFamilyNameEditor] = useState(false);
const [memberOrder, setMemberOrder] = useState([]);
const orderedMembers = family.memberOrder || [];


const sortByOrder = (list, type) => {
  if (!orderedMembers.length) return list;

  return [...list].sort((a, b) => {
    const aIndex = orderedMembers.findIndex(
      m => m.name === a.name && m.type === type
    );

    const bIndex = orderedMembers.findIndex(
      m => m.name === b.name && m.type === type
    );

    return aIndex - bIndex;
  });
};

const sortedContacts = sortByOrder(contacts, "contact");
const sortedStudents = sortByOrder(students, "student");



  const [newMember, setNewMember] = useState({
    name: "",
    relation: "parent",
    countryCode: "+91",
    mobile: "",
    email: ""
  });
  const [memberErrors, setMemberErrors] = useState({});
const [editingContact, setEditingContact] = useState(null);

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
  const openFamilyNameEditor = () => {
  const combined = [
    ...contacts.map(c => ({ name: c.name, type: "contact" })),
    ...students.map(s => ({ name: s.name, type: "student" }))
  ];

  setMemberOrder(combined);
  setShowFamilyNameEditor(true);
};
const changePosition = (index, newPosition) => {
  const newOrder = [...memberOrder];

  const item = newOrder.splice(index, 1)[0];

  newOrder.splice(newPosition - 1, 0, item);

  setMemberOrder(newOrder);
};
const saveFamilyOrder = async () => {
  await update(ref(db, `families/${familyId}`), {
    memberOrder
  });

  setShowFamilyNameEditor(false);
  refreshFromFirebase();
};



  // 🔹 Load family data on mount
  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);
useEffect(() => {
  if (!family) return;

  // Show only if address exists AND location not saved
  if (family.address && !family.homeLocation) {
    const shown = localStorage.getItem("locationPopupShown");

    if (!shown) {
      setShowLocationPopup(true);
      localStorage.setItem("locationPopupShown", "yes");
    }
  }
}, [family]);
const captureHomeLocation = () => {
  if (!navigator.geolocation) {
    setError("Geolocation not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      await update(ref(db, `families/${familyId}`), {
        homeLocation: {
          lat: latitude,
          lng: longitude,
          accuracy,
          savedAt: Date.now()
        }
      });

      setShowLocationPopup(false);
      refreshFromFirebase();
    },
    (error) => {
      setError("Location permission denied.");
      setShowLocationPopup(false);
    },
    {
      enableHighAccuracy: true,  // ⭐ important
      timeout: 15000,
      maximumAge: 0
    }
  );
};

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

  const openEditFamily = (field) => {
  setEditFamilyField(field);
  setFamilyFieldValue(family[field] || "");
};
const saveFamilyField = async () => {
  await update(ref(db, `families/${familyId}`), {
    [editFamilyField]: familyFieldValue
  });

  setEditFamilyField(null);
  refreshFromFirebase();
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

     // ⭐ IF EDITING EXISTING CONTACT
if (editingContact) {
  await update(
    ref(db, `families/${familyId}/familyContacts/${editingContact.index}`),
    {
      name: sanitizedName,
      relation: sanitizedRelation,
      mobile: fullMobile,
      email: newMember.email.trim(),
      updatedAt: Date.now()
    }
  );

  setEditingContact(null);
} else {
  // ADD NEW CONTACT
  const newRef = push(ref(db, `families/${familyId}/familyContacts`));

  await set(newRef, {
    name: sanitizedName,
    relation: sanitizedRelation,
    mobile: fullMobile,
    email: newMember.email.trim(),
    addedAt: Date.now(),
    addedBy: user.uid
  });
}


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
// invite student via WhatsApp
  const inviteStudent = (student) => {
  if (!student.mobile) {
    setError("Student mobile not available.");
    return;
  }

  const clean = student.mobile.replace(/\D/g, "");

  const message =
    `🎓 You're invited to join our family student portal!\n\n` +
    `Family: ${family.familyName}\n` +
    `Family PIN: ${family.familyPin}\n\n` +
    `Register here: ${APP_URL}/register`;

  const whatsappUrl =
    `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, "_blank");
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
  const editContact = (index, contact) => {
  setEditingContact({ index, ...contact });

  setNewMember({
    name: contact.name || "",
    relation: contact.relation || "parent",
    countryCode: "+91",
    mobile: contact.mobile || "",
    email: contact.email || ""
  });

  setShowAddMember(true); // open modal
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

  const EditIconButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 shrink-0"
  >
    ✏️
  </button>
);

  return (
    <div className="max-w-md mx-auto p-4 space-y-[2px]">

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
          <div className="flex justify-between items-center">
  <span className="text-gray-600">Family Name:</span>

  <div className="flex items-center gap-2">
    <span className="font-medium">{family.familyName}</span>
   <EditIconButton onClick={openFamilyNameEditor} />

      
  </div>
</div>

          <div className="flex justify-between">
            <span className="text-gray-600">Family PIN:</span>
            <span className="font-mono font-bold text-blue-600">{family.familyPin}</span>
          </div>
          {/* NATIVE */}
<div className="flex justify-between items-center">
  <span className="text-gray-600">Native:</span>

  <div className="flex items-center gap-2">
    <span>{family.native || "Not set"}</span>
    <EditIconButton onClick={() => openEditFamily("native")} />
  </div>
</div>


{/* ADDRESS */}
<div className="flex justify-between items-start">
  <span className="text-gray-600">Address:</span>

  {family.address ? (
    <div className="flex justify-between items-start">
  <span className="text-gray-600">Address:</span>

  <div className="flex items-start gap-2 text-right">
    <span>{family.address || "Not set"}</span>
    <EditIconButton onClick={() => openEditFamily("address")} />
  </div>
</div>
  ) : (
    <button
      onClick={() => openEditFamily("address")}
      className="text-blue-600 text-sm"
    >
      + Add
    </button>
  )}
</div>
{/* GPS LOCATION */}
{family.homeLocation && (
  <div className="flex justify-between items-start">
  <span className="text-gray-600">GPS:</span>

  <div className="flex items-start gap-2 text-right">
    <div>
      📍 {family.homeLocation.lat.toFixed(5)}, {family.homeLocation.lng.toFixed(5)}
      <br />
      <span className="text-xs text-gray-500">
        ±{Math.round(family.homeLocation.accuracy)} m
      </span>
    </div>

    <EditIconButton onClick={() => setShowConfirmGps(true)} />
  </div>
</div>

)}


        </div>
      </div>

      {/* STUDENTS SECTION */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
  <h3 className="font-semibold text-lg">
    Students ({students.length})
  </h3>

  <button
    onClick={addStudent}
    className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
  >
    + Add
  </button>
</div>


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
                <div className="flex items-center gap-2">

  {/* NOT JOINED → Invite */}
  {!student.email && (
    <button
      onClick={() => inviteStudent(student)}
      className="text-green-600 text-sm border border-green-600 px-3 py-1 rounded hover:bg-green-50"
    >
      📩 Invite
    </button>
  )}

  {/* JOINED → Badge */}
  {student.email && (
    <span className="text-green-600 text-sm font-medium">
      ✅ Joined
    </span>
  )}

  {/* Edit Button */}
  <EditIconButton
    onClick={() => editStudent(student.id)}
    className="text-blue-600 text-sm border border-blue-600 px-3 py-1 rounded hover:bg-blue-50"
  />
  
</div>

              </div>
            ))}
          </div>
        )}

        
      </div>

      {/* FAMILY CONTACTS SECTION */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
  <h3 className="font-semibold text-lg">
    Family Contacts ({contacts.length})
  </h3>

  <button
    onClick={() => setShowAddMember(true)}
    className="bg-green-600 text-white px-3 py-1 rounded text-sm"
  >
    + Add
  </button>
</div>


        {contacts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No contacts added yet.</p>
        ) : (
          <div className="space-y-2">
         {contacts.map((contact, index) => (
  <div
    key={index}
    className="flex items-center justify-between border-b border-gray-200 py-3 last:border-b-0"
  >
    {/* LEFT SIDE */}
    <div className="flex items-center gap-3 flex-1">

      {/* ⭐ CIRCLE EDIT ICON */}
       <button
      onClick={() => editContact(index, contact)}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 shrink-0"
    >
      ✏️
    </button>

      {/* NAME + RELATION INLINE */}
      <div>
        <p className="font-semibold text-gray-800">
          {contact.name || "Unnamed"}
          {contact.relation && (
            <span className="text-gray-500 font-normal ml-2">
              • {contact.relation}
            </span>
          )}
        </p>

        {/* Optional contact details */}
        {contact.mobile && (
          <p className="text-sm text-gray-600">
            📱 {contact.mobile}
          </p>
        )}

        {contact.email && (
          <p className="text-sm text-gray-600">
            ✉️ {contact.email}
          </p>
        )}
      </div>

    </div>

    {/* RIGHT SIDE */}
    <div>

      {!contact.email && contact.mobile && (
        <button
          onClick={() => inviteMember(contact)}
          className="text-green-600 border border-green-600 px-3 py-1 rounded-full text-sm hover:bg-green-50"
        >
          📩 Invite
        </button>
      )}

      {contact.email && (
        <span className="text-green-600 text-sm font-medium">
          ✅ Joined
        </span>
      )}

    </div>

  </div>
))}


          </div>
        )}

       

      </div>
{/* ADD MEMBER MODAL */}
{showAddMember && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 relative">

      <button
        onClick={() => setShowAddMember(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-black"
      >
        ✖
      </button>

      <h3 className="font-semibold text-lg mb-3">
        Add Family Contact
      </h3>

      <div className="space-y-3">

        <input
          placeholder="Name *"
          value={newMember.name}
          onChange={(e) =>
            setNewMember({ ...newMember, name: e.target.value })
          }
          className="w-full border p-2 rounded"
        />

        <select
          value={newMember.relation}
          onChange={(e) =>
            setNewMember({ ...newMember, relation: e.target.value })
          }
          className="w-full border p-2 rounded"
        >
          <option value="parent">Parent</option>
          <option value="guardian">Guardian</option>
          <option value="sibling">Sibling</option>
          <option value="grandparent">Grandparent</option>
          <option value="other">Other</option>
        </select>

        <div className="flex gap-2">
          <input
            value={newMember.countryCode}
            onChange={(e) =>
              setNewMember({ ...newMember, countryCode: e.target.value })
            }
            className="w-20 border p-2 rounded"
          />
          <input
            placeholder="Mobile"
            value={newMember.mobile}
            onChange={(e) =>
              setNewMember({ ...newMember, mobile: e.target.value })
            }
            className="flex-1 border p-2 rounded"
          />
        </div>

        <input
          placeholder="Email"
          value={newMember.email}
          onChange={(e) =>
            setNewMember({ ...newMember, email: e.target.value })
          }
          className="w-full border p-2 rounded"
        />

        <div className="flex gap-2">
          <button
            onClick={saveNewMember}
            className="flex-1 bg-green-600 text-white py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={() => setShowAddMember(false)}
            className="flex-1 border py-2 rounded"
          >
            Cancel
          </button>
        </div>

      </div>

    </div>
  </div>
)}


{/* ⭐ EDIT FAMILY FIELD MODAL (SEPARATE) */}
{editFamilyField && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

    <div className="bg-white rounded-lg p-4 w-full max-w-sm">

      <h3 className="font-semibold mb-3 capitalize">
        Edit {editFamilyField}
      </h3>

      <input
        value={familyFieldValue}
        onChange={(e) => setFamilyFieldValue(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />

      <div className="flex gap-2">
        <button
          onClick={saveFamilyField}
          className="flex-1 bg-blue-600 text-white py-2 rounded"
        >
          Save
        </button>

        <button
          onClick={() => setEditFamilyField(null)}
          className="flex-1 border py-2 rounded"
        >
          Cancel
        </button>
      </div>

    </div>

  </div>
)}
{showLocationPopup && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

    <div className="bg-white rounded-lg p-5 w-full max-w-sm text-center">

      <h3 className="text-lg font-semibold mb-2">
        📍 Confirm Home Location
      </h3>

      <p className="text-gray-600 mb-4">
        Are you at home right now?  
        We can store your GPS location for accurate address.
      </p>

      <div className="flex gap-2">
        <button
          onClick={captureHomeLocation}
          className="flex-1 bg-green-600 text-white py-2 rounded"
        >
          Yes
        </button>

        <button
          onClick={() => setShowLocationPopup(false)}
          className="flex-1 border py-2 rounded"
        >
          Not Now
        </button>
      </div>

    </div>

  </div>
)}
{showConfirmGps && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

    <div className="bg-white rounded-lg p-5 w-full max-w-sm text-center">

      <h3 className="font-semibold text-lg mb-2">
        Update GPS Location?
      </h3>

      <p className="text-gray-600 mb-4">
        Are you sure you want to update your home GPS location?
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowConfirmGps(false);
            captureHomeLocation(); // same function
          }}
          className="flex-1 bg-red-600 text-white py-2 rounded"
        >
          Yes
        </button>

        <button
          onClick={() => setShowConfirmGps(false)}
          className="flex-1 border py-2 rounded"
        >
          Cancel
        </button>
      </div>

    </div>

  </div>
)}
{/* ⭐ FAMILY NAME REORDER POPUP */}
{showFamilyNameEditor && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

    <div className="bg-white rounded-lg p-5 w-full max-w-sm">

      <h3 className="font-semibold text-lg mb-4 text-center">
        Choose Family Display Order
      </h3>

      {/* ⭐ LIVE PREVIEW */}
      {memberOrder.length > 0 && (
        <p className="text-center text-blue-600 font-medium mb-3">
          Preview: {memberOrder[0].name} Family
        </p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">

        {memberOrder.map((m, i) => (
          <div
            key={i}
            className="flex items-center justify-between border p-2 rounded"
          >
            <span className="font-medium">{m.name}</span>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Position</span>

              <select
                value={i + 1}
                onChange={(e) =>
                  changePosition(i, Number(e.target.value))
                }
                className="border rounded px-2 py-1"
              >
                {memberOrder.map((_, idx) => (
                  <option key={idx} value={idx + 1}>
                    {idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={saveFamilyOrder}
          className="flex-1 bg-blue-600 text-white py-2 rounded"
        >
          Save
        </button>

        <button
          onClick={() => setShowFamilyNameEditor(false)}
          className="flex-1 border py-2 rounded"
        >
          Cancel
        </button>
      </div>

    </div>

  </div>
)}



    </div>
  );
}
