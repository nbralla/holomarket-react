/* =========================================================================
   Fotos subidas por quien vende
   ========================================================================= */

/* Solo se muestran como foto las imágenes reducidas por comprimirImagen (data URL). */
export const fotoValida = (img: unknown): img is string =>
  typeof img === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(img);

/* Reduce la foto a 480 px de ancho en JPEG para que ocupe poco espacio en el navegador. */
export function comprimirImagen(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No pudimos leer la imagen. Prueba con otro archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const escala = Math.min(1, 480 / img.width);
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.max(1, Math.round(img.width * escala));
        lienzo.height = Math.max(1, Math.round(img.height * escala));
        const ctx = lienzo.getContext('2d');
        if (!ctx) {
          reject(new Error('Tu navegador no pudo procesar la imagen.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);
        ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
        resolve(lienzo.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}
