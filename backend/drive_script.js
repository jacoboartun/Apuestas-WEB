/**
 * AETHERIS CASINO - Google Drive (Apps Script) Backend
 * 
 * INSTRUCCIONES PARA EL USUARIO:
 * 1. Ve a https://script.google.com/ y haz clic en "Nuevo proyecto".
 * 2. Borra todo el código que aparece por defecto.
 * 3. Copia y pega TODO el código de abajo.
 * 4. Arriba a la derecha, haz clic en "Implementar" -> "Nueva implementación".
 * 5. Tipo: "Aplicación web".
 * 6. Ejecutar como: "Yo (tu_correo@gmail.com)".
 * 7. Quién tiene acceso: "Cualquier persona".
 * 8. Haz clic en "Implementar" (te pedirá permisos de Drive, acéptalos).
 * 9. Copia la "URL de la aplicación web" que te genera al final.
 * 10. Pega esa URL en el archivo `js/state.js` en la variable `DRIVE_APP_URL`.
 */

const FILE_NAME = 'aetheris_db.json';

function getOrCreateFile() {
  const iter = DriveApp.getFilesByName(FILE_NAME);
  if (iter.hasNext()) {
    return iter.next();
  } else {
    // Si no existe, lo crea con un objeto vacío
    return DriveApp.createFile(FILE_NAME, '{}', MimeType.PLAIN_TEXT);
  }
}

// Se ejecuta cuando el frontend hace una petición GET para leer la base de datos
function doGet(e) {
  try {
    const file = getOrCreateFile();
    const data = file.getBlob().getDataAsString();
    return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Se ejecuta cuando el frontend hace una petición POST para guardar (sobrescribir) la base de datos
function doPost(e) {
  try {
    const postContent = e.postData.contents;
    
    // Check if it's a JSON action (like sendCode)
    try {
      const jsonRequest = JSON.parse(postContent);
      if (jsonRequest.action === 'sendCode') {
        const { email, code, type } = jsonRequest;
        const asunto = type === 'register' ? 'Aetheris Casino - Código de Registro' : 'Aetheris Casino - Recuperación de Contraseña';
        const mensaje = `Tu código de verificación de 4 dígitos es: ${code}\n\nSi no solicitaste este código, ignora este mensaje.`;
        MailApp.sendEmail(email, asunto, mensaje);
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } catch(err) {
      // If it's not a valid JSON with an action, assume it's the raw state dump to save
    }

    const file = getOrCreateFile();
    // Reemplaza el contenido del archivo con lo que manda el frontend
    file.setContent(postContent);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Para permitir solicitudes CORS (necesario para fetch desde el navegador)
function doOptions(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}
