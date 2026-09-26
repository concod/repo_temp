--liquibase formatted sql
--changeset liquibase:bxgy_percentage stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for bxgy_percentage

CREATE TABLE price_promo.bxgy_percentage (
	offer_type varchar(100) NULL,
	offer_value varchar(100) NULL,
	percentage float8 NULL,
	discount_filter float8 NULL
);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bxgy_percentage_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.bxgy_percentage

-- Step 1: Drop all columns
ALTER TABLE price_promo.bxgy_percentage 
    DROP COLUMN IF EXISTS offer_type,
    DROP COLUMN IF EXISTS offer_value,
    DROP COLUMN IF EXISTS percentage;


-- Step 3: Add columns with correct types and order
ALTER TABLE price_promo.bxgy_percentage
    ADD COLUMN offer_type price_promo.offer_type_enum NOT NULL,
    ADD COLUMN offer_value price_promo.offer_value_enum NOT NULL,
    ADD COLUMN percentage float8 NULL;


-- Step 4: Add the primary key constraint
ALTER TABLE price_promo.bxgy_percentage
    ADD CONSTRAINT bxgy_percentage_pkey PRIMARY KEY (offer_type, offer_value);

-- Step 5: Create the necessary indexes
CREATE INDEX idx_bxgy_percentage_discount_filter 
    ON price_promo.bxgy_percentage USING btree (discount_filter);
CREATE INDEX idx_bxgy_percentage_offer_type 
    ON price_promo.bxgy_percentage USING btree (offer_type);
CREATE INDEX idx_bxgy_percentage_offer_value 
    ON price_promo.bxgy_percentage USING btree (offer_value);


