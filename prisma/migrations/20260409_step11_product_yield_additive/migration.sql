-- Step 11: Add recipe yield support for inventory products
-- Why:
-- - allow products to define how many pieces one recipe/batch yields
-- - enable recipe-equivalent computations in inventory reporting

ALTER TABLE "Product"
ADD COLUMN "yield_per_recipe" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_yield_per_recipe_positive"
CHECK ("yield_per_recipe" > 0);
