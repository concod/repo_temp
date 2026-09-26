--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:included_promo_pg_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for included_promo_pg_hierarchy

CREATE TABLE price_promo.included_promo_pg_hierarchy (
	promo_id int4 NOT NULL,
	product_group_id int4 NOT NULL,
	product_group_name text NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name text NULL
);
CREATE INDEX included_promo_pg_hierarchy_idx ON price_promo.included_promo_pg_hierarchy USING btree (promo_id, product_group_id, hierarchy_level_id, hierarchy_value_id);