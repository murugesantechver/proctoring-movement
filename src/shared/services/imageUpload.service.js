const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

const s3 = new S3Client({ region: process.env.AWS_REGION });

exports.uploadImageToS3 = async (event) => {
  try {
    let { fileData, fileName, organisation_id, userId, session_id, type } = event;
    if (!fileData || !fileName || !organisation_id || !userId || !session_id || !type) throw new Error("Missing required fields");
    const extension = path.extname(fileName) || ".png";
    const baseName = path.basename(fileName, extension);
    const key = `${organisation_id}/${type}/${userId}/${session_id}/${baseName}${extension}`;
    const cleanBase64 = fileData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key, Body: buffer, ContentType: `image/${extension.replace(".", "")}` }));
    return { statusCode: 200, key };
  } catch (err) {
    console.error("S3 Upload Error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Error uploading image", error: err.message }) };
  }
};
