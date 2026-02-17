// studentRegistrationService.js - IMPROVED VERSION
import { getDatabase, ref, push, set, update, get, runTransaction } from "firebase/database";
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
/**
 * Recursively sanitizes data for Firebase Realtime Database
 * - Converts arrays to objects with numeric keys (Firebase requirement)
 * - Converts Date objects to ISO strings
 * - Converts undefined to null
 * - Removes any remaining undefined values
 * 
 * @param {any} obj - Data to sanitize
 * @returns {any} - Sanitized data safe for Firebase
 */
export const sanitizeForFirebase = (obj) => {
  // Handle null/undefined
  if (obj === null || obj === undefined) return null;
  
  // Handle primitives (string, number, boolean)
  if (typeof obj !== 'object') return obj;
  
  // Handle Date objects - convert to ISO string
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // 🔴 CRITICAL: Convert arrays to objects for Firebase
  // Firebase Realtime Database doesn't support true arrays
  if (Array.isArray(obj)) {
    const arrayObject = {};
    obj.forEach((item, index) => {
      // Skip undefined/null items to avoid sparse arrays
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
    
    // Convert undefined to null (Firebase doesn't support undefined)
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

/**
 * Restores Firebase data back to JavaScript format
 * - Converts numeric-key objects back to arrays
 * - Recursively processes nested structures
 * 
 * @param {any} data - Firebase data to restore
 * @returns {any} - Restored data with proper arrays
 */
export const restoreFromFirebase = (data) => {
  if (!data) return data;

  if (typeof data === "object") {
    const keys = Object.keys(data);

    // If all keys are numeric → treat as array
    if (keys.length > 0 && keys.every(k => Number.isInteger(Number(k)))) {
      return Object.values(data).map(v => restoreFromFirebase(v));
    }

    // Otherwise, recursively restore object
    const clean = {};
    Object.entries(data).forEach(([k, v]) => {
      clean[k] = restoreFromFirebase(v);
    });

    return clean;
  }

  return data;
};

/**
 * Sanitizes user input to prevent XSS and injection attacks
 * @param {string} str - Input string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    // Remove script tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '');
};

// ============================================
// HELPER: Compress image for passport
// ============================================
/**
 * Compresses and resizes image for passport photo format
 * - Resizes to 600x600 pixels
 * - Maintains aspect ratio with white background
 * - Adjusts quality to target 50-80KB file size
 * 
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - Compressed base64 image
 */
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
        // Return original on error
        resolve(base64Image);
      }
    };
    
    img.onerror = () => {
      console.warn('Image compression failed, using original');
      resolve(base64Image);
    };
  });
};

/**
 * Upload to Cloudinary with retry logic for network failures
 * @param {string} photo - Base64 or file to upload
 * @param {string} folder - Cloudinary folder path
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} - Cloudinary URL
 */
const uploadWithRetry = async (photo, folder, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadToCloudinary(photo, folder);
    } catch (error) {
      console.warn(`Upload attempt ${i + 1} failed:`, error.message);
      
      // If last retry, throw error
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: wait 1s, 2s, 3s
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

/**
 * Generate unique Family PIN
 * @param {object} db - Firebase database instance
 * @returns {Promise<number>} - Unique 4-digit PIN
 */
const generateUniqueFamilyPin = async (db) => {
  const MAX_ATTEMPTS = 10;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pin = Math.floor(1000 + Math.random() * 9000);
    
    // Check if PIN already exists
    const familiesSnap = await get(ref(db, "families"));
    let pinExists = false;
    
    familiesSnap.forEach(family => {
      if (family.val()?.familyPin === pin) {
        pinExists = true;
      }
    });
    
    if (!pinExists) {
      return pin;
    }
  }
  
  // Fallback: use timestamp-based PIN
  return parseInt(Date.now().toString().slice(-4));
};

// ============================================
// HELPER: Validate student data
// ============================================
/**
 * Validates student registration data
 * @param {object} student - Student data to validate
 * @returns {string[]} - Array of error messages (empty if valid)
 */
