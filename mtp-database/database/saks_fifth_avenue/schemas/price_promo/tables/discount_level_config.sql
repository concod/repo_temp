--liquibase formatted sql
--changeset liquibase:discount_level_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for discount_level_config

CREATE TABLE price_promo.discount_level_config (
	discount_level_id int4 NOT NULL,
	discount_level_value varchar NOT NULL,
	CONSTRAINT discount_level_id_pkey PRIMARY KEY (discount_level_id)
);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:discount_level_config_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.discount_level_config


-- Drop existing constraints and indexes that need to be replaced
ALTER TABLE price_promo.discount_level_config
    DROP CONSTRAINT IF EXISTS discount_level_id_pkey;

-- Step 1: Drop all columns
ALTER TABLE price_promo.discount_level_config
    DROP COLUMN IF EXISTS discount_level_value;


-- Step 3: Add columns with correct types and order
ALTER TABLE price_promo.discount_level_config
    ADD COLUMN discount_level_value price_promo.discount_level_value_enum NOT NULL;
    

-- Step 5: Add the composite primary key constraint
ALTER TABLE price_promo.discount_level_config
    ADD CONSTRAINT discount_level_pkey PRIMARY KEY (discount_level_id, discount_level_value);

-- Step 6: Create the necessary indexes
CREATE INDEX idx_discount_level_id ON price_promo.discount_level_config USING btree (discount_level_id);
CREATE INDEX idx_discount_level_value ON price_promo.discount_level_config USING btree (discount_level_value);



--changeset abhishek.singh@impactanalytics.co:discount_level_config_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.discount_level_config

-- Step 1: Drop the existing index on discount_level_value
DROP INDEX IF EXISTS idx_discount_level_value;

-- Step 2: Alter the column type from discount_level_value_enum to VARCHAR
ALTER TABLE price_promo.discount_level_config
    DROP COLUMN IF EXISTS discount_level_value;
    
ALTER TABLE price_promo.discount_level_config
    ADD COLUMN discount_level_value VARCHAR NOT NULL;

-- Step 3: Recreate the index on discount_level_value
CREATE INDEX idx_discount_level_value ON price_promo.discount_level_config USING btree (discount_level_value);
