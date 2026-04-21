const AWS = require("aws-sdk");
const { sendAiResultToClient } = require("./messageHandler.service");
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });
const { sessionMap } = require("./sessionManager.service");
const redisClient = require("../config/redis");

const queueURL = process.env.SQS_AI_INSIGHTS_STANDARD_URL;

async function pollSQS() {
  try {
    const params = {
      QueueUrl: queueURL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 60,
    };
    console.log("[Polling SQS] Fetching messages...");
    const data = await sqs.receiveMessage(params).promise();
    console.log("[Polling SQS] Messages received:", data.Messages?.length || 0);

    if (data.Messages) {
      for (const message of data.Messages) {
        try {
          const resultPayload = JSON.parse(message.Body);
          const sessionId = resultPayload.session_id;
          const requestId = resultPayload.request_id;

          if (!sessionId) {
            console.warn("[SQS] Missing session_id in message, skipping.");
            continue;
          }

          const dedupKey = `ai:dedup:${requestId}`;
          const isDuplicate = await redisClient.get(dedupKey);
          if (isDuplicate) {
            console.warn(`[SQS] Duplicate message for request_id ${requestId}, skipping`);
            continue;
          }

          await redisClient.set(dedupKey, "1", "EX", 3600);
          await sendAiResultToClient(resultPayload);
          console.log(`[SQS] AI Result processed for session ${sessionId}`);

          await sqs.deleteMessage({ QueueUrl: queueURL, ReceiptHandle: message.ReceiptHandle }).promise();
          console.log("[SQS] Message deleted");
        } catch (err) {
          console.error("[SQS] Error processing message:", err);
        }
      }
    }
  } catch (err) {
    console.error("[SQS] Polling failed:", err.message);
  }
  setTimeout(pollSQS, 1000);
}

module.exports = pollSQS;
