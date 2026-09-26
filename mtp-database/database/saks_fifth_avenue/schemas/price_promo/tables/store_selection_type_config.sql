--liquibase formatted sql
--changeset liquibase:store_selection_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_selection_type_config
CREATE TABLE "price_promo"."store_selection_type_config" (
    id int4 NOT NULL,
    store_selection_type varchar NULL,
    store_selection_sub_type varchar NULL,
CONSTRAINT store_selection_type_config_pkey PRIMARY KEY (id)
)
;


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:store_selection_type_config_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.store_selection_type_config

ALTER TABLE price_promo.store_selection_type_config
    DROP CONSTRAINT IF EXISTS store_selection_type_config_pkey;
    
-- Step 1: Drop existing columns if they exist
ALTER TABLE price_promo.store_selection_type_config
    DROP COLUMN IF EXISTS store_selection_type,
    DROP COLUMN IF EXISTS store_selection_sub_type;

-- Step 3: Add columns with correct types
ALTER TABLE price_promo.store_selection_type_config
    ADD COLUMN store_selection_type price_promo.store_selection_type_enum NULL,
    ADD COLUMN store_selection_sub_type price_promo.store_selection_sub_type_enum NULL;

-- Step 5: Add the unique constraint
ALTER TABLE price_promo.store_selection_type_config
    ADD CONSTRAINT store_selection_type_config_ukey UNIQUE (id, store_selection_type, store_selection_sub_type);

-- Step 6: Ensure the primary key constraint
ALTER TABLE price_promo.store_selection_type_config
    ADD CONSTRAINT store_selection_type_config_pkey PRIMARY KEY (id);
