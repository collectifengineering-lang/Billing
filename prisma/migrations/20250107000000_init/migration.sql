-- CreateTable
CREATE TABLE "Projection" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL
);

-- CreateTable
CREATE TABLE "Status" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "comment" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SignedFee" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL
);

-- CreateTable
CREATE TABLE "AsrFee" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL
);

-- CreateTable
CREATE TABLE "ClosedProject" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" SERIAL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectManager" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Projection_projectId_month_key" ON "Projection"("projectId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Status_projectId_month_key" ON "Status"("projectId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_projectId_month_key" ON "Comment"("projectId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SignedFee_projectId_key" ON "SignedFee"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AsrFee_projectId_key" ON "AsrFee"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedProject_projectId_key" ON "ClosedProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_projectId_key" ON "ProjectAssignment"("projectId");
