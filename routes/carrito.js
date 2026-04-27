const express = require('express');
const db = require('../db/connection');
const verificarToken = require('../middleware/auth');
const router = express.Router();

router.use(verificarToken);

// ========================================
// POST /api/carrito - Agregar al carrito
// ========================================
router.post('/carrito', async (req, res) => {
    const { item_id, cantidad } = req.body;
    const usuario_id = req.usuario.id;

    if (!item_id || !cantidad || cantidad < 1) {
        return res.status(400).json({ mensaje: 'item_id y cantidad válida son obligatorios' });
    }

    try {
        const [item] = await db.query('SELECT id, stock, nombre, precio FROM items WHERE id = ?', [item_id]);
        if (item.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        if (item[0].stock < cantidad) {
            return res.status(400).json({ 
                mensaje: 'Stock insuficiente', 
                stock_disponible: item[0].stock,
                producto: item[0].nombre
            });
        }

        const [existe] = await db.query(
            'SELECT id, cantidad FROM carrito WHERE usuario_id = ? AND item_id = ?',
            [usuario_id, item_id]
        );

        if (existe.length > 0) {
            const nuevaCantidad = existe[0].cantidad + cantidad;
            if (item[0].stock < nuevaCantidad) {
                return res.status(400).json({ 
                    mensaje: 'Stock insuficiente para la cantidad total',
                    stock_disponible: item[0].stock
                });
            }
            await db.query('UPDATE carrito SET cantidad = ? WHERE id = ?', [nuevaCantidad, existe[0].id]);
        } else {
            await db.query(
                'INSERT INTO carrito (usuario_id, item_id, cantidad) VALUES (?, ?, ?)',
                [usuario_id, item_id, cantidad]
            );
        }

        res.json({ mensaje: 'Producto agregado al carrito', producto: item[0].nombre, cantidad });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al agregar al carrito' });
    }
});

// ========================================
// GET /api/carrito - Ver carrito
// ========================================
router.get('/carrito', async (req, res) => {
    const usuario_id = req.usuario.id;

    try {
        const [carrito] = await db.query(
            `SELECT c.id, c.item_id, c.cantidad, i.nombre, i.precio, i.stock, (c.cantidad * i.precio) as subtotal
             FROM carrito c
             JOIN items i ON c.item_id = i.id
             WHERE c.usuario_id = ?`,
            [usuario_id]
        );

        const total = carrito.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

        res.json({
            carrito,
            total: total.toFixed(2),
            total_items: totalItems,
            cantidad_productos: carrito.length
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener carrito' });
    }
});

// ========================================
// DELETE /api/carrito/:id - Eliminar del carrito
// ========================================
router.delete('/carrito/:id', async (req, res) => {
    const usuario_id = req.usuario.id;
    const carrito_id = req.params.id;

    try {
        const [result] = await db.query(
            'DELETE FROM carrito WHERE id = ? AND usuario_id = ?',
            [carrito_id, usuario_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado en el carrito' });
        }

        res.json({ mensaje: 'Producto eliminado del carrito' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al eliminar del carrito' });
    }
});

// ========================================
// POST /api/checkout - Realizar pedido
// ========================================
router.post('/checkout', async (req, res) => {
    const usuario_id = req.usuario.id;

    try {
        const [carrito] = await db.query(
            `SELECT c.item_id, c.cantidad, i.precio, i.stock, i.nombre
             FROM carrito c
             JOIN items i ON c.item_id = i.id
             WHERE c.usuario_id = ?`,
            [usuario_id]
        );

        if (carrito.length === 0) {
            return res.status(400).json({ mensaje: 'Carrito vacío' });
        }

        for (const item of carrito) {
            if (item.stock < item.cantidad) {
                return res.status(400).json({ 
                    mensaje: `Stock insuficiente para: ${item.nombre}`,
                    stock_disponible: item.stock,
                    solicitado: item.cantidad
                });
            }
        }

        const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

        const [pedido] = await db.query(
            'INSERT INTO pedidos (usuario_id, total) VALUES (?, ?)',
            [usuario_id, total]
        );

        for (const item of carrito) {
            await db.query(
                'INSERT INTO pedido_detalles (pedido_id, item_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                [pedido.insertId, item.item_id, item.cantidad, item.precio, item.precio * item.cantidad]
            );

            await db.query('UPDATE items SET stock = stock - ? WHERE id = ?', [item.cantidad, item.item_id]);
        }

        await db.query('DELETE FROM carrito WHERE usuario_id = ?', [usuario_id]);

        res.status(201).json({
            mensaje: 'Pedido realizado exitosamente',
            pedido_id: pedido.insertId,
            total: total.toFixed(2),
            productos: carrito.length
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al realizar pedido' });
    }
});

// ========================================
// GET /api/mis-pedidos - Ver mis pedidos
// ========================================
router.get('/mis-pedidos', async (req, res) => {
    const usuario_id = req.usuario.id;

    try {
        const [pedidos] = await db.query(
            `SELECT p.id, p.total, p.estado, p.fecha_pedido,
                    (SELECT COUNT(*) FROM pedido_detalles WHERE pedido_id = p.id) as total_items
             FROM pedidos p
             WHERE p.usuario_id = ?
             ORDER BY p.fecha_pedido DESC`,
            [usuario_id]
        );

        res.json(pedidos);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener pedidos' });
    }
});

// ========================================
// GET /api/pedido/:id - Ver detalle de un pedido
// ========================================
router.get('/pedido/:id', async (req, res) => {
    const usuario_id = req.usuario.id;
    const pedido_id = req.params.id;

    try {
        const [pedido] = await db.query(
            'SELECT * FROM pedidos WHERE id = ? AND usuario_id = ?',
            [pedido_id, usuario_id]
        );

        if (pedido.length === 0) {
            return res.status(404).json({ mensaje: 'Pedido no encontrado' });
        }

        const [detalles] = await db.query(
            `SELECT d.id, d.item_id, d.cantidad, d.precio_unitario, d.subtotal, i.nombre
             FROM pedido_detalles d
             JOIN items i ON d.item_id = i.id
             WHERE d.pedido_id = ?`,
            [pedido_id]
        );

        res.json({
            pedido: pedido[0],
            detalles
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener detalle del pedido' });
    }
});

module.exports = router;