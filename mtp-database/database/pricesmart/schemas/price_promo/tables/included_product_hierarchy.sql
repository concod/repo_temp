--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:included_product_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for included_product_hierarchy

CREATE TABLE price_promo.included_product_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name text NULL,
	CONSTRAINT included_product_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX included_product_hierarchy_idx ON price_promo.included_product_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);