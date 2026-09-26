--liquibase formatted sql
--changeset liquibase:tb_customer_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_customer_type_config
CREATE TABLE "price_promo"."tb_customer_type_config" (
    id int4 NOT NULL,
    customer_type varchar NULL
)
;


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_customer_type_config_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.tb_customer_type_config

-- Step 1: Drop existing columns if they exist
ALTER TABLE price_promo.tb_customer_type_config
    DROP COLUMN IF EXISTS customer_type;

-- Step 3: Add columns with correct types
ALTER TABLE price_promo.tb_customer_type_config
    ADD COLUMN customer_type price_promo.customer_type_enum NULL;

-- Step 5: Add the unique constraint
ALTER TABLE price_promo.tb_customer_type_config
    ADD CONSTRAINT tb_customer_type_config_ukey UNIQUE (id, customer_type);

-- Step 6: Ensure the primary key constraint
ALTER TABLE price_promo.tb_customer_type_config
    ADD CONSTRAINT tb_customer_type_config_pkey PRIMARY KEY (id);


--changeset abhishek.singh@impactanalytics.co:tb_customer_type_config_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.tb_customer_type_config

ALTER TABLE price_promo.tb_customer_type_config
    DROP CONSTRAINT tb_customer_type_config_ukey;
ALTER TABLE price_promo.tb_customer_type_config
    DROP COLUMN IF EXISTS customer_type;
ALTER TABLE price_promo.tb_customer_type_config
    ADD COLUMN customer_type VARCHAR NULL;
    