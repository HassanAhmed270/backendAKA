const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => (file.mimetype && file.mimetype.startsWith('image/'))
    ? cb(null, true)
    : cb(new Error('Only image files are allowed'))
});

const singleUpload = upload.single("file");
const multipleUpload = upload.array("file", 5);

module.exports = { singleUpload, multipleUpload };