const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar conexión al iniciar
transporter.verify((err, success) => {
  if (err) {
    console.error('Error conectando al servicio de email:', err.message);
  } else {
    console.log('Servicio de email conectado correctamente');
  }
});

const emailService = {

  async enviarConfirmacion(email, token) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: 'Confirmá tu cuenta en ReportARG',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2D3A8C; margin-bottom: 8px;">Bienvenido a ReportARG</h2>
          <p style="color: #666; font-size: 14px;">Gracias por registrarte. Confirmá tu cuenta haciendo click en el botón de abajo.</p>
          <a href="${url}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #2D3A8C; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Confirmar cuenta
          </a>
          <p style="color: #aaa; font-size: 12px;">Si no creaste una cuenta en ReportARG, ignorá este mensaje.</p>
          <p style="color: #aaa; font-size: 12px;">Este link expira en 24 horas.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 11px;">ReportARG — Sistema de Reportes Ciudadanos</p>
        </div>
      `,
    });
  },

  async enviarBienvenida(email, nombre) {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: 'Tu cuenta en ReportARG fue creada',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2D3A8C; margin-bottom: 8px;">Hola ${nombre}</h2>
          <p style="color: #666; font-size: 14px;">Tu cuenta en ReportARG fue creada exitosamente por un administrador.</p>
          <p style="color: #666; font-size: 14px;">Ya podés ingresar al sistema con tu email registrado.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #2D3A8C; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Ingresar a ReportARG
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 11px;">ReportARG — Sistema de Reportes Ciudadanos</p>
        </div>
      `,
    });
  },

  async enviarRechazoInstitucion(email, nombreInstitucion, motivo) {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: 'Actualización sobre la verificación de tu institución en ReportARG',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2D3A8C; margin-bottom: 8px;">Hola, ${nombreInstitucion}</h2>
          <p style="color: #666; font-size: 14px;">Lamentamos informarte que la verificación de tu institución no fue aprobada.</p>
          <div style="background: #fff8e1; border-left: 4px solid #f5c842; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #7a6000;"><strong>Motivo:</strong> ${motivo}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Si creés que hubo un error, podés contactarnos respondiendo este email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 11px;">ReportARG — Sistema de Reportes Ciudadanos</p>
        </div>
      `,
    });
  },

  async enviarAprobacionInstitucion(email, nombreInstitucion) {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: '¡Tu institución fue verificada en ReportARG!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2D3A8C; margin-bottom: 8px;">¡Felicitaciones, ${nombreInstitucion}!</h2>
          <p style="color: #666; font-size: 14px;">Tu institución fue verificada exitosamente en ReportARG.</p>
          <p style="color: #666; font-size: 14px;">A partir de ahora podés publicar comunicados, organizar eventos y participar activamente en la plataforma.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #2D3A8C; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Ingresar a ReportARG
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 11px;">ReportARG — Sistema de Reportes Ciudadanos</p>
        </div>
      `,
    });
  },

};

module.exports = emailService;