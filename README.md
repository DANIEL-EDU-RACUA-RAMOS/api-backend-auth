# API Backend con Node.js, Express y MySQL

API REST con autenticación JWT y CRUD completo, conectada a una base de datos MySQL en línea (FreeSQLDatabase).

##  Tecnologías
- Node.js
- Express
- MySQL (FreeSQLDatabase)
- JWT (jsonwebtoken)
- bcryptjs
- Docker

##  Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register` | Registrar un nuevo usuario |
| POST | `/login` | Iniciar sesión y obtener token |

### CRUD de Items (requieren token)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/items` | Listar todos los items |
| GET | `/api/items/:id` | Obtener un item por ID |
| POST | `/api/items` | Crear un nuevo item |
| PUT | `/api/items/:id` | Actualizar un item |
| DELETE | `/api/items/:id` | Eliminar un item |

##  Instalación

```bash
# Clonar el repositorio
git clone https://github.com/DANIEL-EDU-RACUA-RAMOS/api-backend-auth.git

# Entrar a la carpeta
cd api-backend-auth

# Instalar dependencias
npm install