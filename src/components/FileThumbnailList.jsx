export default function FileThumbnailList({ files, openViewer }) {
  return (
    <div className="flex gap-2 flex-wrap mt-3">
      {files.map((f, i) => (
        <div key={i} onClick={() => openViewer(i)} className="cursor-pointer">
          {f.type === "image" ? (
            <img src={f.url} className="w-20 h-20 object-cover rounded" />
          ) : (
            <div className="w-20 h-20 bg-gray-200 flex items-center justify-center text-xs rounded">
              PDF
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
