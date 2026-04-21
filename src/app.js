const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");


// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//ALB Health check 
app.get("/health", (req, res) => res.status(200).send("OK"));

module.exports = app;