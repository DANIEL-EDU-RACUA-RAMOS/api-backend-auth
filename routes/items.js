const express = require('express');
const db = require('../db/connection');
const verificarToken = require('../middleware/auth');
const verificarRol = require('../middleware/roles');
const router = express.Router();

// Todas requieren autenticación
router.use(verificarToken);

// ========================================
// GET /api/items - Listar productos (todos los usuarios)
// ========================================
router.get('/', async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM items ORDER BY id DESC');
        res.json(items);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
});

// ========================================
// GET /api/items/:id - Obtener un producto (todos los usuarios)
// ========================================
router.get('/:id', async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
        if (items.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado' });
        res.json(items[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener producto' });
    }
});

// ========================================
// POST /api/items - Crear producto (solo Admin y Super Admin)
// ========================================
router.post('/', verificarRol(['admin', 'super_admin']), async (req, res) => {
    const { nombre, descripcion, precio, stock, estado } = req.body;

    if (!nombre || precio === undefined) {
        return res.status(400).json({ mensaje: 'Nombre y precio son obligatorios' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO items (nombre, descripcion, precio, stock, estado) VALUES (?, ?, ?, ?, ?)',
            [nombre, descripcion || '', precio, stock || 0, estado !== undefined ? estado : true]
        );

        const [nuevoItem] = await db.query('SELECT * FROM items WHERE id = ?', [result.insertId]);
        res.status(201).json(nuevoItem[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al crear producto' });
    }
});

// ========================================
// PUT /api/items/:id - Actualizar producto (solo Admin y Super Admin)
// ========================================
router.put('/:id', verificarRol(['admin', 'super_admin']), async (req, res) => {
    const { nombre, descripcion, precio, stock, estado } = req.body;
    const id = req.params.id;

    try {
        const [existe] = await db.query('SELECT id FROM items WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        await db.query(
            'UPDATE items SET nombre = ?, descripcion = ?, precio = ?, stock = ?, estado = ? WHERE id = ?',
            [nombre, descripcion || '', precio, stock || 0, estado !== undefined ? estado : true, id]
        );

        const [itemActualizado] = await db.query('SELECT * FROM items WHERE id = ?', [id]);
        res.json(itemActualizado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al actualizar producto' });
    }
});

// ========================================
// DELETE /api/items/:id - Eliminar producto (solo Super Admin)
// ========================================
router.delete('/:id', verificarRol(['super_admin']), async (req, res) => {
    const id = req.params.id;

    try {
        const [result] = await db.query('DELETE FROM items WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
        res.json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al eliminar producto' });
    }
});

module.exports = router;