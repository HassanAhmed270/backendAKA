const multer = require('multer');

const storage = multer.memoryStorage();

const singleUpload = multer({ storage }).single("file");
const multipleUpload = multer({ storage }).array("file", 5);

module.exports = { singleUpload, multipleUpload };