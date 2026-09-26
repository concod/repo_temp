--liquibase formatted sql
--changeset liquibase:promo_product_pg_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_product_pg_hierarchy

CREATE TABLE price_promo.promo_product_pg_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	CONSTRAINT promo_product_pg_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX promo_product_pg_hierarchy_idx ON price_promo.promo_product_pg_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_product_pg_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for promo_product_pg_hierarchy

-- Drop the existing primary key constraint
ALTER TABLE price_promo.promo_product_pg_hierarchy
DROP CONSTRAINT promo_product_pg_hierarchy_pkey;

-- Drop the existing index
DROP INDEX IF EXISTS promo_product_pg_hierarchy_idx;


-- Add the new columns
ALTER TABLE price_promo.promo_product_pg_hierarchy
	ADD COLUMN product_group_id int4 NOT NULL,
	ADD COLUMN product_group_name varchar(100) NULL;


-- Add the new primary key constraint
ALTER TABLE price_promo.promo_product_pg_hierarchy
	ADD CONSTRAINT promo_product_pg_hierarchy_pkey PRIMARY KEY (promo_id, product_group_id, hierarchy_level_id, hierarchy_value_id);

-- Add the new indexes
CREATE INDEX idx_product_pg_hierarchy_promo_id
	ON price_promo.promo_product_pg_hierarchy USING btree (promo_id);
CREATE INDEX idx_promo_product_pg_hierarchy_promo_pg_id
	ON price_promo.promo_product_pg_hierarchy USING btree (promo_id, product_group_id);
CREATE INDEX idx_promo_product_pg_hierarchy_combined
	ON price_promo.promo_product_pg_hierarchy USING btree (promo_id, product_group_id, hierarchy_level_id, hierarchy_value_id);

