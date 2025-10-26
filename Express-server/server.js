const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Persona = require('./model');
const User = require('./user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

const { pool } = require('./db_pg');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://toledo:123@mongo:27017/TallerMilca?authSource=admin';

mongoose.connect(MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
})
.then(() => console.log('Conectado a MongoDB - Base de datos'))
.catch(e => console.error('Error conexión MongoDB:', e));

const handleValidationError = (error) => {
    const errors = {};
    Object.keys(error.errors).forEach(key => {
        errors[key] = {
            message: error.errors[key].message
        };
    });
    return errors;
};

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

//proteger rutas
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// Rutas de autenticación
app.post('/auth/register', async (req, res) => {
    console.log('POST /auth/register called with body:', req.body);
    try {
        const { nombre, apellidos, email, password, confirmPassword } = req.body;
        if (!nombre || !apellidos || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: 'Faltan campos requeridos.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
        }
        // verificar que email no exista
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.status(400).json({ message: 'El correo ya está registrado.' });

        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ nombre: nombre.trim(), apellidos: apellidos.trim(), email: email.toLowerCase().trim(), password: hashed });
        await user.save();

        //devolver token inmediatamente
    const token = jwt.sign({ userId: user._id, email: user.email, nombre: user.nombre, apellidos: user.apellidos }, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token });
    } catch (error) {
        console.error('Error POST /auth/register:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.post('/auth/login', async (req, res) => {
    console.log('POST /auth/login called with body:', { email: req.body.email });
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Faltan credenciales.' });
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Credenciales inválidas.' });
        const token = jwt.sign({ userId: user._id, email: user.email, nombre: user.nombre, apellidos: user.apellidos }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error('Error POST /auth/login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

//CRUD RUTAS
app.post('/', authenticateToken, async (req, res) => {
    try {
        if (req.body.dni) req.body.dni = req.body.dni.trim();
        if (req.body.nombres) req.body.nombres = req.body.nombres.trim();
        if (req.body.apellidos) req.body.apellidos = req.body.apellidos.trim();

        const persona = new Persona(req.body);
        await persona.save();
        res.status(201).json(persona);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                errors: {
                    dni: { message: 'El DNI ingresado ya se encuentra registrado.' }
                }
            });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                errors: handleValidationError(error)
            });
        }
        console.error('Error interno:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/', authenticateToken, async (req, res) => {
    try {
        const personas = await Persona.find();
        res.json(personas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/pg', authenticateToken, async (req, res) => {
    try {
        const { dni, nombres, apellidos, fechaNacimiento } = req.body;
        if (!dni || !nombres || !apellidos || !fechaNacimiento) {
            return res.status(400).json({ message: 'Faltan campos requeridos.' });
        }

        const fecha = new Date(fechaNacimiento);
        const result = await pool.query(
            `INSERT INTO persons (dni, nombres, apellidos, fecha_nacimiento)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [dni.trim(), nombres.trim(), apellidos.trim(), fecha]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // unique_violation
            return res.status(400).json({ message: 'El DNI ingresado ya se encuentra registrado.' });
        }
        console.error('Error PostgreSQL POST /pg:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/pg', authenticateToken, async (req, res) => {
    try {
        console.log('DEBUG: GET /pg called');
        const result = await pool.query('SELECT * FROM persons ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error PostgreSQL GET /pg:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/pg/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'Id inválido' });
        const result = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'No encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error PostgreSQL GET /pg/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Actualizar persona en Postgres
app.put('/pg/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'Id inválido' });

        const { dni, nombres, apellidos, fechaNacimiento } = req.body;
        const fecha = fechaNacimiento ? new Date(fechaNacimiento) : null;

        const fields = [];
        const values = [];
        let idx = 1;
        if (dni) { fields.push(`dni = $${idx++}`); values.push(dni.trim()); }
        if (nombres) { fields.push(`nombres = $${idx++}`); values.push(nombres.trim()); }
        if (apellidos) { fields.push(`apellidos = $${idx++}`); values.push(apellidos.trim()); }
        if (fecha) { fields.push(`fecha_nacimiento = $${idx++}`); values.push(fecha); }

        if (fields.length === 0) return res.status(400).json({ message: 'Nada para actualizar.' });

        values.push(id);
        const query = `UPDATE persons SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        const result = await pool.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ message: 'No encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'El DNI ingresado ya pertenece a otra persona.' });
        }
        console.error('Error PostgreSQL PUT /pg/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.delete('/pg/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'Id inválido' });
        const result = await pool.query('DELETE FROM persons WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        console.error('Error PostgreSQL DELETE /pg/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/:id', authenticateToken, async (req, res) => {
    try {
        const persona = await Persona.findById(req.params.id);
        if (!persona) return res.status(404).json({ message: 'No encontrado' });
        res.json(persona);
    } catch (error) {
        res.status(400).json({ message: 'Id inválido' });
    }
});

// actualizar
app.put('/:id', authenticateToken, async (req, res) => {
    try {
        const persona = await Persona.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true } 
        );
        if (!persona) return res.status(404).json({ message: 'No encontrado' });
        res.json(persona);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ errors: error.errors });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'El DNI ingresado ya pertenece a otra persona.' });
        }
        
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const persona = await Persona.findByIdAndDelete(req.params.id);
        if (!persona) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(400).json({ message: 'Id inválido' });
    }
});

const PORT = 3000;
const HOST = '0.0.0.0'; 

app.listen(PORT, HOST, () => {
    console.log(`Servidor corriendo en http://${HOST}:${PORT}/`);
});