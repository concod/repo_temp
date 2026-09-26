--liquibase formatted sql
    --changeset vaibhav:day_split_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for day_split_opt

    CREATE TABLE price_promo_opt.tb_day_split_opt (
        l3_cid INTEGER NOT NULL,
        brand_cid INTEGER NOT NULL,
        date DATE NOT NULL,
        week_start_date DATE NOT NULL,
        bnm_day_split_ratio FLOAT,
        ecom_day_split_ratio FLOAT
    ) PARTITION BY RANGE (week_start_date);

    CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_opt ON
    price_promo_opt.tb_day_split_opt
    USING BTREE (l3_cid, brand_cid, week_start_date);

--changeset vaibhav:day_split_opt_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for day_split_opt

-- 1. Drop extra columns
ALTER TABLE price_promo_opt.tb_day_split_opt
DROP COLUMN IF EXISTS brand_cid,
DROP COLUMN IF EXISTS ecom_day_split_ratio;

-- 2. Rename bnm_day_split_ratio to day_split_ratio
ALTER TABLE price_promo_opt.tb_day_split_opt
RENAME COLUMN bnm_day_split_ratio TO day_split_ratio;

-- 3. Change column type
ALTER TABLE price_promo_opt.tb_day_split_opt
ALTER COLUMN day_split_ratio TYPE numeric USING day_split_ratio::numeric;

-- 4. Relax NOT NULL constraints
ALTER TABLE price_promo_opt.tb_day_split_opt
ALTER COLUMN l3_cid DROP NOT NULL,
ALTER COLUMN "date" DROP NOT NULL,
ALTER COLUMN week_start_date DROP NOT NULL;

-- 5. Drop old index (if exists)
DROP INDEX IF EXISTS price_promo_opt.idx_l3cid_brandcid_weekstartdate_tb_day_split_opt;

-- 6. Create simplified index
CREATE INDEX idx_l3cid_weekstartdate_tb_day_split_opt
ON price_promo_opt.tb_day_split_opt (l3_cid, week_start_date);
