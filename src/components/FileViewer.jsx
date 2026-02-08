export default function FileViewer({ files, index, close, next, prev }) {
  const file = files[index];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">

      {/* Transparent background */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />

      {/* Viewer Box */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-[95vw] max-h-[95vh] p-2 flex items-center justify-center">

        <button
          onClick={close}
          className="absolute -top-3 -right-3 bg-red-600 text-white w-8 h-8 rounded-full"
        >
          ✕
        </button>

        {file.type === "image" ? (
          <img
            src={file.url}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        ) : (
          <iframe
            src={file.url}
            title="PDF"
            className="w-[80vw] h-[85vh] rounded"
          />
        )}

        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 text-black text-3xl"
          >
            ⬅
          </button>
        )}

        {index < files.length - 1 && (
          <button
            onClick={next}
            className="absolute right-2 text-black text-3xl"
          >
            ➡
          </button>
        )}
      </div>
    </div>
  );
}
