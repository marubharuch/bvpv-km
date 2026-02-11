// studentRegistrationService.js
import { getDatabase, ref, push, set, update, get } from "firebase/database";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword
} from "firebase/auth";
import { clearStudentDraft } from "../utils/studentStorage";
import { auth } from "../firebase";
import { uploadToCloudinary } from "./cloudinaryService";

// ============================================
// HELPER: Sanitize data for Firebase
// ============================================
const sanitizeForFirebase = (obj) => {
  // Handle null/undefined
  if (obj === null || obj === undefined) return null;
  
  // Handle primitives
  if (typeof obj !== 'object') return obj;
  
  // Handle Date objects
  if (obj instanceof Date) return obj.toISOString();
  
  // 🔴 CRITICAL: Convert arrays to objects for Firebase
  if (Array.isArray(obj)) {
    const arrayObject = {};
    obj.forEach((item, index) => {
      if (item !== undefined && item !== null) {
        arrayObject[index] = sanitizeForFirebase(item);
      }
    });
    return arrayObject;
  }
  
  // Handle regular objects
  const clean = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    // Convert undefined to null
    if (value === undefined) {
      clean[key] = null;
    } 
    // Recursively sanitize nested objects/arrays
    else if (value && typeof value === 'object') {
      clean[key] = sanitizeForFirebase(value);
    } 
    // Keep primitives as-is
    else {
      clean[key] = value;
    }
  });
  
  return clean;
};

// ============================================
// HELPER: Compress image for passport
// ============================================
const compressForPassport = (base64Image) => {
  return new Promise((resolve, reject) => {
    if (!base64Image || typeof base64Image !== 'string') {
      reject(new Error('Invalid image data'));
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = base64Image;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set to passport dimensions
        const PASSPORT_SIZE = 600;
        canvas.width = PASSPORT_SIZE;
        canvas.height = PASSPORT_SIZE;
        
        // Calculate scaling to fill square while maintaining aspect ratio
        const scale = Math.max(
          PASSPORT_SIZE / img.width,
          PASSPORT_SIZE / img.height
        );
        
        const x = (PASSPORT_SIZE / 2) - (img.width / 2) * scale;
        const y = (PASSPORT_SIZE / 2) - (img.height / 2) * scale;
        
        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, PASSPORT_SIZE, PASSPORT_SIZE);
        
        // Draw image centered
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // Compress to 50-80KB range
        let quality = 0.85;
        let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        // Check size and adjust quality if needed
        const sizeKB = Math.round((compressedBase64.length * 0.75) / 1024);
        
        if (sizeKB > 80) {
          quality = 0.7;
          compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        }
        if (sizeKB > 100) {
          quality = 0.6;
          compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        }
        
        console.log(`Passport photo compressed: ${sizeKB}KB, quality: ${quality}`);
        resolve(compressedBase64);
      } catch (err) {
        console.error('Compression error:', err);
        resolve(base64Image);
      }
    };
    
    img.onerror = () => {
      console.warn('Image compression failed, using original');
      resolve(base64Image);
    };
  });
};

