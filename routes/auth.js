const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const router = express.Router();
require('dotenv').config();

// ========================================
// REGISTRO con DNI (exactamente 8 dígitos)
// ========================================
router.post('/register', async (req, res) => {
    const { nombre, email, password, dni } = req.body;

    if (!nombre || !email || !password || !dni) {
        return res.status(400).json({ 
            mensaje: 'Faltan campos: nombre, email, password, dni' 
        });
    }

    // Validar DNI: exactamente 8 dígitos
    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(dni)) {
        return res.status(400).json({ 
            mensaje: 'DNI inválido. Debe tener exactamente 8 dígitos numéricos' 
        });
    }

    try {
        const [existeEmail] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existeEmail.length > 0) {
            return res.status(400).json({ mensaje: 'El email ya está registrado' });
        }

        const [existeDni] = await db.query('SELECT id FROM usuarios WHERE dni = ?', [dni]);
        if (existeDni.length > 0) {
            return res.status(400).json({ mensaje: 'El DNI ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, email, password, dni) VALUES (?, ?, ?, ?)',
            [nombre, email, passwordHash, dni]
        );

        const token = jwt.sign(
            { id: result.insertId, email, rol: 'user' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            token,
            usuario: { id: result.insertId, nombre, email, dni, rol: 'user' }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

// ========================================
// LOGIN con control de intentos
// ========================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: 'Faltan campos: email, password' });
    }

    try {
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }

        const usuario = usuarios[0];

        // Verificar si la cuenta está bloqueada
        if (usuario.bloqueado) {
            if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) < new Date()) {
                await db.query(
                    'UPDATE usuarios SET bloqueado = FALSE, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
                    [usuario.id]
                );
            } else {
                return res.status(401).json({ 
                    mensaje: 'Cuenta bloqueada. Contacta al administrador',
                    bloqueado: true
                });
            }
        }

        const passwordValido = await bcrypt.compare(password, usuario.password);

        if (!passwordValido) {
            const nuevosIntentos = usuario.intentos_fallidos + 1;
            
            if (nuevosIntentos >= 3) {
                const bloqueadoHasta = new Date();
                bloqueadoHasta.setMinutes(bloqueadoHasta.getMinutes() + 30);
                
                await db.query(
                    'UPDATE usuarios SET bloqueado = TRUE, intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
                    [nuevosIntentos, bloqueadoHasta, usuario.id]
                );
                
                return res.status(401).json({ 
                    mensaje: 'Cuenta bloqueada por 30 minutos. Demasiados intentos fallidos',
                    bloqueado: true,
                    tiempo: '30 minutos'
                });
            } else {
                await db.query(
                    'UPDATE usuarios SET intentos_fallidos = ? WHERE id = ?',
                    [nuevosIntentos, usuario.id]
                );
                
                return res.status(401).json({ 
                    mensaje: `Credenciales inválidas. Te quedan ${3 - nuevosIntentos} intentos`,
                    intentos_restantes: 3 - nuevosIntentos
                });
            }
        }

        // Login exitoso
        await db.query(
            'UPDATE usuarios SET intentos_fallidos = 0, bloqueado = FALSE, bloqueado_hasta = NULL WHERE id = ?',
            [usuario.id]
        );

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: { 
                id: usuario.id, 
                nombre: usuario.nombre, 
                email: usuario.email,
                dni: usuario.dni,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

// ========================================
// RECUPERAR CUENTA (generar token de desbloqueo)
// ========================================
router.post('/recuperar', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ mensaje: 'El email es obligatorio' });
    }

    try {
        const [usuarios] = await db.query(
            'SELECT id, bloqueado FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const recoveryToken = jwt.sign(
            { id: usuarios[0].id, email, type: 'unblock' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            mensaje: 'Token de recuperación generado',
            recoveryToken
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

// ========================================
// DESBLOQUEAR CUENTA
// ========================================
router.post('/desbloquear', async (req, res) => {
    const { recoveryToken } = req.body;

    if (!recoveryToken) {
        return res.status(400).json({ mensaje: 'Token de recuperación obligatorio' });
    }

    try {
        const decoded = jwt.verify(recoveryToken, process.env.JWT_SECRET);
        
        if (decoded.type !== 'unblock') {
            return res.status(400).json({ mensaje: 'Token inválido para desbloqueo' });
        }

        await db.query(
            'UPDATE usuarios SET bloqueado = FALSE, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
            [decoded.id]
        );

        res.json({ mensaje: 'Cuenta desbloqueada exitosamente' });

    } catch (error) {
        res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
});

module.exports = router;