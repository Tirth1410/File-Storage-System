import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_URL,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

export const r2Service = {
  async initializeMultipartUpload(key: string, contentType: string) {
    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: contentType,
    });
    const response = await s3Client.send(command);
    return {
      uploadId: response.UploadId!,
      objectKey: key,
    };
  },

  async generatePresignedPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
  ) {
    const command = new UploadPartCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    // The client will perform a PUT request to this URL with the chunk data
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  },

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ) {
    // Sort parts by PartNumber as required by S3 CompleteMultipartUpload API
    const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts.map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    });
    const response = await s3Client.send(command);
    return response;
  },

  async abortMultipartUpload(key: string, uploadId: string) {
    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      UploadId: uploadId,
    });
    await s3Client.send(command);
  },

  async generatePresignedGetUrl(
    key: string,
    filename: string,
    download: boolean,
  ) {
    const contentDisposition = download
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ResponseContentDisposition: contentDisposition,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  },
};
