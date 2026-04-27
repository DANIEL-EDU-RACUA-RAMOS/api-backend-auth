const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        const usuarioRol = req.usuario.rol;
        
        if (!rolesPermitidos.includes(usuarioRol)) {
            return res.status(403).json({
                mensaje: 'Acceso denegado. No tienes permisos suficientes',
                tu_rol: usuarioRol,
                roles_requeridos: rolesPermitidos
            });
        }
        
        next();
    };
};

module.exports = verificarRol;