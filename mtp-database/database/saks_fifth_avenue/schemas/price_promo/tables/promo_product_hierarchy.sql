--liquibase formatted sql
--changeset liquibase:promo_product_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_product_hierarchy - added index
CREATE TABLE price_promo.promo_product_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	CONSTRAINT promo_product_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX promo_product_hierarchy_idx ON price_promo.promo_product_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_product_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for promopromo_product_hierarchy_product

-- Alter the table to add the uuid column
ALTER TABLE price_promo.promo_product_hierarchy
    ADD COLUMN "uuid" uuid DEFAULT uuid_generate_v1() NOT NULL;

-- Create additional indexes as specified in DEV ENV
CREATE INDEX idx_promo_product_hierarchy_promo_id
    ON price_promo.promo_product_hierarchy USING btree (promo_id);
CREATE INDEX idx_promo_product_hierarchy 
    ON price_promo.promo_product_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);




--changeset sidharth.harish@impactanalytics.co:promo_product_hierarchy_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: removed columns and indexes
DROP INDEX if exists price_promo.promo_product_hierarchy_idx;
DROP INDEX if exists price_promo.idx_promo_product_hierarchy;
ALTER TABLE price_promo.promo_product_hierarchy DROP CONSTRAINT promo_product_hierarchy_pkey;
ALTER TABLE price_promo.promo_product_hierarchy DROP COLUMN hierarchy_level_id;
ALTER TABLE price_promo.promo_product_hierarchy DROP COLUMN hierarchy_level_name;
ALTER TABLE price_promo.promo_product_hierarchy DROP COLUMN hierarchy_value_id;
ALTER TABLE price_promo.promo_product_hierarchy DROP COLUMN hierarchy_value_name;
ALTER TABLE price_promo.promo_product_hierarchy DROP COLUMN "uuid";
ALTER TABLE price_promo.promo_product_hierarchy ADD hierarchy_id int8 NULL;

CREATE INDEX promo_product_hierarchy_promo_id_idx ON price_promo.promo_product_hierarchy (promo_id);
CREATE INDEX promo_product_hierarchy_hierarchy_id_idx ON price_promo.promo_product_hierarchy (hierarchy_id);

