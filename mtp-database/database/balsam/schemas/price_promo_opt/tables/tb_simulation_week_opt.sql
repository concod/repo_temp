--liquibase formatted sql
    --changeset vaibhav:simulation_week_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for simulation_week_opt

    CREATE TABLE price_promo_opt.tb_simulation_week_opt (
        product_id INTEGER NOT NULL,
        week_start_date DATE NOT NULL,
        base_percentage INTEGER,
        bnm_sales_units FLOAT,
        bnm_baseline_sales_units FLOAT,
        bnm_elasticity FLOAT,
        bnm_product_split_ratio FLOAT,
        ecom_sales_units FLOAT,
        ecom_baseline_sales_units FLOAT,
        ecom_elasticity FLOAT,
        ecom_product_split_ratio FLOAT
    ) PARTITION BY RANGE (week_start_date);

    CREATE INDEX idx_product_basepercentage ON
    price_promo_opt.tb_simulation_week_opt
    USING BTREE (product_id, base_percentage);


--changeset vaibhav:simulation_week_opt_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for simulation_week_opt

-- 1. Drop extra columns
ALTER TABLE price_promo_opt.tb_simulation_week_opt
DROP COLUMN IF EXISTS bnm_sales_units,
DROP COLUMN IF EXISTS bnm_baseline_sales_units,
DROP COLUMN IF EXISTS bnm_elasticity,
DROP COLUMN IF EXISTS bnm_product_split_ratio,
DROP COLUMN IF EXISTS ecom_sales_units,
DROP COLUMN IF EXISTS ecom_baseline_sales_units,
DROP COLUMN IF EXISTS ecom_elasticity,
DROP COLUMN IF EXISTS ecom_product_split_ratio;

-- 2. Relax NOT NULL constraints
ALTER TABLE price_promo_opt.tb_simulation_week_opt
ALTER COLUMN product_id DROP NOT NULL,
ALTER COLUMN week_start_date DROP NOT NULL;

-- 3. Change data types
ALTER TABLE price_promo_opt.tb_simulation_week_opt
ALTER COLUMN base_percentage TYPE float8 USING base_percentage::float8;

-- 4. Rename columns (if applicable) – add if transformation required
-- Assuming we reuse the columns for sales_units, baseline_sales_units, elasticity
-- If they don't exist yet, add them explicitly
ALTER TABLE price_promo_opt.tb_simulation_week_opt
ADD COLUMN sales_units int4,
ADD COLUMN baseline_sales_units int4,
ADD COLUMN elasticity float8;

-- 5. Drop old index (partition-specific)
DROP INDEX IF EXISTS price_promo_opt.idx_product_basepercentage;

-- 6. Drop partitioning – not supported via ALTER, so advisory only
-- Partitioning cannot be dropped directly; you must recreate the table without it.
-- If needed, let me know and I will provide a full migration script.

-- 7. (Optional) Add new index if needed
CREATE INDEX idx_product_basepercentage_simple
ON price_promo_opt.tb_simulation_week_opt (product_id, base_percentage);
