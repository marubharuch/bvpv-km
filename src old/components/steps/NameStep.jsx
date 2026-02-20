// 🟢 FIXED: Remove uid parameter completely
const handleFinalSave = async () => {  // 👈 No uid parameter
  setIsSubmitting(true);
  setSubmissionProgress({
    message: "Starting submission...",
    progress: 5,
    stage: "init"
  });
  
  try {
    // ✅ CORRECT: Only 3 parameters - student, editId, onProgress
    const result = await submitStudentRegistration(
      student, 
      editId, 
      (progress) => setSubmissionProgress(progress)  // 👈 This is the 3rd parameter
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

// 🟢 FIXED: Google registration
const handleGoogleRegister = async () => {
  setIsSubmitting(true);
  setSubmissionProgress({
    message: "Connecting to Google...",
    progress: 10,
    stage: "auth"
  });
  
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);  // 👈 Don't need to capture res
    
    setSubmissionProgress({
      message: "Google authentication successful! Saving your data...",
      progress: 30,
      stage: "auth_complete"
    });
    
    await handleFinalSave();  // 👈 No uid parameter
  } catch (error) {
    console.error("Google sign-in failed:", error);
    alert("Google sign-in failed. Please try again.");
    setIsSubmitting(false);
  }
};

// 🟢 FIXED: Email registration
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
    await createUserWithEmailAndPassword(auth, regEmail, regPass);  // 👈 Don't need to capture res
    
    setSubmissionProgress({
      message: "Account created! Saving your registration...",
      progress: 30,
      stage: "auth_complete"
    });
    
    await handleFinalSave();  // 👈 No uid parameter
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

// 🟢 FIXED: Handle direct submission
const handleSubmit = async () => {
  if (!student.photo) {
    alert("Please upload a student photo before submitting.");
    setSectionIndex(3);
    return;
  }
  
  if (!user) {
    setShowRegisterChoice(true);
  } else {
    await handleFinalSave();  // 👈 No uid parameter
  }
};