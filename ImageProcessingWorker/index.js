import aws from "aws-sdk";
import sharp from "sharp";
import path from "path";

const s3 = new aws.S3();

export const handler = async (event) => {
  try {
    const processingPromises = event.Records.map(async (record) => {
      try {
        const { body } = record;
        const { bucket, key } = JSON.parse(body);
        const getObjectParams = {
          Bucket: bucket,
          Key: key,
        };

        const response = await s3.getObject(getObjectParams).promise();
        const imageBuffer = response.Body;

        const transformedKey = key.replace("optimize/", "optimized/");

        const extension = path.extname(key).toLowerCase();

        let image;

        switch (extension) {
          case ".jpeg":
          case ".jpg":
            image = sharp(imageBuffer).jpeg({ quality: 50 });
            break;
          case ".png":
            image = sharp(imageBuffer).png({ compressionLevel: 5 });
            break;
          case ".webp":
            image = sharp(imageBuffer).webp({ quality: 50 });
            break;
          default:
            image = sharp(imageBuffer).jpeg({ quality: 50 });
        }

        const processedImageBuffer = await image.toBuffer();

        const putObjectParams = {
          Bucket: process.env.DESTINATION_BUCKET_NAME,
          Key: transformedKey,
          Body: processedImageBuffer,
        };

        await s3.putObject(putObjectParams).promise();

        await s3
          .deleteObject({
            Bucket: bucket,
            Key: key,
          })
          .promise();

        console.log(`Processed record: ${JSON.stringify(record)}`);
      } catch (error) {
        console.error("Error processing record:", error);
      }
    });

    await Promise.all(processingPromises);

    return {
      statusCode: 200,
      body: "Records are processed successfully",
    };
  } catch (error) {
    console.error(`Error processing the records: ${error}`);
    return {
      statusCode: 500,
      body: "Something went wrong, records cannot be processed",
    };
  }
};
