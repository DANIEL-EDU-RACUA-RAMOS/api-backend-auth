const express = require('express');
const db = require('../db/connection');
const verificarToken = require('../middleware/auth');
const router = express.Router();

router.use(verificarToken);

// GET todos
router.get('/', async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM items ORDER BY id DESC');
        res.json(items);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener items' });
    }
});

// GET uno
router.get('/:id', async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
        if (items.length === 0) return res.status(404).json({ mensaje: 'Item no encontrado' });
        res.json(items[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener item' });
    }
});

// POST crear
router.post('/', async (req, res) => {
    const { nombre, descripcion, estado } = req.body;
    if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });

    try {
        const [result] = await db.query(
            'INSERT INTO items (nombre, descripcion, estado) VALUES (?, ?, ?)',
            [nombre, descripcion || '', estado !== undefined ? estado : true]
        );
        const [nuevoItem] = await db.query('SELECT * FROM items WHERE id = ?', [result.insertId]);
        res.status(201).json(nuevoItem[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear item' });
    }
});

// PUT actualizar
router.put('/:id', async (req, res) => {
    const { nombre, descripcion, estado } = req.body;
    try {
        const [existe] = await db.query('SELECT id FROM items WHERE id = ?', [req.params.id]);
        if (existe.length === 0) return res.status(404).json({ mensaje: 'Item no encontrado' });

        await db.query(
            'UPDATE items SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?',
            [nombre, descripcion || '', estado !== undefined ? estado : true, req.params.id]
        );
        const [itemActualizado] = await db.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
        res.json(itemActualizado[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar item' });
    }
});

// DELETE eliminar
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM items WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Item no encontrado' });
        res.json({ mensaje: 'Item eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar item' });
    }
});

module.exports = router;