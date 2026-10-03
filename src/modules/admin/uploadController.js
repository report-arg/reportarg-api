const cloudinary = require('../../config/cloudinary');

const uploadController = {
  async subirFoto(req, res, next) {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        const error = new Error('Falta configurar Cloudinary en el servidor (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
        error.status = 500;
        throw error;
      }

      if (!req.file) {
        return res.status(400).json({ ok: false, mensaje: 'No se recibió ningún archivo' });
      }

      // Subir a Cloudinary desde buffer
      const resultado = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'reportarg/usuarios', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      res.json({ ok: true, url: resultado.secure_url });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = uploadController;