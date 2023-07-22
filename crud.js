const express = require("express");
const mongoose = require("mongoose");
const Product = require("./models/productModel");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extend: true }));

app.get("/", (req, res) => {
  res.send("hkko");
});

//get all product from db and send to client

app.get("/product/", async (req, res) => {
  try {
    let product = await Product.find({});
    if (!product) {
      return res.status(404).json({ message: `product not found` });
    }
    return res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get single product by id from db and send to client

app.get("/product/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: `product not found by id ${id}` });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//update product details from db by id
app.put("/product/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let product = await Product.findByIdAndUpdate(id, req.body);
    if (!product) {
      return res.status(404).json({ message: `product not found by id ${id}` });
    }
    let updatedProduct = await Product.findById(id);
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/product/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "cannot find product" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//add product to db using postman

app.post("/product", async (req, res) => {
  try {
    let product = await Product.create(req.body);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//connecting server to db

mongoose
  .connect(
    "mongodb+srv://kalkiram40:$Qwertyuiop99@kalkiapi.ncmqnei.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("coonnected to db");
    app.listen(8080, () => {
      console.log("server connected 8080");
    });
  })
  .catch((err) => {
    console.log(err);
  });
