import * as multerS3 from 'multer-s3';
import { s3 } from './s3.config';
import 'dotenv/config'



export const multerOptions = {
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    acl: 'public-read',
    key: (req, file, cb) => {
      cb(null, `${Date.now().toString()}-${file.originalname}`);
    },
  }),
};