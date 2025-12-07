const nodemailer = require('nodemailer');

// Configuración del transportador de nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'abdelbarbaebay@gmail.com',
        pass: 'upfo nxxm uaqk bifh' // App password
    }
});

/**
 * Envía un correo de confirmación de cita al paciente
 * @param {Object} datosCita - Datos de la cita
 * @param {string} datosCita.correoPaciente - Email del paciente
 * @param {string} datosCita.nombrePaciente - Nombre completo del paciente
 * @param {string} datosCita.nombreMedico - Nombre completo del médico
 * @param {string} datosCita.especialidad - Especialidad médica
 * @param {string} datosCita.fecha - Fecha de la cita (YYYY-MM-DD)
 * @param {string} datosCita.hora - Hora de la cita (HH:MM:SS)
 * @param {string} datosCita.tipoAccion - 'creada' o 'reagendada'
 */
async function enviarCorreoCita(datosCita) {
    const { correoPaciente, nombrePaciente, nombreMedico, especialidad, fecha, hora, tipoAccion } = datosCita;
    
    // Formatear la fecha
    const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Formatear la hora (solo HH:MM)
    const horaFormateada = hora.substring(0, 5);
    
    const titulo = tipoAccion === 'reagendada' ? 'Cita Reagendada' : 'Confirmación de Cita';
    const mensaje = tipoAccion === 'reagendada' 
        ? 'Tu cita ha sido reagendada exitosamente.'
        : 'Tu cita ha sido agendada exitosamente.';

    const mailOptions = {
        from: '"SCAH - Sistema de Citas" <abdelbarbaebay@gmail.com>',
        to: correoPaciente,
        subject: `${titulo} - SCAH`,
        html: `
            <div style="font-family: 'Questrial', Arial, sans-serif; color: #333; background: #f9fafb; padding: 24px; border-radius: 8px; border: 1px solid #e0e0e0; max-width: 600px;">
                <h2 style="color: #004f98; margin-top: 0;">${titulo}</h2>
                <p>Hola <strong>${nombrePaciente}</strong>,</p>
                <p>${mensaje}</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2d93d5;">
                    <h3 style="color: #004f98; margin-top: 0;">Detalles de tu cita:</h3>
                    <p style="margin: 8px 0;"><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
                    <p style="margin: 8px 0;"><strong>🕐 Hora:</strong> ${horaFormateada}</p>
                    <p style="margin: 8px 0;"><strong>👨‍⚕️ Médico:</strong> ${nombreMedico}</p>
                    <p style="margin: 8px 0;"><strong>🏥 Especialidad:</strong> ${especialidad}</p>
                </div>
                
                <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;"><strong>⚠️ Recordatorios importantes:</strong></p>
                    <ul style="margin: 8px 0; padding-left: 20px; color: #856404;">
                        <li>Llega 15 minutos antes de tu cita</li>
                        <li>Trae tu cédula de identidad</li>
                        <li>Si necesitas cancelar, hazlo con al menos 24 horas de anticipación</li>
                    </ul>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 24px;">
                    Si tienes alguna pregunta o necesitas reprogramar tu cita, por favor contacta a nuestro equipo.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
                
                <p style="color: #999; font-size: 12px; margin: 0;">
                    Este es un correo automático, por favor no responder.<br>
                    <strong>SCAH - Sistema de Citas de Atención en Salud</strong>
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo de cita ${tipoAccion} enviado a: ${correoPaciente}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error al enviar correo de cita:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Envía un correo con código de verificación para registro
 * @param {Object} datosVerificacion - Datos para verificación
 * @param {string} datosVerificacion.correo - Email del usuario
 * @param {string} datosVerificacion.nombre - Nombre completo del usuario
 * @param {string} datosVerificacion.codigo - Código de verificación de 6 dígitos
 */
async function enviarCorreoVerificacion(datosVerificacion) {
    const { correo, nombre, codigo } = datosVerificacion;

    const mailOptions = {
        from: '"SCAH - Sistema de Citas" <abdelbarbaebay@gmail.com>',
        to: correo,
        subject: 'Verifica tu cuenta - SCAH',
        html: `
            <div style="font-family: 'Questrial', Arial, sans-serif; color: #333; background: #f9fafb; padding: 24px; border-radius: 8px; border: 1px solid #e0e0e0; max-width: 600px;">
                <h2 style="color: #004f98; margin-top: 0;">Verifica tu cuenta</h2>
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Gracias por registrarte en <strong>SCAH</strong>. Para completar tu registro, por favor utiliza el siguiente código de verificación:</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #2d93d5;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Código de Verificación:</p>
                    <h1 style="margin: 0; color: #004f98; font-size: 36px; letter-spacing: 8px; font-family: 'Courier New', monospace;">${codigo}</h1>
                </div>
                
                <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;"><strong>⚠️ Importante:</strong></p>
                    <ul style="margin: 8px 0; padding-left: 20px; color: #856404;">
                        <li>Este código expirará en <strong>1 hora</strong></li>
                        <li>No compartas este código con nadie</li>
                        <li>Si no solicitaste este registro, ignora este correo</li>
                    </ul>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 24px;">
                    Una vez que ingreses el código, tu cuenta será activada y podrás comenzar a agendar tus citas médicas.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
                
                <p style="color: #999; font-size: 12px; margin: 0;">
                    Este es un correo automático, por favor no responder.<br>
                    <strong>SCAH - Sistema de Citas de Atención en Salud</strong>
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo de verificación enviado a: ${correo}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error al enviar correo de verificación:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    enviarCorreoCita,
    enviarCorreoVerificacion
};
