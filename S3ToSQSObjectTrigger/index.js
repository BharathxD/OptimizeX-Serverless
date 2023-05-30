import AWS from "aws-sdk";
import path from "path";

const supportedExtensions = [".jpg", ".jpeg", ".png", ".gif"];

export const handler = async (event) => {
  const { bucket, object } = event.Records[0].s3;
  const { key } = object;

  const fileExtension = path.extname(key).toLowerCase();
  if (!supportedExtensions.includes(fileExtension)) {
    console.log("Skipping file:", key);
    return {
      statusCode: 200,
      body: "File skipped (not an image)",
    };
  }

  const sqs = new AWS.SQS();

  const message = {
    bucket: bucket.name,
    key: key,
  };

  const params = {
    MessageBody: JSON.stringify(message),
    QueueUrl: process.env.SQL_QUEUE_URL,
  };

  try {
    const result = await sqs.sendMessage(params).promise();
    console.log(`Message sent successfully. MessageId: ${result.MessageId}`);
  } catch (error) {
    console.error("Error sending message to SQS queue:", error);
  }
};
