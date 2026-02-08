export default function StudentPaperPhoto({ photo, onChange }) {
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <label className="w-28 h-32 border-2 border-black flex items-center justify-center text-xs cursor-pointer">
      {photo ? (
        <img src={photo} className="object-cover w-full h-full" />
      ) : (
        "Passport Photo. (Tap to upload)" 
      )}
      <input type="file" accept="image/*" hidden onChange={handlePhoto} />
    </label>
  );
}
