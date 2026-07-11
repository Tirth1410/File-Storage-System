import {
  S3Client,
  PutBucketCorsCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config();

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_URL,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.R2_BUCKET!;

async function main() {
  console.log(`Checking bucket: ${bucketName}...`);
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`Bucket ${bucketName} exists!`);
  } catch (error) {
    const err = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      console.log(`Bucket ${bucketName} does not exist. Creating...`);
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`Bucket ${bucketName} created successfully!`);
    } else {
      console.error("Error heading bucket:", error);
      throw error;
    }
  }

  console.log("Configuring CORS on the bucket...");
  const corsCommand = new PutBucketCorsCommand({
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  });

  await s3Client.send(corsCommand);
  console.log("CORS configuration applied successfully! ETag is now exposed.");
}

main().catch((err) => {
  console.error("Configuration failed:", err);
  process.exit(1);
});
