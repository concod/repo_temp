--liquibase formatted sql
--changeset liquibase:product_selection_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_selection_type_config

CREATE TABLE "price_promo"."product_selection_type_config" (
    id int4 NOT NULL,
    product_selection_type varchar NULL,
    product_selection_sub_type varchar NULL,
CONSTRAINT product_selection_type_config_pkey PRIMARY KEY (id)
)
;


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:product_selection_type_config_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.product_selection_type_config

ALTER TABLE price_promo.product_selection_type_config
    DROP CONSTRAINT IF EXISTS product_selection_type_config_pkey;

-- Step 1: Drop all columns
ALTER TABLE price_promo.product_selection_type_config
    DROP COLUMN IF EXISTS product_selection_type,
    DROP COLUMN IF EXISTS product_selection_sub_type;

-- Step 3: Add columns with correct types and order
ALTER TABLE price_promo.product_selection_type_config
    ADD COLUMN product_selection_type price_promo.product_selection_type_enum NULL,
    ADD COLUMN product_selection_sub_type price_promo.product_selection_sub_type_enum NULL;

-- Step 5: Add the unique constraint
ALTER TABLE price_promo.product_selection_type_config
    ADD CONSTRAINT product_selection_type_config_ukey UNIQUE (id, product_selection_type, product_selection_sub_type);

-- Step 6: Ensure the primary key constraint
ALTER TABLE price_promo.product_selection_type_config
    ADD CONSTRAINT product_selection_type_config_pkey PRIMARY KEY (id);

-- Step 7: Create the necessary indexes
CREATE INDEX idx_product_selection_id 
    ON price_promo.product_selection_type_config USING btree (id);


