export const getCroppedImg = (imageSrc, croppedAreaPixels, rotation = 0) => {
  const canvas = document.createElement("canvas");
  const image = new Image();

  image.src = imageSrc;

  return new Promise((resolve) => {
    image.onload = () => {
      const ctx = canvas.getContext("2d");

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.save();

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      ctx.restore();

      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
  });
};