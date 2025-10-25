-- AlterTable
ALTER TABLE "Expense"
ADD COLUMN     "sharePercentage" DOUBLE PRECISION,
ADD COLUMN     "isPayer" BOOLEAN NOT NULL DEFAULT false;
