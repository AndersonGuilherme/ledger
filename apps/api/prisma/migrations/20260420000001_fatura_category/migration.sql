-- AddColumn: categoryId on faturas
-- Allows users to assign a category to a fatura so the projected transaction
-- and eventual payment transaction carry the same category for dashboard breakdown.
-- NOTE: categories.id is stored as TEXT (UUID string), so we match with TEXT here.
ALTER TABLE "faturas" ADD COLUMN "categoryId" TEXT;

-- Foreign key: categoryId references categories(id)
-- ON DELETE SET NULL: archiving/deleting a category clears the fatura's reference gracefully
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
