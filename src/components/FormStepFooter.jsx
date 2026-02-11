export default function FormStepFooter({ onNext, onSkip, onBack, showSkip = true }) {
  return (
    <div className="flex justify-between items-center mt-4 pt-3 border-t">
      
      <div className="flex gap-3">
        {onBack && (
          <button onClick={onBack} className="text-gray-500">
            Back
          </button>
        )}  

        {showSkip && (
          <button onClick={onSkip || onNext} className="text-gray-500">
            Next
          </button>
        )}
      </div>

      <button onClick={onNext} className="bg-green-600 text-white px-4 py-2 rounded">
        Save & Continue
      </button>
    </div>
  );
}
