const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');
const { connectToMongoDB, disconnectToMongoDB } = require('./mongoDb');
const app = express();
const PORT = process.env.PORT || 3000;

dotenv.config();
app.use(express.json());

//Esta funcion normaliza, elimina caracteres de acento y convierte a minuscula
function diacriticless(palabra) {
    return palabra.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

app.get('/', (req, res) => {
    res.send('Hola, mundo!');
});
app.get('/computadoras', async (req, res) => {
    let db;
    try {
        const iD = (req.params.id) || 0;                                                                                                                                                                                                                        db = await connectToMongoDB();
        const collection = db.collection('computacion');
        const productos = await collection.find().toArray();
        res.status(200).json(productos);

    } catch (error) {
        console.error('Error al obtener datos de la base de datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        await disconnectToMongoDB();
    }
});

// Obtener una computadora por su código
app.get('/computadoras/:id', async (req, res) => {
    let db
    try {
        const id = parseInt(req.params.id);
        const db = await connectToMongoDB();
        const collection = db.collection('computacion');
        const producto = await collection.findOne({ codigo: id });
        console.log(producto)
        if (producto) {
            res.status(200).json(producto);
        } else {
            res.status(404).json({ error: `No se encontró el producto con el código ${id}` });
        }
    } catch (error) {
        console.error('Error al obtener datos de la base de datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        await disconnectToMongoDB();
    }
});

//Ruta para busqueda por Nombre y Categoria
app.get('/computadoras/search/:buscar', async (req, res) => {
    try {
        const buscar = req.params.buscar.toLowerCase();
        const busqueda = diacriticless(buscar);
        const db = await connectToMongoDB();
        const collection = db.collection('computacion');

        // Buscar sin considerar tildes ni diferencias de mayúsculas/minúsculas
        const productos = await collection.find().toArray();
        const resultados = productos.filter(producto => {
            const nombre = diacriticless(producto.nombre);
            const categoria = diacriticless(producto.categoria);
            return nombre.includes(busqueda) || categoria.includes(busqueda);
        });

        if (resultados.length > 0) {
            res.status(200).json(resultados);
        } else {
            res.status(404).json({ error: `No se encontraron resultados para "${buscar}"` });
        }
    } catch (error) {
        console.error('Error al obtener datos de la base de datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        await disconnectToMongoDB();
    }
});

//otras Rutas 
app.get("*", (req, res) => {
    res.status(404).json({
        error: "404",
        message: "No se encuentra la ruta solicitada",
    });
});


app.listen(PORT, async () => {
    try {
        await connectToMongoDB();
        console.log(`API de cositas en http://localhost:${PORT}`);
    } catch (error) {
        console.error('Error al conectar a MongoDB Atlas', error);
        process.exit(1);
    }
});
