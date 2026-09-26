--liquibase formatted sql
--changeset liquibase:promo_status_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_status_config
CREATE TABLE "price_promo"."promo_status_config" (
    status_id int4 NULL,
    status_name varchar NULL,
    status_type int2 NULL DEFAULT 0,
    display_order int2 NULL
)
;


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_status_config_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.promo_status_config


-- Step 1: Drop existing columns if they exist
ALTER TABLE price_promo.promo_status_config
     DROP COLUMN IF EXISTS status_id,
    DROP COLUMN IF EXISTS status_name;


-- Step 3: Add columns with correct types
ALTER TABLE price_promo.promo_status_config
    ADD COLUMN status_id int4 NOT NULL,
    ADD COLUMN status_name price_promo.promo_status_name_enum NULL;


-- Step 5: Add the unique constraint
ALTER TABLE price_promo.promo_status_config
    ADD CONSTRAINT promo_status_config_ukey UNIQUE (status_id, status_name);

-- Step 6: Ensure the primary key constraint
ALTER TABLE price_promo.promo_status_config
    ADD CONSTRAINT promo_status_config_pkey PRIMARY KEY (status_id);

-- Step 7: Create the necessary indexes
CREATE INDEX idx_promo_status_id 
    ON price_promo.promo_status_config USING btree (status_id);


