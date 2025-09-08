import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";

export const s3Client = new S3Client({
  endpoint: env.AWS_S3_ENDPOINT,
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
) {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

export function getPublicUrl(key: string) {
  return `${env.AWS_S3_ENDPOINT}/${env.AWS_S3_BUCKET}/${key}`;
}

export function generateAvatarKey(userId: string, filename: string) {
  const extension = filename.split('.').pop();
  const timestamp = Date.now();
  return `avatars/${userId}/${timestamp}.${extension}`;
}