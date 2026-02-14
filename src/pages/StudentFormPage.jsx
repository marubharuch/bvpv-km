import { useState, useEffect, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db, auth } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword
} from "firebase/auth";

import StudentPaperField from "../components/StudentPaperField";
import StudentPaperPhoto from "../components/StudentPaperPhoto";
import StudentSectionTitle from "../components/StudentSectionTitle";
import StudentCityField from "../components/StudentCityField";
import StudentEducationSection from "../components/StudentEducationSection";
import StudentFamilySection from "../components/StudentFamilySection";
import StudentMobileField from "../components/StudentMobileField";
import StudentSkillsSection from "../components/StudentSkillsSection";
import StudentFinancialSection from "../components/StudentFinancialSection";
import FormStepFooter from "../components/FormStepFooter";
import LoadingScreen from "../components/LoadingScreen";

import { saveStudentDraft, loadStudentDraft } from "../utils/studentStorage";
import { submitStudentRegistration } from "../services/studentSubmitService";

export default function StudentFormPage() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const navigate = useNavigate();

  const [sectionIndex, setSectionIndex] = useState(0);
  const [student, setStudent] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [sectionError, setSectionError] = useState(false);
  
  const [skillCardIndex, setSkillCardIndex] = useState(0);
  const [skillsMode, setSkillsMode] = useState(false);

  const [showRegisterChoice, setShowRegisterChoice] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  // Loading states for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({
    message: "Preparing your submission...",
    progress: 0,
    stage: ""
  });

  // ---------- VALIDATION ----------
  const validateField = (name, value) => {
    let error = "";
    if (name === "name" && !value?.trim()) error = "Name is required";
    if (name === "gender" && !value) error = "Gender required";
    if (name === "dob" && !value) error = "Birth date required";
    if (name === "mobile") {
      const digits = (value || "").replace(/\D/g, '');
      const last10Digits = digits.slice(-10);
      if (!last10Digits) {
        error = "Mobile number is required";
      } else if (!/^[6-9]\d{9}$/.test(last10Digits)) {
        error = "Valid 10-digit mobile number required (starting with 6-9)";
      }
    }
    if (name === "city" && !value) error = "City required";
    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, student[name]);
  };

  const nextSection = () => {
    let fields = [];
    if (sectionIndex === 0) fields = ["name", "gender", "dob", "mobile"];
    if (sectionIndex === 1) fields = ["city"];
    
    if (!skillsMode) {
      let valid = true;
      fields.forEach(f => {
        setTouched(t => ({ ...t, [f]: true }));
        if (!validateField(f, student[f])) valid = false;
      });
      
      setSectionError(!valid);
      if (valid) {
        // 🟢 Skip family section if user already has family
        if (sectionIndex === 0 && user?.familyId) {
          setSectionIndex(2); // Skip to Sports & Talents
        } else if (sectionIndex < 4) {
          setSectionIndex(sectionIndex + 1);
        }
      }
    }
  };

  const prevSection = () => {
    if (skillsMode) {
      setSkillsMode(false);
    } else if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1);
    }
  };

  const update = (k, v) => {
    const updated = { ...student, [k]: v };
    setStudent(updated);
    saveStudentDraft(updated);
  };

  // ---------- SUBMISSION HANDLERS ----------
  const handleFinalSave = async () => {
    setIsSubmitting(true);
    setSubmissionProgress({
      message: "Starting submission...",
      progress: 5,
      stage: "init"
    });
    
    try {
      const result = await submitStudentRegistration(
        student, 
        editId, 
        (progress) => setSubmissionProgress(progress)
      );
      
      setSubmissionProgress({
        message: "Success! Redirecting...",
        progress: 100,
        stage: "complete"
      });
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
      
    } catch (error) {
      console.error("Submission failed:", error);
      alert(error.message || "Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsSubmitting(true);
    setSubmissionProgress({
      message: "Connecting to Google...",
      progress: 10,
      stage: "auth"
    });
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      setSubmissionProgress({
        message: "Google authentication successful! Saving your data...",
        progress: 30,
        stage: "auth_complete"
      });
      
      await handleFinalSave();
    } catch (error) {
      console.error("Google sign-in failed:", error);
      alert("Google sign-in failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!regEmail || regPass.length < 6) {
      alert("Enter valid email and password (min 6 chars)");
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionProgress({
      message: "Creating your account...",
      progress: 10,
      stage: "auth"
    });
    
    try {
      await createUserWithEmailAndPassword(auth, regEmail, regPass);
      
      setSubmissionProgress({
        message: "Account created! Saving your registration...",
        progress: 30,
        stage: "auth_complete"
      });
      
      await handleFinalSave();
    } catch (error) {
      console.error("Email registration failed:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered. Please try logging in instead.');
      } else if (error.code === 'auth/weak-password') {
        alert('Password is too weak. Please use at least 6 characters.');
      } else {
        alert('Registration failed: ' + error.message);
      }
      
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    // Validate photo before submission
    if (!student.photo) {
      alert("Please upload a student photo before submitting.");
      setSectionIndex(3);
      return;
    }
    
    // 🟢 Skip family validation for edit mode
    if (editId) {
      await handleFinalSave();
      return;
    }
    
    if (!user) {
      setShowRegisterChoice(true);
    } else if (!user.familyId && !student.familyContacts?.length) {
      // Only require family contacts for new family registration
      alert("Please add at least one family contact for new family registration.");
      setSectionIndex(1);
    } else {
      await handleFinalSave();
    }
  };

  // ---------- LOAD DATA ----------
  useEffect(() => {
    const loadData = async () => {
      try {
        if (editId && user?.uid) {
          const snap = await get(ref(db, "families"));
          let foundStudent = null;
          
          snap.forEach(f => {
            if (f.child("members").hasChild(user.uid)) {
              const stu = f.val().students?.[editId];
              if (stu) foundStudent = stu;
            }
          });
          
          if (foundStudent) {
            setStudent(foundStudent);
          } else {
            console.warn("Student not found, loading draft");
            const draft = await loadStudentDraft();
            setStudent(draft || {});
          }
        } else {
          const draft = await loadStudentDraft();
          setStudent(draft || {});
        }
      } catch (error) {
        console.error("Error loading data:", error);
        const draft = await loadStudentDraft();
        setStudent(draft || {});
      }
    };
    
    loadData();
  }, [editId, user?.uid]);

  return (
    <div className="max-w-md mx-auto p-4 bg-[#ece9e1] min-h-screen">
      
      {/* Loading Screen Overlay */}
      {isSubmitting && (
        <LoadingScreen 
          message={submissionProgress.message}
          progress={submissionProgress.progress}
          subMessage="Please don't close this window"
          showLogo={true}
        />
      )}

      {/* Progress Dots - Dynamic based on family status */}
      <div className="flex justify-center gap-2 mb-4">
        {[0, 1, 2, 3].map(i => {
          // Hide family dot for existing family users
          if (i === 1 && user?.familyId) return null;
          
          // Adjust displayed index
          let displayIndex = i;
          if (user?.familyId) {
            if (i === 2) displayIndex = 1;
            if (i === 3) displayIndex = 2;
          }
          
          return (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                displayIndex === sectionIndex ? "bg-green-600" : "bg-gray-300"
              } ${isSubmitting ? "opacity-50" : ""}`}
            />
          );
        })}
      </div>

      {/* SECTION 1 - Basic Info */}
      {sectionIndex === 0 && !skillsMode && !isSubmitting && (
        <div className={`bg-white p-4 rounded shadow ${sectionError ? "border border-red-500" : ""}`}>
          <StudentSectionTitle title="Basic Information" />
          <div className="flex gap-3">
            {student.photo ? (
              <div>
                <StudentPaperPhoto
                  photo={student.photo}
                  onChange={(v) => update("photo", v)}
                  isEditMode={true}
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Click photo to replace
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-28 h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                  <p className="text-xs text-gray-500 p-2">
                    Photo will be added<br />before review
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Required before submission
                </p>
              </div>
            )}
          
            <div className="flex-1">
              <StudentPaperField
                label="Full Name:"
                value={student.name}
                onSave={(v) => update("name", v)}
                onBlur={() => handleBlur("name")}
              />
              {touched.name && errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
              
              <div className="flex items-center gap-2 mb-2">
                <span>Gender:</span>
                <select
                  value={student.gender || ""}
                  onChange={(e) => update("gender", e.target.value)}
                  onBlur={() => handleBlur("gender")}
                  className="border-b border-black bg-transparent"
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              {touched.gender && errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span>Birth Date:</span>
            <input
              type="date"
              value={student.dob || ""}
              onChange={(e) => update("dob", e.target.value)}
              onBlur={() => handleBlur("dob")}
              className="border-b border-black bg-transparent"
            />
          </div>
          {touched.dob && errors.dob && <p className="text-red-500 text-xs">{errors.dob}</p>}
          
          <StudentMobileField
            value={student.mobile}
            onSave={(v) => update("mobile", v)}
            onBlur={() => handleBlur("mobile")}
          />
          {touched.mobile && errors.mobile && <p className="text-red-500 text-xs">{errors.mobile}</p>}
          
          <FormStepFooter onNext={nextSection} />
        </div>
      )}

      {/* SECTION 2 - Family & Location */}
      {sectionIndex === 1 && !skillsMode && !isSubmitting && (
        <div className={`bg-white p-4 rounded shadow ${sectionError ? "border border-red-500" : ""}`}>
          <StudentSectionTitle title="Family & Location" />
          
          {/* Only show family contacts for NEW FAMILY registration */}
          {!user?.familyId && !editId && (
            <>
              <StudentFamilySection student={student} update={update} />
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2 mb-3">
                ⓘ Family details required for first-time registration
              </div>
            </>
          )}
          
          {/* Show message for existing family */}
          {user?.familyId && (
            <div className="bg-green-50 p-3 rounded mb-3">
              <p className="text-sm text-green-700">
                ✓ You are already registered with a family. Adding student to existing family.
              </p>
              <p className="text-xs text-green-600 mt-1">
                Family ID: {user.familyId}
              </p>
            </div>
          )}
          
          <StudentCityField
            label="City:"
            value={student.city}
            onSave={(v) => update("city", v)}
            onBlur={() => handleBlur("city")}
          />
          {touched.city && errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
          
          <FormStepFooter onBack={prevSection} onNext={nextSection} />
        </div>
      )}

      {/* SECTION 3 — Sports & Talents */}
      {sectionIndex === 2 && !skillsMode && !isSubmitting && (
        <div className="bg-white p-4 rounded shadow">
          <StudentSectionTitle title="Sports & Talents" />
          <button
            onClick={() => {
              setSkillsMode(true);
              setSkillCardIndex(0);
            }}
            className="w-full bg-blue-600 text-white p-3 rounded"
          >
            Start Skills Section
          </button>
          <FormStepFooter onBack={prevSection} onNext={nextSection} />
        </div>
      )}

      {/* SKILLS MODE */}
      {skillsMode && !isSubmitting && (
        <StudentSkillsSection
          student={student}
          update={update}
          cardIndex={skillCardIndex}
          setCardIndex={setSkillCardIndex}
          exitSkillsMode={() => {
            setSkillsMode(false);
            nextSection();
          }}
        />
      )}

      {/* SECTION 4 - PHOTO UPLOAD */}
      {sectionIndex === 3 && !skillsMode && !isSubmitting && (
        <div className="bg-white p-4 rounded shadow">
          <StudentSectionTitle title="Upload Student Photo" />
          
          <div className="text-center">
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                {student.photo 
                  ? "You can change the photo if needed"
                  : "Please upload a clear passport photo of the student"
                }
              </p>
              <p className="text-sm text-gray-500">
                Required for identification purposes
              </p>
            </div>
            
            <div className="flex justify-center mb-6">
              <StudentPaperPhoto
                photo={student.photo}
                onChange={(v) => update("photo", v)}
                isEditMode={!!student.photo}
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg text-left max-w-md mx-auto">
              <h4 className="font-medium text-blue-800 mb-2">Photo Requirements:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Clear face visible</li>
                <li>• Light background preferred</li>
                <li>• File size less than 2MB</li>
                <li>• Recent photo (last 6 months)</li>
                <li>• File types: JPG, PNG</li>
              </ul>
            </div>
          </div>
          
          <FormStepFooter 
            onBack={prevSection} 
            onNext={() => {
              if (!student.photo) {
                alert("Please upload a student photo before proceeding to review.");
              } else {
                setSectionIndex(4);
              }
            }}
            nextText={student.photo ? "Continue to Review" : "Upload Photo to Continue"}
          />
        </div>
      )}

      {/* SECTION 5 — REVIEW */}
      {sectionIndex === 4 && !skillsMode && !isSubmitting && (
        <div className="bg-white p-4 rounded shadow space-y-3">
          <StudentSectionTitle title="Review Your Data" />

          <div className="text-sm space-y-2">
            <p><b>Name:</b> {student.name}</p>
            <p><b>Gender:</b> {student.gender}</p>
            <p><b>DOB:</b> {student.dob}</p>
            <p><b>Mobile:</b> {student.mobile}</p>
            <p><b>City:</b> {student.city}</p>

            <hr className="my-2" />

            <p><b>Skills:</b></p>
            {Object.entries(student.skills || {}).map(([cat, list]) => (
              list.length > 0 && (
                <p key={cat}>
                  {cat}: {list.join(", ")}
                </p>
              )
            ))}

            <p><b>Achievements:</b> {student.achievements || "Not provided"}</p>
            <p><b>About:</b> {student.aboutMe || "Not provided"}</p>

            <hr className="my-2" />

            <div>
              <p><b>Needs Support:</b> {student.needsScholarship ? "Yes" : "No"}</p>
              
              {student.needsScholarship && student.supportType && (
                <div className="ml-4 mt-1">
                  <p><b>Support Types Needed:</b></p>
                  <ul className="list-disc list-inside">
                    {Object.entries(student.supportType).map(([type, isNeeded]) => (
                      isNeeded && (
                        <li key={type} className="capitalize">
                          {type} Support
                        </li>
                      )
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <p><b>Photo:</b> {student.photo ? "✓ Uploaded" : "❌ Missing"}</p>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setSectionIndex(0)}
              className="w-1/2 border border-gray-400 p-2 rounded"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="w-1/2 bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* REGISTRATION CHOICE MODAL */}
      {showRegisterChoice && !isSubmitting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded w-80 space-y-3">
            <h3 className="text-lg font-semibold text-center">Register to Submit</h3>
            <button
              onClick={handleGoogleRegister}
              className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
              disabled={isSubmitting}
            >
              <p>Register with Gmail</p>
              <span className="text-xs">(Password not required)</span>
            </button>
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              disabled={isSubmitting}
            >
              Register with other Email
            </button>
            <button
              onClick={() => setShowRegisterChoice(false)}
              className="w-full border border-gray-400 p-2 rounded"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* EMAIL REGISTRATION MODAL */}
      {showEmailForm && !isSubmitting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded w-80 space-y-3">
            <h3 className="text-lg font-semibold text-center">Email Registration</h3>
            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={isSubmitting}
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={isSubmitting}
            />
            <button
              onClick={handleEmailRegister}
              className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Register & Submit"}
            </button>
            <button
              onClick={() => {
                setShowEmailForm(false);
                setShowRegisterChoice(true);
              }}
              className="w-full border border-gray-400 p-2 rounded"
              disabled={isSubmitting}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}