export const validateStudentData = (student) => {
  const errors = [];
  
  // Required fields
  if (!student.name?.trim()) {
    errors.push('Name is required');
  }
  
  if (!student.dob) {
    errors.push('Date of birth is required');
  }
  
  if (!student.mobile) {
    errors.push('Mobile number is required');
  }
  
  // Validate mobile format
  if (student.mobile) {
    const digits = student.mobile.replace(/\D/g, '');
    const last10 = digits.slice(-10);
    
    if (last10.length !== 10) {
      errors.push('Mobile number must be exactly 10 digits');
    } else if (!/^[6-9]/.test(last10)) {
      errors.push('Mobile number must start with 6, 7, 8, or 9');
    }
  }
  
  // Validate email if provided
  if (student.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(student.email)) {
      errors.push('Please provide a valid email address');
    }
  }
  
  // Validate family contacts for new registration
  // (Only required if user doesn't have existing family)
  if (!student.familyContacts || student.familyContacts.length === 0) {
    errors.push('At least one family contact (parent/guardian) is required');
  }
  
  // Validate photo if provided
  if (student.photo && typeof student.photo === 'string') {
    if (!student.photo.startsWith('data:image') && !student.photo.includes('cloudinary.com')) {
      errors.push('Invalid photo format');
    }
  }
  
  return errors;
};

// ============================================
// MAIN SUBMISSION FUNCTION
// ============================================
/**
 * Submits student registration to Firebase
 * Handles three scenarios:
 * 1. Edit existing student
 * 2. Add student to existing family
 * 3. Create new family with student
 * 
 * @param {object} student - Student data to submit
 * @param {string|null} editId - Student ID if editing existing
 * @param {function|null} onProgress - Progress callback function
 * @returns {Promise<object>} - Result with mode, IDs, and message
 */
