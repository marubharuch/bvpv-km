// src/services/cloudinaryService.js
// src/services/cloudinaryService.js
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dv6wequla';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'bvpvkm';
const API_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

console.log('Cloudinary Config:', { CLOUD_NAME, UPLOAD_PRESET });

/**
 * Upload image to Cloudinary (unsigned upload)
 */
export const uploadToCloudinary = async (file, folder = 'student-photos') => {
  try {
    // Validate configuration
    if (!CLOUD_NAME) {
      throw new Error('Cloudinary Cloud Name is missing');
    }
    
    if (!UPLOAD_PRESET) {
      throw new Error('Cloudinary Upload Preset is missing');
    }

    console.log('Starting upload to Cloudinary...', { CLOUD_NAME, UPLOAD_PRESET, folder });

    let imageFile = file;
    
    // Handle base64 string
    if (typeof file === 'string' && file.startsWith('data:image')) {
      console.log('Converting base64 to file...');
      imageFile = await base64ToFile(file);
    }
    
    // Validate file
    if (!imageFile) {
      throw new Error('No file provided');
    }
    
    if (!(imageFile instanceof File || imageFile instanceof Blob)) {
      throw new Error('Invalid file type');
    }

    // Prepare form data for unsigned upload
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    // Optional: Add folder
    if (folder) {
      formData.append('folder', folder);
    }
    
    // Optional: Add tags for organization
    formData.append('tags', 'student,profile,photo');
    
    // Optional: Add transformation for optimization
    // formData.append('transformation', 'c_fill,g_face,w_500,h_500,q_auto:good');

    console.log('Uploading...', {
      fileSize: imageFile.size,
      fileType: imageFile.type,
      fileName: imageFile.name || 'student-photo'
    });

    // Upload to Cloudinary
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed with response:', errorText);
      
      // Try to parse error message
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || `Upload failed: ${response.status}`);
      } catch (e) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    
    console.log('✅ Upload successful!', {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      size: data.bytes,
      width: data.width,
      height: data.height
    });

    return data.secure_url;

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Convert base64 to File object
 */
const base64ToFile = async (base64, filename = 'student-photo.jpg') => {
  try {
    // Extract MIME type
    const match = base64.match(/^data:(.*);base64,/);
    if (!match) {
      throw new Error('Invalid base64 string');
    }
    
    const mimeType = match[1];
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    
    // Decode base64
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    // Create blob and file
    const blob = new Blob([bytes], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
    
  } catch (error) {
    console.error('Base64 conversion error:', error);
    throw new Error('Failed to process image');
  }
};

/**
 * Generate optimized URL for different use cases
 */
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }

  const {
    width = 500,
    height = 500,
    crop = 'fill',
    gravity = 'face',
    quality = 'auto',
    format = 'auto'
  } = options;

  // Build transformation string
  const transformations = [
    `c_${crop}`,
    `g_${gravity}`,
    `w_${width}`,
    `h_${height}`,
    `q_${quality}`,
    `f_${format}`
  ].join(',');

  // Insert into URL
  return insertTransformation(originalUrl, transformations);
};

/**
 * Generate passport-optimized URL from Cloudinary
 */
export const getPassportPhotoUrl = (originalUrl) => {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }

  // Passport-optimized transformations
  const transformations = [
    'c_fill',           // Crop to fill
    'g_face',           // Auto-face detection
    'w_600',            // Width 600px
    'h_600',            // Height 600px
    'q_auto:low',       // Auto quality (optimized for documents)
    'f_jpg',            // Force JPEG (standard for documents)
    'b_white'           // White background
  ].join(',');

  return insertTransformation(originalUrl, transformations);
};

/**
 * Generate thumbnail URL for lists
 */
export const getThumbnailUrl = (originalUrl) => {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }

  const transformations = [
    'c_thumb',
    'g_face',
    'w_100',
    'h_100',
    'q_auto:eco',
    'f_auto'
  ].join(',');

  return insertTransformation(originalUrl, transformations);
};

/**
 * Helper: Insert transformation into Cloudinary URL
 * Replaces any existing transformation
 */
const insertTransformation = (url, transformation) => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find 'upload' in path
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex === -1) return url;
    
    // Remove existing transformation if present
    if (pathParts[uploadIndex + 1] && 
        (pathParts[uploadIndex + 1].includes('w_') || 
         pathParts[uploadIndex + 1].includes('c_'))) {
      pathParts.splice(uploadIndex + 1, 1);
    }
    
    // Insert new transformation
    pathParts.splice(uploadIndex + 1, 0, transformation);
    urlObj.pathname = pathParts.join('/');
    
    return urlObj.toString();
  } catch (error) {
    console.error('Error transforming URL:', error);
    return url;
  }
};

/**
 * Optional: Add more utility functions as needed
 */

/**
 * Generate URL for profile display
 */
export const getProfilePhotoUrl = (originalUrl) => {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }

  const transformations = [
    'c_fill',
    'g_face',
    'w_300',
    'h_300',
    'q_auto:good',
    'f_auto'
  ].join(',');

  return insertTransformation(originalUrl, transformations);
};

/**
 * Generate responsive srcset for different screen sizes
 */
export const getResponsiveSrcSet = (originalUrl) => {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }

  const sizes = [100, 200, 300, 500, 800];
  const srcset = sizes.map(size => {
    const url = insertTransformation(originalUrl, `c_fill,g_face,w_${size},h_${size},q_auto`);
    return `${url} ${size}w`;
  }).join(', ');

  return srcset;
};

/**
 * Get public ID from Cloudinary URL (for potential deletion)
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Skip version number and get public ID
    const publicIdWithExtension = pathParts.slice(uploadIndex + 2).join('/');
    return publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Remove extension
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Optional: Export constants for debugging
export const cloudinaryConfig = {
  cloudName: CLOUD_NAME,
  uploadPreset: UPLOAD_PRESET,
  apiUrl: API_URL
};