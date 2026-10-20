import multer from "multer";

const ALLOWED_MIME = /^(image\/(jpe?g|pjpeg|png|webp|heic|heif|gif)|video\/(mp4|quicktime|webm)|audio\/(mpeg|mp4|aac|wav|x-m4a|m4a|webm|ogg))$/;

const storage = multer.memoryStorage();

const buildUploader = ({ maxFileSize, maxFiles, mimePattern = ALLOWED_MIME }) =>
  multer({
    storage,
    limits: { fileSize: maxFileSize, files: maxFiles },
    fileFilter: (req, file, cb) => {
      if (!mimePattern.test(file.mimetype)) {
        return cb(new Error("Unsupported file type"));
      }
      cb(null, true);
    },
  });

export const imageUpload = buildUploader({
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 10,
  mimePattern: /^image\/(jpe?g|pjpeg|png|webp|heic|heif|gif)$/,
});

export const mediaUpload = buildUploader({
  maxFileSize: 25 * 1024 * 1024,
  maxFiles: 10,
});

export default buildUploader({
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 10,
  mimePattern: /^image\/(jpe?g|pjpeg|png|webp|heic|heif|gif)$/,
});
