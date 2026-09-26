--liquibase formatted sql
--changeset liquibase:promo_store_sg_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_store_sg_hierarchy

CREATE TABLE price_promo.promo_store_sg_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	CONSTRAINT promo_store_pg_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX promo_store_pg_hierarchy_idx ON price_promo.promo_store_sg_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);



--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_store_sg_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.promo_store_sg_hierarchy

-- Drop the existing primary key constraint
ALTER TABLE price_promo.promo_store_sg_hierarchy
DROP CONSTRAINT promo_store_pg_hierarchy_pkey;

-- Drop the existing index
DROP INDEX IF EXISTS promo_store_pg_hierarchy_idx;

-- Drop existing columns
ALTER TABLE price_promo.promo_store_sg_hierarchy
	DROP COLUMN IF EXISTS hierarchy_level_id,
	DROP COLUMN IF EXISTS hierarchy_level_name,
	DROP COLUMN IF EXISTS hierarchy_value_id,
	DROP COLUMN IF EXISTS hierarchy_value_name;

-- Add the new columns
ALTER TABLE price_promo.promo_store_sg_hierarchy
	ADD COLUMN store_group_id int4 NOT NULL,
	ADD COLUMN store_group_name text NULL,
	ADD COLUMN hierarchy_level_id int8 NOT NULL,
    ADD COLUMN hierarchy_level_name text NULL,
    ADD COLUMN hierarchy_value_id int8 NOT NULL,
    ADD COLUMN hierarchy_value_name text NULL;

-- Add the new primary key constraint
ALTER TABLE price_promo.promo_store_sg_hierarchy
	ADD CONSTRAINT promo_store_sg_hierarchy_pkey PRIMARY KEY (promo_id, store_group_id, hierarchy_level_id, hierarchy_value_id);

-- Create indexes
CREATE INDEX idx_promo_store_sg_hierarchy_promo_id
	ON price_promo.promo_store_sg_hierarchy USING btree (promo_id);
CREATE INDEX idx_promo_store_sg_hierarchy_promo_sg_id
	ON price_promo.promo_store_sg_hierarchy USING btree (promo_id, store_group_id);
CREATE INDEX idx_promo_store_sg_hierarchy_combined
	ON price_promo.promo_store_sg_hierarchy USING btree (promo_id, store_group_id, hierarchy_level_id, hierarchy_value_id);



--changeset sidharth.harish@impactanalytics.co:promo_store_sg_hierarchy_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: varchar to text
ALTER TABLE price_promo.promo_store_sg_hierarchy ALTER COLUMN store_group_name TYPE text USING store_group_name::text;
ALTER TABLE price_promo.promo_store_sg_hierarchy ALTER COLUMN hierarchy_value_name TYPE text USING hierarchy_value_name::text;
