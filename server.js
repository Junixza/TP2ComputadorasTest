const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");
const { connectToMongoDB, disconnectToMongoDB } = require("./src/mongoDb");
const app = express();
const PORT = process.env.PORT || 3000;

dotenv.config();
app.use(express.json());

//Esta funcion normaliza, elimina caracteres de acento y convierte a minuscula
function diacriticless(palabra) {
  return palabra
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

app.get("/", (req, res) => {
  res.send("Hola, mundo!");
});
app.get("/computadoras", async (req, res) => {
  let db;
  try {
    const iD = req.params.id || 0;
    db = await connectToMongoDB();
    const collection = db.collection("computacion");
    const productos = await collection.find().toArray();
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener datos de la base de datos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    await disconnectToMongoDB();
  }
});

// Obtener una computadora por su código
app.get("/computadoras/:id", async (req, res) => {
  let db;
  try {
    const id = parseInt(req.params.id);
    const db = await connectToMongoDB();
    const collection = db.collection("computacion");
    const producto = await collection.findOne({ codigo: id });
    console.log(producto);
    if (producto) {
      res.status(200).json(producto);
    } else {
      res
        .status(404)
        .json({ error: `No se encontró el producto con el código ${id}` });
    }
  } catch (error) {
    console.error("Error al obtener datos de la base de datos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    await disconnectToMongoDB();
  }
});

//Ruta para busqueda por Nombre y Categoria
app.get("/computadoras/search/:buscar", async (req, res) => {
  try {
    const buscar = req.params.buscar.toLowerCase();
    const busqueda = diacriticless(buscar);
    const db = await connectToMongoDB();
    const collection = db.collection("computacion");

    // Buscar sin considerar tildes ni diferencias de mayúsculas/minúsculas
    const productos = await collection.find().toArray();
    const resultados = productos.filter((producto) => {
      const nombre = diacriticless(producto.nombre);
      const categoria = diacriticless(producto.categoria);
      return nombre.includes(busqueda) || categoria.includes(busqueda);
    });

    if (resultados.length > 0) {
      res.status(200).json(resultados);
    } else {
      res
        .status(404)
        .json({ error: `No se encontraron resultados para "${buscar}"` });
    }
  } catch (error) {
    console.error("Error al obtener datos de la base de datos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    await disconnectToMongoDB();
  }
});


// endpoint POST para crear una nueva computadora
app.post("/computadoras/", async (req, res) => {
  const newData = req.body;
  // campos requeridos y tipos esperados
  const requiredFields = {
    nombre: "string",
    precio: "number",
    categoria: "string",
    codigo: "number",
  };
  // valido cada campo
  for (const [field, type] of Object.entries(requiredFields)) {
    if (!newData.hasOwnProperty(field)) {
      return res.status(400).json({
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} es obligatorio.`,
      });
    }
    if (typeof newData[field] !== type) {
      return res.status(400).json({error: `${field.charAt(0).toUpperCase() + field.slice(1) } debe ser un(a) ${type}.`,
      });
    }
  }
  let db;
  try {
    db = await connectToMongoDB();
    const collection = db.collection("computacion");
  // Verificar si ya existe un producto con el mismo código
  const existingProduct = await collection.findOne({ codigo: newData.codigo });
  if (existingProduct) {
    return res.status(400).json({ error: `El producto con el código ${newData.codigo} ya existe.` });
  }
  // Insertar el nuevo producto
  const result = await collection.insertOne(newData);
  res.status(201).json({
    message: "Nueva computadora creada exitosamente",
    data: result.ops[0],
  });
  } catch (error) {
    console.error("Error al crear la computadora:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    await disconnectToMongoDB();
  }
});


// endpoint PUT para actualizar una pc por codigo
app.put("/computadoras/:codigo", async (req, res) => {
  // aseguro que codigo sea integer
  const codigo = parseInt(req.params.codigo);
  const newData = req.body;
  // me fijo que agrego datos no vacio
  if (!newData || Object.keys(newData).length === 0) {
    return res.status(400).json({ error: "Datos incompletos o incorrectos" });
  }
  // campos requeridos y tipos esperados
  const requiredFields = {
    nombre: "string",
    precio: "number",
    categoria: "string",
  };
  // valido cada campo
  for (const [field, type] of Object.entries(requiredFields)) {
    if (!newData.hasOwnProperty(field)) {
      return res.status(400).json({
        error: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } es obligatorio.`,
      });
    }
    if (typeof newData[field] !== type) {
      return res.status(400).json({
        error: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } debe ser un(a) ${type}.`,
      });
    }
  }
  let db;
  try {
    db = await connectToMongoDB();
    const collection = db.collection("computacion");
    // actualizo
    const result = await collection.updateOne(
      { codigo: codigo },
      { $set: newData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: `No se encontró la computadora con el código ${codigo}`,
      });
    }
    res.status(200).json({
      message: `Computadora con código ${codigo} actualizada exitosamente`,
      data: newData,
    });
  } catch (error) {
    console.error("Error al actualizar la computadora:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    await disconnectToMongoDB();
  }
});

// endpoint DELETE para eliminar una pc por codigo
app.delete("/computadoras/:codigo", async (req, res) => {
  // aseguro que codigo sea integer
  const codigo = parseInt(req.params.codigo);
  // me fijo que agrego datos no vacio
  if (isNaN(codigo)) {
    return res
      .status(400)
      .json({ error: "El código debe ser un número válido" });
  }
  let db;
  try {
    db = await connectToMongoDB();
    const collection = db.collection("computacion");
    // elimino
    const result = await collection.deleteOne({ codigo: codigo });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: `No se encontró la computadora con el código ${codigo}`,
      });
    }
    res.status(200).json({
      message: `Computadora con código ${codigo} eliminada exitosamente`,
    });
  } catch (error) {
    console.error("Error al eliminar la computadora:", error);
    res.status(500).json({ error: "Error interno del servidor" });
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
    console.error("Error al conectar a MongoDB Atlas", error);
    process.exit(1);
  }
});