// ============================================
// MAIN SUBMISSION FUNCTION
// ============================================
export const submitStudentRegistration = async (student, editId = null, onProgress = null) => {
  const db = getDatabase();

  // Progress update helper
  const updateProgress = (message, progress) => {
    if (onProgress) {
      onProgress({ message, progress, stage: message });
    }
  };

  // 🔍 STEP 1: Validation
  updateProgress("Validating data...", 5);
  const requiredFields = ['name', 'dob', 'mobile'];
  const missingFields = requiredFields.filter(field => !student[field]?.toString().trim());
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate mobile format
  const mobileDigits = (student.mobile || '').replace(/\D/g, '');
  const last10Digits = mobileDigits.slice(-10);
  if (last10Digits.length !== 10 || !/^[6-9]/.test(last10Digits)) {
    throw new Error('Valid 10-digit mobile number required (starting with 6-9)');
  }

  // 🔐 STEP 2: Authentication
  updateProgress("Authenticating...", 10);
  let user = auth.currentUser;

  if (!user) {
    if (!student.email) throw new Error("Email required for registration");

    if (student.email.endsWith("@gmail.com")) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        const res = await signInWithPopup(auth, provider);
        user = res.user;
      } catch (authError) {
        console.error('Google sign-in failed:', authError);
        throw new Error('Google sign-in failed. Please try again or use email/password.');
      }
    } else {
      const password = prompt(`Create password for ${student.email}:`);
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      try {
        const res = await signInWithEmailAndPassword(auth, student.email, password)
          .catch(async () => {
            return await createUserWithEmailAndPassword(auth, student.email, password);
          });
        user = res.user;
      } catch (authError) {
        console.error('Email authentication failed:', authError);
        throw new Error('Authentication failed. Please check your email and password.');
      }
    }
  }

  // ☁️ STEP 3: Upload photo to Cloudinary
  updateProgress("Processing photo...", 30);
  let photoURL = student.photo;
  
  if (student.photo && typeof student.photo === 'string' && !student.photo.includes('cloudinary.com')) {
    try {
      console.log('Processing photo for Cloudinary upload...');
      updateProgress("Compressing image...", 40);
      
      const compressedPhoto = await compressForPassport(student.photo);
      
      updateProgress("Uploading to Cloudinary...", 50);
      photoURL = await uploadToCloudinary(
        compressedPhoto, 
        `students/${user.uid}/${Date.now()}`
      );
      
      console.log('✅ Photo uploaded to Cloudinary:', photoURL);
      updateProgress("Photo uploaded successfully", 60);
      
    } catch (uploadError) {
      console.error('❌ Photo upload failed:', uploadError);
      photoURL = null;
    }
  }

  // 📝 STEP 4: Prepare student data
  updateProgress("Preparing data...", 70);
  
  // 🟢 FIXED: Remove familyContacts from student data - it belongs to family, not student
  const studentDataForFirebase = {
    // Basic info
    name: student.name?.trim() || '',
    gender: student.gender || '',
    dob: student.dob || '',
    mobile: student.mobile?.toString() || '',
    city: student.city || '',
    
    // Education & Skills
    education: (student.education || student.edducation || '').toString(),
    skills: student.skills || {},
    achievements: student.achievements || '',
    aboutMe: student.aboutMe || '',
    
    // Financial
    needsScholarship: Boolean(student.needsScholarship),
    supportType: student.supportType || {},
    
    // Photo
    photo: photoURL || null,
    
    // Metadata
    lastUpdated: Date.now(),
    submittedBy: user.uid,
    submittedAt: Date.now(),
    status: 'submitted',
    email: student.email || user.email || ''
  };

  // Clean base64 data from any fields
  Object.keys(studentDataForFirebase).forEach(key => {
    const value = studentDataForFirebase[key];
    if (typeof value === 'string' && value.startsWith('data:image')) {
      studentDataForFirebase[key] = null;
    }
  });

  // 🔎 STEP 5: Find user's family
  updateProgress("Finding family records...", 75);
  const snap = await get(ref(db, "families"));
  let familyId = null;
  let familyData = null;

  snap.forEach(family => {
    if (family.child("members").hasChild(user.uid)) {
      familyId = family.key;
      familyData = family.val();
    }
  });

  // ============================================
  // CASE 1: EDIT EXISTING STUDENT
  // ============================================
  if (editId && familyId) {
    try {
      updateProgress("Updating student record...", 80);
      const existingStudentRef = ref(db, `families/${familyId}/students/${editId}`);
      const existingSnap = await get(existingStudentRef);
      const existingData = existingSnap.val();
      
      // Preserve original creation date and ID
      studentDataForFirebase.createdAt = existingData?.createdAt || Date.now();
      studentDataForFirebase.studentId = editId;
      
      // Sanitize data before update
      const sanitizedData = sanitizeForFirebase(studentDataForFirebase);
      
      await update(existingStudentRef, sanitizedData);
      await clearStudentDraft();
      
      updateProgress("Update complete!", 100);
      
      return { 
        mode: "updated", 
        studentId: editId,
        familyId,
        message: "Student information updated successfully"
      };
    } catch (error) {
      console.error('Error updating student:', error);
      throw new Error(`Failed to update student information: ${error.message}`);
    }
  }

  // ============================================
  // CASE 2: ADD STUDENT TO EXISTING FAMILY
  // ============================================
  if (familyId) {
    try {
      updateProgress("Adding student to family...", 80);
      const newId = `STU_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Add metadata for new student
      studentDataForFirebase.createdAt = Date.now();
      studentDataForFirebase.studentId = newId;
      studentDataForFirebase.addedAt = Date.now();
      
      // Sanitize data before update
      const sanitizedData = sanitizeForFirebase(studentDataForFirebase);
      
      await update(ref(db, `families/${familyId}/students/${newId}`), sanitizedData);
      await clearStudentDraft();
      
      updateProgress("Student added successfully!", 100);
      
      return { 
        mode: "added", 
        studentId: newId,
        familyId,
        message: "Student added to family successfully"
      };
    } catch (error) {
      console.error('Error adding student:', error);
      throw new Error(`Failed to add student to family: ${error.message}`);
    }
  }

  // ============================================
  // CASE 3: CREATE NEW FAMILY
  // ============================================
  if (!student.familyContacts?.length) {
    throw new Error("Add at least one family contact (parent/guardian)");
  }

  try {
    updateProgress("Creating new family record...", 80);
    
    // Create new family reference
    const familyRef = push(ref(db, "families"));
    familyId = familyRef.key;
    const familyPin = Math.floor(1000 + Math.random() * 9000);
    
    // Add metadata for new student
    studentDataForFirebase.createdAt = Date.now();
    studentDataForFirebase.studentId = "STU_1";
    studentDataForFirebase.isPrimaryStudent = true;
    
    // Sanitize student data
    const sanitizedStudentData = sanitizeForFirebase(studentDataForFirebase);

    // 🟢 FIXED: Convert familyContacts array to object for Firebase
    const familyContactsObj = {};
    const contacts = Array.isArray(student.familyContacts) 
      ? student.familyContacts 
      : student.familyContacts ? [student.familyContacts] : [];

    contacts.forEach((contact, index) => {
      if (contact && typeof contact === 'object') {
        familyContactsObj[index] = {
          name: contact.name || '',
          relation: contact.relation || '',
          mobile: contact.mobile || '',
          email: contact.email || ''
        };
      } else if (typeof contact === 'string') {
        // Handle if contact is just a string
        familyContactsObj[index] = {
          name: contact,
          relation: 'parent',
          mobile: '',
          email: ''
        };
      }
    });

    // Create family structure
    const familyData = {
      ownerUid: user.uid,
      familyPin,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      familyName: student.name ? `${student.name.split(' ')[0]}'s Family` : 'New Family',
      familyContacts: familyContactsObj, // 👈 Object, not array!
      members: {
        [user.uid]: { 
          role: "owner", 
          email: user.email || '',
          name: user.displayName || student.name || 'Family Member',
          joinedAt: Date.now(),
          isActive: true
        }
      },
      students: { 
        STU_1: sanitizedStudentData 
      },
      settings: {
        notifications: true,
        autoSave: true
      }
    };

    // Sanitize family data
    const sanitizedFamilyData = sanitizeForFirebase(familyData);

    // Save family data
    await set(familyRef, sanitizedFamilyData);
    
    // Save user reference
    await set(ref(db, `users/${user.uid}`), sanitizeForFirebase({
      familyId,
      role: "owner",
      email: user.email || '',
      name: user.displayName || student.name || '',
      createdAt: Date.now(),
      lastLogin: Date.now()
    }));

    await clearStudentDraft();
    updateProgress("Registration complete!", 100);

    return { 
      mode: "new", 
      familyPin, 
      familyId,
      studentId: "STU_1",
      message: "New family registration successful! Save your Family PIN for future access."
    };
  } catch (error) {
    console.error('Error creating new family:', error);
    throw new Error(`Failed to create new family registration: ${error.message}`);
  }
};

// ============================================
// HELPER: Validate student data
// ============================================
export const validateStudentData = (student) => {
  const errors = [];
  
  if (!student.name?.trim()) errors.push('Name is required');
  if (!student.dob) errors.push('Date of birth is required');
  if (!student.mobile) errors.push('Mobile number is required');
  
  // Validate mobile format
  if (student.mobile) {
    const digits = student.mobile.replace(/\D/g, '');
    const last10 = digits.slice(-10);
    if (last10.length !== 10) {
      errors.push('Mobile number must be 10 digits');
    } else if (!/^[6-9]/.test(last10)) {
      errors.push('Mobile number must start with 6, 7, 8, or 9');
    }
  }
  
  // Validate email if provided
  if (student.email && !/\S+@\S+\.\S+/.test(student.email)) {
    errors.push('Valid email address required');
  }
  
  // Validate family contacts for new registration
  if (!student.familyContacts?.length) {
    errors.push('At least one family contact required');
  }
  
  return errors;
};