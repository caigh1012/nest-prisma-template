-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('custom', 'system');

-- CreateTable
CREATE TABLE "t_role" (
    "id" VARCHAR(40) NOT NULL,
    "role_id" VARCHAR(20) NOT NULL,
    "role_label" VARCHAR(20) NOT NULL,
    "role_type" "RoleType" NOT NULL,

    CONSTRAINT "t_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_user_role" (
    "id" VARCHAR(40) NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" VARCHAR(40) NOT NULL,

    CONSTRAINT "t_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_role_role_id_key" ON "t_role"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_user_role_user_id_role_id_key" ON "t_user_role"("user_id", "role_id");

-- AddForeignKey
ALTER TABLE "t_user_role" ADD CONSTRAINT "t_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_user_role" ADD CONSTRAINT "t_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "t_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
