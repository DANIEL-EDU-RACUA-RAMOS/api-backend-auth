// routes/admin.js - Gestión de usuarios (solo Super Admin)
const express = require('express');
const db = require('../db/connection');
const verificarToken = require('../middleware/auth');
const verificarRol = require('../middleware/roles');
const router = express.Router();

// Todas las rutas requieren autenticación y rol super_admin
router.use(verificarToken);
router.use(verificarRol(['super_admin']));

// ========================================
// GET /admin/usuarios - Listar todos los usuarios
// ========================================
router.get('/usuarios', async (req, res) => {
    try {
        const [usuarios] = await db.query(
            `SELECT id, nombre, email, dni, rol, intentos_fallidos, 
                    bloqueado, bloqueado_hasta, created_at
             FROM usuarios 
             ORDER BY id DESC`
        );
        res.json({
            total: usuarios.length,
            usuarios
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios' });
    }
});

// ========================================
// GET /admin/usuarios/bloqueados - Ver solo usuarios bloqueados
// ========================================
router.get('/usuarios/bloqueados', async (req, res) => {
    try {
        const [usuarios] = await db.query(
            `SELECT id, nombre, email, dni, rol, intentos_fallidos, 
                    bloqueado, bloqueado_hasta, created_at
             FROM usuarios 
             WHERE bloqueado = TRUE
             ORDER BY id DESC`
        );
        res.json({
            total: usuarios.length,
            usuarios
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios bloqueados' });
    }
});

// ========================================
// GET /admin/usuarios/:id - Ver un usuario específico
// ========================================
router.get('/usuarios/:id', async (req, res) => {
    try {
        const [usuarios] = await db.query(
            `SELECT id, nombre, email, dni, rol, intentos_fallidos, 
                    bloqueado, bloqueado_hasta, created_at
             FROM usuarios 
             WHERE id = ?`,
            [req.params.id]
        );
        
        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        
        res.json(usuarios[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener usuario' });
    }
});

// ========================================
// PUT /admin/usuarios/:id/bloquear - Bloquear un usuario
// ========================================
router.put('/usuarios/:id/bloquear', async (req, res) => {
    const { id } = req.params;
    const { minutos } = req.body; // minutos de bloqueo (opcional, por defecto 30)
    
    const minutosBloqueo = minutos || 30;
    const bloqueadoHasta = new Date();
    bloqueadoHasta.setMinutes(bloqueadoHasta.getMinutes() + minutosBloqueo);
    
    try {
        // Verificar que el usuario existe
        const [existe] = await db.query('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        
        // No se puede bloquear a otro super_admin
        if (existe[0].rol === 'super_admin') {
            return res.status(403).json({ mensaje: 'No se puede bloquear a un Super Administrador' });
        }
        
        await db.query(
            `UPDATE usuarios 
             SET bloqueado = TRUE, 
                 intentos_fallidos = 3, 
                 bloqueado_hasta = ? 
             WHERE id = ?`,
            [bloqueadoHasta, id]
        );
        
        res.json({ 
            mensaje: `Usuario bloqueado por ${minutosBloqueo} minutos`,
            bloqueado_hasta: bloqueadoHasta
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al bloquear usuario' });
    }
});

// ========================================
// PUT /admin/usuarios/:id/desbloquear - Desbloquear un usuario
// ========================================
router.put('/usuarios/:id/desbloquear', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [existe] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        
        await db.query(
            `UPDATE usuarios 
             SET bloqueado = FALSE, 
                 intentos_fallidos = 0, 
                 bloqueado_hasta = NULL 
             WHERE id = ?`,
            [id]
        );
        
        res.json({ mensaje: 'Usuario desbloqueado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al desbloquear usuario' });
    }
});

// ========================================
// PUT /admin/usuarios/:id/rol - Cambiar rol de un usuario
// ========================================
router.put('/usuarios/:id/rol', async (req, res) => {
    const { id } = req.params;
    const { rol } = req.body;
    
    const rolesPermitidos = ['user', 'admin'];
    
    if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ 
            mensaje: 'Rol inválido. Permitidos: user, admin',
            roles_permitidos: rolesPermitidos
        });
    }
    
    try {
        const [existe] = await db.query('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        
        // No se puede cambiar el rol de otro super_admin
        if (existe[0].rol === 'super_admin') {
            return res.status(403).json({ mensaje: 'No se puede cambiar el rol de un Super Administrador' });
        }
        
        await db.query(
            'UPDATE usuarios SET rol = ? WHERE id = ?',
            [rol, id]
        );
        
        res.json({ 
            mensaje: `Rol actualizado a ${rol} exitosamente`,
            usuario_id: id,
            nuevo_rol: rol
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al cambiar rol' });
    }
});

module.exports = router;