const multer = require('multer');

const storage = multer.memoryStorage(); // Use memory storage for buffer
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

module.exports = upload;

