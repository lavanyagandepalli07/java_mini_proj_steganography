export async function generateLsbMask(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      
      // Extract LSB from RGB and amplify to 255
      for (let i = 0; i < data.length; i += 4) {
        // Red
        data[i] = (data[i] & 1) ? 255 : 0;
        // Green
        data[i+1] = (data[i+1] & 1) ? 255 : 0;
        // Blue
        data[i+2] = (data[i+2] & 1) ? 255 : 0;
        // Keep Alpha unchanged
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create LSB mask blob'));
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the selected image.'));
    };

    img.src = objectUrl;
  });
}
