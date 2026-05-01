const db = require('../config/db');
const bcrypt = require('bcryptjs');
const emailService = require('../config/emailService');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const registerCitizen = async (req, res) => {
    const { nombre, apellido, email, password, provincia, ciudad, zona, acceptTerms } = req.body;
    try {
        // Verificar si el usuario existe
        const [existing] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Iniciar transacción
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const [userResult] = await connection.query(
                `INSERT INTO usuarios (email, password, email_verified, verification_code, verification_expires, auth_provider, activo)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [email, hashedPassword, false, otp, expiresAt, 'local', true]
            );

            const userId = userResult.insertId;

            await connection.query(
                `INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, nombre, apellido, provincia, ciudad, zona]
            );

            await connection.commit();
            
            // Enviar email
            await emailService.enviarCodigoVerificacion(email, otp);

            res.status(201).json({ message: 'Usuario registrado. Por favor verifica tu email.' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al registrar ciudadano' });
    }
};

const registerInstitution = async (req, res) => {
    const { contactName, email, password, institutionName, cuit, institutionType, phone, provincia, ciudad, zona, address, termsAccepted } = req.body;

    try {
        const [existing] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const [userResult] = await connection.query(
                `INSERT INTO usuarios (email, password, email_verified, verification_code, verification_expires, auth_provider, activo)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [email, hashedPassword, false, otp, expiresAt, 'local', true]
            );

            const userId = userResult.insertId;

            await connection.query(
                `INSERT INTO instituciones (id_usuario, contactName, institutionName, cuit, institutionType, phone, provincia, ciudad, zona, address, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, contactName, institutionName, cuit, institutionType, phone, provincia, ciudad, zona, address, 'pending']
            );

            await connection.commit();

            await emailService.enviarCodigoVerificacion(email, otp);

            res.status(201).json({ message: 'Institución registrada. Por favor verifica el email.' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al registrar institución' });
    }
};

const verifyEmail = async (req, res) => {
    const { email, code } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];

        if (user.email_verified) {
            return res.status(400).json({ error: 'El email ya está verificado' });
        }

        if (user.verification_code !== code) {
            return res.status(400).json({ error: 'Código inválido' });
        }

        if (new Date() > new Date(user.verification_expires)) {
            return res.status(400).json({ error: 'El código ha expirado' });
        }

        await db.query(
            'UPDATE usuarios SET email_verified = ?, verification_code = NULL, verification_expires = NULL WHERE id = ?',
            [true, user.id]
        );

        res.status(200).json({ message: 'Email verificado correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al verificar email' });
    }
};

const resendCode = async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];

        if (user.email_verified) {
            return res.status(400).json({ error: 'El email ya está verificado' });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            'UPDATE usuarios SET verification_code = ?, verification_expires = ? WHERE id = ?',
            [otp, expiresAt, user.id]
        );

        await emailService.enviarCodigoVerificacion(email, otp);

        res.status(200).json({ message: 'Nuevo código enviado' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al reenviar código' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        const user = users[0];
        
        // Verifica si está activo
        if (!user.activo) return res.status(403).json({ error: 'Cuenta deshabilitada' });

        // Verifica password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

        // Identificar rol
        let userType = user.tipo_usuario || 'usuario';
        const userId = user.id || user.id_usuario;
        
        const [cit] = await db.query('SELECT id FROM ciudadanos WHERE id_usuario = ?', [userId]);
        if (cit.length > 0) userType = 'citizen';
        else {
            const [inst] = await db.query('SELECT id FROM instituciones WHERE id_usuario = ?', [userId]);
            if (inst.length > 0) userType = 'institution';
        }

        // Generar tokens
        const jwt = require('jsonwebtoken');
        const accessToken = jwt.sign(
            { id: userId, email: user.email, role: userType },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: userId, email: user.email, role: userType },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Guardar refresh token en BD
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.query(
            'INSERT INTO refresh_tokens (token, id_usuario, user_type, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
            [refreshToken, userId, userType, expiresAt]
        );

        res.status(200).json({
            message: 'Login exitoso',
            accessToken,
            refreshToken,
            user: {
                id: userId,
                email: user.email,
                role: userType,
                email_verified: user.email_verified
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al intentar iniciar sesión' });
    }
};

const refreshToken = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Refresh token es requerido' });

    try {
        // Verificar en BD
        const [tokens] = await db.query('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
        if (tokens.length === 0) return res.status(403).json({ error: 'Refresh token inválido' });

        const dbToken = tokens[0];
        if (new Date() > new Date(dbToken.expires_at)) {
            await db.query('DELETE FROM refresh_tokens WHERE id = ?', [dbToken.id]);
            return res.status(403).json({ error: 'Refresh token expirado' });
        }

        const jwt = require('jsonwebtoken');
        // Verificar firma JWT
        jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Refresh token no válido' });

            // Nuevo access token
            const newAccessToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            res.json({ accessToken: newAccessToken });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al refrescar token' });
    }
};

const logout = async (req, res) => {
    const { token } = req.body;
    try {
        if (token) {
            await db.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
        }
        res.status(200).json({ message: 'Sesión cerrada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
};

module.exports = {
    registerCitizen,
    registerInstitution,
    verifyEmail,
    resendCode,
    login,
    refreshToken,
    logout
};