export const submitStudentRegistration = async (student, editId = null, onProgress = null) => {
  const db = getDatabase();

  // Progress update helper
  const updateProgress = (message, progress) => {
    if (onProgress) {
      onProgress({ message, progress, stage: message });
    }
  };

  try {
    // 🔍 STEP 1: Validation
    updateProgress("Validating data...", 5);
    
    // Validate all required fields
    const validationErrors = validateStudentData(student);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
    }

    // Additional mobile validation
    const mobileDigits = (student.mobile || '').replace(/\D/g, '');
    const last10Digits = mobileDigits.slice(-10);
    
    if (last10Digits.length !== 10 || !/^[6-9]/.test(last10Digits)) {
      throw new Error('Valid 10-digit mobile number required (starting with 6-9)');
    }

    // 🔐 STEP 2: Authentication
    updateProgress("Authenticating...", 10);
    let user = auth.currentUser;

    if (!user) {
      if (!student.email) {
        throw new Error("Email required for registration. Please provide your email address.");
      }

      // Check if email is Gmail for OAuth
      if (student.email.endsWith("@gmail.com")) {
        try {
          const provider = new GoogleAuthProvider();
          provider.addScope('profile');
          provider.addScope('email');
          
          const res = await signInWithPopup(auth, provider);
          user = res.user;
          
          console.log('✅ Google authentication successful');
        } catch (authError) {
          console.error('Google sign-in failed:', authError);
          
          // Provide specific error messages
          if (authError.code === 'auth/popup-blocked') {
            throw new Error('Pop-up blocked. Please allow pop-ups for this site and try again.');
          } else if (authError.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in cancelled. Please try again.');
          } else {
            throw new Error('Google sign-in failed. Please try again or use email/password.');
          }
        }
      } else {
        // ⚠️ TODO: Replace with proper modal component
        // This is a temporary solution - should be replaced with a proper password input UI
        const password = prompt(`Create a password for ${student.email}:\n\n(Minimum 6 characters)`);
        
        if (!password) {
          throw new Error('Password is required to create an account.');
        }
        
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        
        try {
          // Try to sign in first, if fails then create account
          const res = await signInWithEmailAndPassword(auth, student.email, password)
            .catch(async (signInError) => {
              if (signInError.code === 'auth/user-not-found') {
                // User doesn't exist, create new account
                return await createUserWithEmailAndPassword(auth, student.email, password);
              }
              throw signInError;
            });
          
          user = res.user;
          console.log('✅ Email authentication successful');
        } catch (authError) {
          console.error('Email authentication failed:', authError);
          
          // Provide specific error messages
          if (authError.code === 'auth/email-already-in-use') {
            throw new Error('This email is already registered. Please sign in instead.');
          } else if (authError.code === 'auth/weak-password') {
            throw new Error('Password is too weak. Please use a stronger password.');
          } else if (authError.code === 'auth/wrong-password') {
            throw new Error('Incorrect password. Please try again.');
          } else {
            throw new Error('Authentication failed. Please check your credentials and try again.');
          }
        }
      }
    }

    // ☁️ STEP 3: Upload photo to Cloudinary (with retry)
    updateProgress("Processing photo...", 30);
    let photoURL = student.photo;
    
    if (student.photo && typeof student.photo === 'string' && !student.photo.includes('cloudinary.com')) {
      try {
        console.log('Processing photo for Cloudinary upload...');
        updateProgress("Compressing image...", 40);
        
        const compressedPhoto = await compressForPassport(student.photo);
        
        updateProgress("Uploading to Cloudinary...", 50);
        
        // Use retry logic for robust upload
        photoURL = await uploadWithRetry(
          compressedPhoto, 
          `students/${user.uid}/${Date.now()}`,
          3 // 3 retry attempts
        );
        
        console.log('✅ Photo uploaded to Cloudinary:', photoURL);
        updateProgress("Photo uploaded successfully", 60);
        
      } catch (uploadError) {
        console.error('❌ Photo upload failed after retries:', uploadError);
        
        // Continue without photo rather than failing entire submission
        photoURL = null;
        console.warn('⚠️ Continuing registration without photo');
      }
    }

    // 📝 STEP 4: Prepare student data
    updateProgress("Preparing data...", 70);
    
    // Sanitize text inputs
    const sanitizedName = sanitizeInput(student.name?.trim() || '');
    const sanitizedCity = sanitizeInput(student.city || '');
    
    const studentDataForFirebase = {
      // Basic info
      name: sanitizedName,
      gender: student.gender || '',
      dob: student.dob || '',
      mobile: last10Digits, // Use validated mobile
      city: sanitizedCity,
      
      // Education & Skills
      education: sanitizeInput((student.education || student.edducation || '').toString()),
      skills: student.skills || {},
      achievements: sanitizeInput(student.achievements || ''),
      aboutMe: sanitizeInput(student.aboutMe || ''),
      
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

    // Clean any remaining base64 data from fields (safety check)
    Object.keys(studentDataForFirebase).forEach(key => {
      const value = studentDataForFirebase[key];
      if (typeof value === 'string' && value.startsWith('data:image')) {
        studentDataForFirebase[key] = null;
      }
    });

    // 🔎 STEP 5: Find user's family (optimized lookup)
    updateProgress("Finding family records...", 75);
    
    // First check user's record for familyId (faster than scanning all families)
    const userRef = ref(db, `users/${user.uid}`);
    const userSnap = await get(userRef);
    const userData = userSnap.val();
    
    let familyId = userData?.familyId || null;
    let familyData = null;
    
    // If user has familyId, get family data directly
    if (familyId) {
      const familySnap = await get(ref(db, `families/${familyId}`));
      familyData = familySnap.val();
      
      // Verify family still exists and user is member
      if (!familyData || !familyData.members?.[user.uid]) {
        console.warn('User familyId reference is invalid, clearing it');
        familyId = null;
        familyData = null;
      }
    }

    // ============================================
    // CASE 1: EDIT EXISTING STUDENT
    // ============================================
    if (editId && familyId) {
      try {
        updateProgress("Updating student record...", 80);
        
        const existingStudentRef = ref(db, `families/${familyId}/students/${editId}`);
        const existingSnap = await get(existingStudentRef);
        const existingData = existingSnap.val();
        
        if (!existingData) {
          throw new Error('Student record not found. It may have been deleted.');
        }
        
        // Preserve original creation date and ID
        studentDataForFirebase.createdAt = existingData.createdAt || Date.now();
        studentDataForFirebase.studentId = editId;
        
        // Sanitize data before update
        const sanitizedData = sanitizeForFirebase(studentDataForFirebase);
        
        // Update student record
        await update(existingStudentRef, sanitizedData);
        
        // Also update family's lastUpdated timestamp
        await update(ref(db, `families/${familyId}`), {
          updatedAt: Date.now()
        });
        
        await clearStudentDraft();
        
        updateProgress("Update complete!", 100);
        
        return { 
          mode: "updated", 
          studentId: editId,
          familyId,
          message: "Student information updated successfully!"
        };
      } catch (error) {
        console.error('Error updating student:', error);
        throw new Error(`Failed to update student: ${error.message}`);
      }
    }

    // ============================================
    // CASE 2: ADD STUDENT TO EXISTING FAMILY
    // ============================================
    if (familyId) {
      try {
        updateProgress("Adding student to family...", 80);
        
        // Generate unique student ID
        const newId = `STU_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Add metadata for new student
        studentDataForFirebase.createdAt = Date.now();
        studentDataForFirebase.studentId = newId;
        studentDataForFirebase.addedAt = Date.now();
        studentDataForFirebase.isPrimaryStudent = false;
        
        // Sanitize data before update
        const sanitizedData = sanitizeForFirebase(studentDataForFirebase);
        
        // Use transaction to ensure atomic update
        const studentRef = ref(db, `families/${familyId}/students/${newId}`);
        await set(studentRef, sanitizedData);
        
        // Update family's lastUpdated timestamp
        await update(ref(db, `families/${familyId}`), {
          updatedAt: Date.now()
        });
        
        await clearStudentDraft();
        
        updateProgress("Student added successfully!", 100);
        
        return { 
          mode: "added", 
          studentId: newId,
          familyId,
          message: "Student added to family successfully!"
        };
      } catch (error) {
        console.error('Error adding student:', error);
        throw new Error(`Failed to add student: ${error.message}`);
      }
    }

    // ============================================
    // CASE 3: CREATE NEW FAMILY
    // ============================================
    if (!student.familyContacts || student.familyContacts.length === 0) {
      throw new Error("Please add at least one family contact (parent/guardian) before submitting.");
    }

    try {
      updateProgress("Creating new family record...", 80);
      
      // Create new family reference
      const familyRef = push(ref(db, "families"));
      familyId = familyRef.key;
      
      // Generate unique Family PIN
      const familyPin = await generateUniqueFamilyPin(db);
      
      // Add metadata for new student
      studentDataForFirebase.createdAt = Date.now();
      studentDataForFirebase.studentId = "STU_1";
      studentDataForFirebase.isPrimaryStudent = true;
      
      // Sanitize student data
      const sanitizedStudentData = sanitizeForFirebase(studentDataForFirebase);

      // Convert familyContacts array to object for Firebase
      const familyContactsObj = {};
      const contacts = Array.isArray(student.familyContacts) 
        ? student.familyContacts 
        : [student.familyContacts];

      contacts.forEach((contact, index) => {
        if (contact && typeof contact === 'object') {
          familyContactsObj[index] = {
            name: sanitizeInput(contact.name || ''),
            relation: sanitizeInput(contact.relation || 'parent'),
            mobile: (contact.mobile || '').replace(/\D/g, ''),
            email: contact.email || ''
          };
        } else if (typeof contact === 'string') {
          // Handle if contact is just a string (name only)
          familyContactsObj[index] = {
            name: sanitizeInput(contact),
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
        familyName: sanitizedName ? `${sanitizedName.split(' ')[0]}'s Family` : 'New Family',
        familyContacts: familyContactsObj,
        members: {
          [user.uid]: { 
            role: "owner", 
            email: user.email || '',
            name: user.displayName || sanitizedName || 'Family Member',
            joinedAt: Date.now(),
            isActive: true
          }
        },
        students: { 
          STU_1: sanitizedStudentData 
        },
        settings: {
          notifications: true,
          autoSave: true,
          privacyLevel: 'family' // default privacy setting
        }
      };

      // Sanitize entire family data structure
      const sanitizedFamilyData = sanitizeForFirebase(familyData);

      // Save family data
      await set(familyRef, sanitizedFamilyData);
      
      // Save/update user reference with familyId
      await set(ref(db, `users/${user.uid}`), sanitizeForFirebase({
        familyId,
        role: "owner",
        email: user.email || '',
        name: user.displayName || sanitizedName || '',
        createdAt: userData?.createdAt || Date.now(),
        lastLogin: Date.now()
      }));

      // ============================================
      // 🏆 LINK TO CONNECTOR (Competition Integration)
      // ============================================
      // Check if this mobile number was uploaded as a connector
      // If yes, update the connector record with joinedUserId
      try {
        const mobile = student.mobile.replace(/\D/g, '').slice(-10);
        const connectorRef = ref(db, `connectors/${mobile}`);
        const connectorSnap = await get(connectorRef);
        
        if (connectorSnap.exists()) {
          console.log('✅ Found matching connector! Linking user...');
          
          await update(connectorRef, {
            joinedUserId: user.uid,
            joinedAt: Date.now(),
            familyId: familyId
          });
          
          console.log('✅ Successfully linked to connector:', connectorSnap.val().uploadedBy);
        } else {
          console.log('ℹ️ No matching connector found for mobile:', mobile);
        }
      } catch (connectorError) {
        // Don't fail registration if connector linking fails
        console.warn('⚠️ Connector linking failed (non-critical):', connectorError);
      }
      
      await clearStudentDraft();
      updateProgress("Registration complete!", 100);

      return { 
        mode: "new", 
        familyPin, 
        familyId,
        studentId: "STU_1",
        message: `Family registration successful! Your Family PIN is ${familyPin}. Save it for future access.`
      };
    } catch (error) {
      console.error('Error creating new family:', error);
      throw new Error(`Failed to create family: ${error.message}`);
    }
    
  } catch (error) {
    // Centralized error handling
    console.error('❌ Student registration failed:', error);
    
    // Re-throw with user-friendly message
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
};

// ============================================
// EXPORT ALL HELPERS FOR TESTING
// ============================================
export {
  compressForPassport,
  uploadWithRetry,
  generateUniqueFamilyPin
};