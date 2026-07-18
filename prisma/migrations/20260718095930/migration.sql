/*
  Warnings:

  - The primary key for the `audit_log` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `file_id` column on the `audit_log` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `file` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `groupId` column on the `file` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `file_permission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `group` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `group_file` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `group_member` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `share_link` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `upload_session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `audit_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `file` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `file_permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fileId` on the `file_permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `group` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `group_file` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `groupId` on the `group_file` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fileId` on the `group_file` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `group_member` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `groupId` on the `group_member` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `share_link` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fileId` on the `share_link` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `upload_session` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fileId` on the `upload_session` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "file_permission" DROP CONSTRAINT "file_permission_fileId_fkey";

-- DropForeignKey
ALTER TABLE "group_file" DROP CONSTRAINT "group_file_fileId_fkey";

-- DropForeignKey
ALTER TABLE "group_file" DROP CONSTRAINT "group_file_groupId_fkey";

-- DropForeignKey
ALTER TABLE "group_member" DROP CONSTRAINT "group_member_groupId_fkey";

-- DropForeignKey
ALTER TABLE "share_link" DROP CONSTRAINT "share_link_fileId_fkey";

-- DropForeignKey
ALTER TABLE "upload_session" DROP CONSTRAINT "upload_session_fileId_fkey";

-- AlterTable
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "file_id",
ADD COLUMN     "file_id" UUID,
ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "file" DROP CONSTRAINT "file_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "groupId",
ADD COLUMN     "groupId" UUID,
ADD CONSTRAINT "file_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "file_permission" DROP CONSTRAINT "file_permission_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "fileId",
ADD COLUMN     "fileId" UUID NOT NULL,
ADD CONSTRAINT "file_permission_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "group" DROP CONSTRAINT "group_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "group_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "group_file" DROP CONSTRAINT "group_file_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "groupId",
ADD COLUMN     "groupId" UUID NOT NULL,
DROP COLUMN "fileId",
ADD COLUMN     "fileId" UUID NOT NULL,
ADD CONSTRAINT "group_file_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "group_member" DROP CONSTRAINT "group_member_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "groupId",
ADD COLUMN     "groupId" UUID NOT NULL,
ADD CONSTRAINT "group_member_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "share_link" DROP CONSTRAINT "share_link_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "fileId",
ADD COLUMN     "fileId" UUID NOT NULL,
ADD CONSTRAINT "share_link_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "upload_session" DROP CONSTRAINT "upload_session_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "fileId",
ADD COLUMN     "fileId" UUID NOT NULL,
ADD CONSTRAINT "upload_session_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "file_permission_fileId_userId_key" ON "file_permission"("fileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "group_file_groupId_fileId_key" ON "group_file"("groupId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "group_member_groupId_userId_key" ON "group_member"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "upload_session" ADD CONSTRAINT "upload_session_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_link" ADD CONSTRAINT "share_link_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_permission" ADD CONSTRAINT "file_permission_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_file" ADD CONSTRAINT "group_file_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_file" ADD CONSTRAINT "group_file_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;
