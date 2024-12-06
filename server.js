const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const port = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Serve the index.html for the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Endpoint to handle PDF encryption
app.post("/encrypt", upload.single("pdfFile"), (req, res) => {
  const password = req.body.password;
  const filePath = req.file.path;

  // Check if file exists
  fs.exists(filePath, (exists) => {
    if (!exists) {
      return res.status(400).send("File does not exist.");
    }

    // Read the uploaded file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return res.status(500).send("Error reading the file.");
      }

      // Create a cipher and encrypt the PDF
      const cipher = crypto.createCipher("aes-256-cbc", password);
      let encrypted = cipher.update(data, "utf8", "base64");
      encrypted += cipher.final("base64");

      // Send the encrypted file to the user
      res.setHeader("Content-Disposition", "attachment; filename=encrypted.pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(encrypted, "base64"));

      // Cleanup temporary file
      fs.unlink(filePath, () => {});
    });
  });
});

// Endpoint to handle PDF decryption
app.post("/decrypt", upload.single("encryptedFile"), (req, res) => {
  const password = req.body.decryptPassword;
  const filePath = req.file.path;

  // Check if file exists
  fs.exists(filePath, (exists) => {
    if (!exists) {
      return res.status(400).send("File does not exist.");
    }

    // Read the uploaded encrypted file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return res.status(500).send("Error reading the file.");
      }

      // Create a decipher and decrypt the PDF
      const decipher = crypto.createDecipher("aes-256-cbc", password);
      let decrypted;
      try {
        decrypted = decipher.update(data.toString("base64"), "base64", "utf8");
        decrypted += decipher.final("utf8");
      } catch (error) {
        return res.status(400).send("Invalid password or corrupted file.");
      }

      // Send the decrypted file to the user
      res.setHeader("Content-Disposition", "attachment; filename=decrypted.pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(decrypted, "utf8"));

      // Cleanup temporary file
      fs.unlink(filePath, () => {});
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});