--liquibase formatted sql
--changeset liquibase:ps_scenario_discounts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_scenario_discounts

CREATE TABLE price_promo.ps_scenario_discounts (
	id bigserial NOT NULL,
	scenario_id int4 NOT NULL,
	discount_level_value int8 NULL DEFAULT 0,
	offer_value varchar(100) NULL DEFAULT NULL::character varying,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	is_deleted int2 NULL DEFAULT 0,
	offer_type varchar(100) NULL,
	offer_type_id int4 NULL,
	offer_x_value int4 NULL,
	offer_y_value float8 NULL,
	offer_z_value float8 NULL,
	CONSTRAINT ps_scenario_discounts_pkey PRIMARY KEY (id)
);
CREATE INDEX scenario_id_idx ON price_promo.ps_scenario_discounts USING btree (scenario_id);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_scenario_discounts_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_scenario_discounts table to match the DEV environment schema by dropping existing columns and indexes, then recreating them

-- Alter the table to drop existing columns
ALTER TABLE price_promo.ps_scenario_discounts
    DROP COLUMN IF EXISTS scenario_id,
    DROP COLUMN IF EXISTS discount_level_value,
    DROP COLUMN IF EXISTS offer_value,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS is_deleted,
    DROP COLUMN IF EXISTS offer_type,
    DROP COLUMN IF EXISTS offer_type_id,
    DROP COLUMN IF EXISTS offer_x_value,
    DROP COLUMN IF EXISTS offer_y_value,
    DROP COLUMN IF EXISTS offer_z_value;

-- Add the new columns according to the DEV environment specification
ALTER TABLE price_promo.ps_scenario_discounts
    ADD COLUMN promo_id int4 NOT NULL,
    ADD COLUMN scenario_id int8 NOT NULL,
    ADD COLUMN discount_level_value int8 NULL,
    ADD COLUMN offer_type_id int4 NULL,
    ADD COLUMN offer_type varchar(100) NULL,
    ADD COLUMN offer_x_value float8 NULL,
    ADD COLUMN offer_x_type varchar(100) NULL,
    ADD COLUMN offer_y_value float8 NULL,
    ADD COLUMN offer_y_type varchar(100) NULL,
    ADD COLUMN offer_z_value float8 NULL,
    ADD COLUMN offer_z_type varchar(100) NULL,
    ADD COLUMN tier_id int4 NULL,
    ADD COLUMN offer_type_combined_display_name varchar(100) NULL,
    ADD COLUMN created_by int4 NOT NULL,
    ADD COLUMN created_at timestamptz NOT NULL;


-- Drop existing constraints
ALTER TABLE price_promo.ps_scenario_discounts
    DROP CONSTRAINT IF EXISTS ps_scenario_discounts_pkey,
    DROP CONSTRAINT IF EXISTS ps_scenario_discounts_ukey;

-- Add primary key constraint
ALTER TABLE price_promo.ps_scenario_discounts
    ADD CONSTRAINT ps_scenario_discounts_pkey PRIMARY KEY (id);

-- Add unique constraint
ALTER TABLE price_promo.ps_scenario_discounts
    ADD CONSTRAINT ps_scenario_discounts_ukey UNIQUE (promo_id, scenario_id, discount_level_value);

-- Add foreign key constraints
ALTER TABLE price_promo.ps_scenario_discounts 
    ADD CONSTRAINT fk_ps_scenario_discounts_tier_id 
    FOREIGN KEY (tier_id) 
    REFERENCES price_promo.tier_master(tier_id) 
    ON DELETE SET NULL;

ALTER TABLE price_promo.ps_scenario_discounts 
    ADD CONSTRAINT fk_tier_discounts_scenario_id 
    FOREIGN KEY (promo_id, scenario_id) 
    REFERENCES price_promo.scenario_master(promo_id, scenario_id) 
    ON DELETE CASCADE;

-- Drop existing indexes
DROP INDEX IF EXISTS scenario_id_idx;

-- Create new indexes
CREATE INDEX ps_scenario_discounts_promo_scenario_idx 
    ON price_promo.ps_scenario_discounts (promo_id, scenario_id);



--changeset abhishek.singh@impactanalytics.co:ps_scenario_discounts_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_scenario_discounts table remove tier_id from foreign key

ALTER TABLE price_promo.ps_scenario_discounts 
DROP CONSTRAINT fk_ps_scenario_discounts_tier_id;
