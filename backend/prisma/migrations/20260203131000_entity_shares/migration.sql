-- AlterTable
ALTER TABLE "Expense"
ADD COLUMN     "entityExpenseId" INTEGER;

-- AlterTable
ALTER TABLE "EntityMember"
ADD COLUMN     "share" DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_entityExpenseId_fkey" FOREIGN KEY ("entityExpenseId") REFERENCES "EntityExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
