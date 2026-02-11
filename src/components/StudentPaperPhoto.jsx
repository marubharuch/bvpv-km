import { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function StudentPaperPhoto({ photo, onChange, isEditMode = false }) {
  const [showOptions, setShowOptions] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Passport aspect ratio (1:1 square)
  const ASPECT_RATIO = 1;
  const MIN_WIDTH = 300;
  const MAX_WIDTH = 600;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { // Increased to 5MB for better quality
      alert("File size should be less than 5MB");
      return;
    }
    
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result);
      setShowCrop(true);
      setShowOptions(false);
    });
    reader.readAsDataURL(file);
  };

  const openCamera = () => {
    const cameraInput = document.createElement('input');
    cameraInput.type = 'file';
    cameraInput.accept = 'image/*';
    cameraInput.capture = 'user';
    cameraInput.onchange = handleFileSelect;
    cameraInput.click();
    setShowOptions(false);
  };

  const openGallery = () => {
    fileInputRef.current.click();
    setShowOptions(false);
  };

  const handlePhotoClick = () => {
    if (photo && isEditMode) {
      if (window.confirm("Replace current photo?")) {
        setShowOptions(true);
      }
    } else {
      setShowOptions(true);
    }
  };

  // Initialize crop with passport aspect ratio
  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    
    // Calculate crop to center face area
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: 'px',
          width: Math.min(width, MAX_WIDTH),
          height: Math.min(height, MAX_WIDTH),
        },
        ASPECT_RATIO,
        width,
        height
      ),
      width,
      height
    );
    
    setCrop(crop);
  };

  // Generate cropped image
  const getCroppedImg = () => {
    if (!completedCrop || !imgRef.current) {
      return;
    }

    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    // Convert to base64 with passport-optimized settings
    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    return base64Image;
  };

  const handleCropComplete = () => {
    const croppedImage = getCroppedImg();
    
    if (croppedImage) {
      if (isEditMode && photo) {
        if (window.confirm("Do you want to replace the existing photo?")) {
          onChange(croppedImage);
        }
      } else {
        onChange(croppedImage);
      }
    }
    
    // Reset crop state
    setShowCrop(false);
    setImgSrc(null);
    setCrop(null);
    setCompletedCrop(null);
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setImgSrc(null);
    setCrop(null);
    setCompletedCrop(null);
  };

  return (
    <div className="text-center relative">
      {/* Photo Display Area */}
      <div 
        className={`w-28 h-32 ${photo ? 'border-2 border-blue-500' : 'border-2 border-dashed border-gray-400'} flex items-center justify-center text-xs cursor-pointer mx-auto relative group`}
        onClick={handlePhotoClick}
      >
        {photo ? (
          <>
            <img 
              src={photo} 
              className="object-cover w-full h-full" 
              alt="Student" 
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200">
              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to Change
              </span>
            </div>
          </>
        ) : (
          <div className="text-center p-2">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-gray-600">Add Photo</span>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {showCrop && imgSrc && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-800 text-center">
                Crop Your Photo
              </h3>
              <p className="text-sm text-gray-600 text-center mt-1">
                Adjust the crop area to include face (passport format)
              </p>
            </div>
            
            <div className="p-4 bg-gray-900 flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={ASPECT_RATIO}
                minWidth={MIN_WIDTH}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[60vh] w-auto object-contain"
                />
              </ReactCrop>
            </div>
            
            <div className="p-4 bg-gray-50 border-t">
              {/* Guidelines */}
              <div className="mb-4 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
                    <span>1:1 Square (Passport)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v1h12V5a1 1 0 00-1-1H5zM4 8v6a1 1 0 001 1h10a1 1 0 001-1V8H4z" clipRule="evenodd" />
                    </svg>
                    <span>Keep face centered</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCropCancel}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropComplete}
                  disabled={!completedCrop}
                  className={`flex-1 py-3 rounded-lg font-medium text-white transition-colors ${
                    completedCrop 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Options Modal */}
      {showOptions && !showCrop && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-xs overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-800 text-center">Select Photo Source</h3>
            </div>
            
            <div className="divide-y">
              <button
                onClick={openCamera}
                className="w-full p-4 flex items-center gap-3 hover:bg-blue-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium">Take Photo</p>
                  <p className="text-xs text-gray-500">Use camera to capture new photo</p>
                </div>
              </button>
              
              <button
                onClick={openGallery}
                className="w-full p-4 flex items-center gap-3 hover:bg-green-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium">Choose from Gallery</p>
                  <p className="text-xs text-gray-500">Select existing photo from device</p>
                </div>
              </button>
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={() => setShowOptions(false)}
                className="w-full py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        hidden 
        onChange={handleFileSelect} 
      />
      
      {/* Status text */}
      <div className="mt-2">
        {photo ? (
          <p className="text-xs text-green-600">
            ✓ Photo added. <span className="text-blue-600 cursor-pointer" onClick={handlePhotoClick}>Change</span>
          </p>
        ) : (
          <p className="text-xs text-gray-600">
            <span className="text-red-600 font-medium">Required</span> • Tap to add photo
          </p>
        )}
        
        <p className="text-xs text-gray-400 mt-1">
          JPG or PNG, max 5MB • Passport format (1:1)
        </p>
      </div>
    </div>
  );
}