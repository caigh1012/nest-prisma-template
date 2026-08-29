-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "t_user" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "nickname" VARCHAR(12) NOT NULL,
    "email" VARCHAR(255),
    "password" VARCHAR(16) NOT NULL,
    "gender" "Gender" DEFAULT 'UNKNOWN',
    "avatarUrl" TEXT,

    CONSTRAINT "t_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_user_username_key" ON "t_user"("username");
