--liquibase formatted sql
--changeset liquibase:promo_store_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_store_hierarchy - added index
CREATE TABLE price_promo.promo_store_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	CONSTRAINT promo_store_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX promo_store_hierarchy_idx ON price_promo.promo_store_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_store_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for promo_store_hierarchy


-- Drop the existing primary key constraint
ALTER TABLE price_promo.promo_store_hierarchy
DROP CONSTRAINT promo_store_hierarchy_pkey;

-- Drop the existing index
DROP INDEX IF EXISTS promo_store_hierarchy_idx;

-- Drop existing columns not present in DEV ENV
ALTER TABLE price_promo.promo_store_hierarchy
    DROP COLUMN IF EXISTS "uuid";

-- Add the new columns
ALTER TABLE price_promo.promo_store_hierarchy
    ADD COLUMN "uuid" uuid DEFAULT uuid_generate_v1() NOT NULL;

-- Recreate the primary key constraint
ALTER TABLE price_promo.promo_store_hierarchy
    ADD CONSTRAINT promo_store_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id);

-- Recreate the indexes
CREATE INDEX idx_promo_store_hierarchy_promo_id
	ON price_promo.promo_store_hierarchy USING btree (promo_id);
CREATE INDEX idx_promo_store_hierarchy_combined
	ON price_promo.promo_store_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);


--changeset sidharth.harish@impactanalytics.co:promo_store_hierarchy_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: varchar to text
ALTER TABLE price_promo.promo_store_hierarchy ALTER COLUMN hierarchy_value_name TYPE text USING hierarchy_value_name::text;
