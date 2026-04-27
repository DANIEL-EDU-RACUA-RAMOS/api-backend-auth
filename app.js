const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api', require('./routes/carrito'));
app.use('/admin', require('./routes/admin'));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API REST con Node.js, Express y MySQL',
        version: '2.0.0',
        endpoints: {
            auth: {
                register: 'POST /register',
                login: 'POST /login',
                recuperar: 'POST /recuperar',
                desbloquear: 'POST /desbloquear'
            },
            productos: {
                listar: 'GET /api/items',
                obtener: 'GET /api/items/:id',
                crear: 'POST /api/items (Admin/SuperAdmin)',
                actualizar: 'PUT /api/items/:id (Admin/SuperAdmin)',
                eliminar: 'DELETE /api/items/:id (Solo SuperAdmin)'
            },
            compras: {
                carrito: 'GET /api/carrito',
                agregar: 'POST /api/carrito',
                eliminar: 'DELETE /api/carrito/:id',
                checkout: 'POST /api/checkout',
                misPedidos: 'GET /api/mis-pedidos',
                pedido: 'GET /api/pedido/:id'
            }
        },
        roles: {
            user: 'Ver productos, comprar',
            admin: 'CRUD de productos',
            super_admin: 'Todo lo anterior + eliminar productos'
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n Servidor corriendo en http://localhost:${PORT}`);
    console.log(` Endpoints disponibles en http://localhost:${PORT}/\n`);
});