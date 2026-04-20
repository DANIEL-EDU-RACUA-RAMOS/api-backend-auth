const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));

app.get('/', (req, res) => {
    res.json({
        mensaje: 'API REST con Node.js, Express y MySQL en InfinityFree',
        version: '1.0.0',
        endpoints: {
            auth: { register: 'POST /register', login: 'POST /login' },
            items: {
                listar: 'GET /api/items',
                obtener: 'GET /api/items/:id',
                crear: 'POST /api/items',
                actualizar: 'PUT /api/items/:id',
                eliminar: 'DELETE /api/items/:id'
            }
        }
    });
});

app.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
});