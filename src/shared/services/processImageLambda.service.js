const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const path = require("path");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const sqs = new SQSClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    let {
      fileData,
      fileName,
      organisation_id,
      userId,
      session_id,
      type,
      sqsPayload,
      
    } = typeof event.body === "string" ? JSON.parse(event.body) : event.body || event;

    if (!fileData || !fileName || !organisation_id || !userId || !session_id || !type) {
      throw new Error("Missing required fields");
    }

    const extension = path.extname(fileName) || ".png";
    const baseName = path.basename(fileName, extension);
    const key = `${organisation_id}/${type}/${userId}/${session_id}/${baseName}${extension}`;

    // Remove any base64 header (e.g., data:image/png;base64,)
    const cleanBase64 = fileData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: `image/${extension.replace(".", "")}`,
    });

    await s3.send(putCommand);
    console.log("✅ Uploaded to S3:", key);
    console.log("SQS Payload:", sqsPayload);

    if (sqsPayload) {
      sqsPayload.comparison_image = key;

      const message = new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(sqsPayload),
      });

      await sqs.send(message);
      console.log("✅ SQS message sent");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ key }),
    };
  } catch (err) {
    console.error("Lambda error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing image", error: err.message }),
    };
  }
};
