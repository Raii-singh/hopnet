/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publicId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Edge` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `edgeType` on the `Edge` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nodeType` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('REAL', 'DEMO');

-- CreateEnum
CREATE TYPE "EdgeType" AS ENUM ('REAL_EDGE', 'DEMO_EDGE');

-- AlterTable
ALTER TABLE "Edge" ADD COLUMN     "connectorSource" TEXT NOT NULL DEFAULT 'Manual',
ADD COLUMN     "createdBy" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "inferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inferredFrom" TEXT,
ADD COLUMN     "interactionFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "relationshipType" TEXT NOT NULL DEFAULT 'acquaintance',
ADD COLUMN     "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "edgeType",
ADD COLUMN     "edgeType" "EdgeType" NOT NULL,
ALTER COLUMN "weight" SET DEFAULT 0.5;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
DROP COLUMN "type",
ADD COLUMN     "company" TEXT,
ADD COLUMN     "createdBy" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "instagramHandle" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "nodeType" "NodeType" NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "publicId" TEXT NOT NULL,
ADD COLUMN     "sourceConnectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twitterHandle" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "connectorSource" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "nodesCreated" INTEGER NOT NULL DEFAULT 0,
    "edgesCreated" INTEGER NOT NULL DEFAULT 0,
    "inferredEdgesCount" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "importLogs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
