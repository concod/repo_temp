--liquibase formatted sql
--changeset liquibase:promo_product_pg_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_product_pg_hierarchy

CREATE TABLE price_promo.promo_product_pg_hierarchy (
	promo_id int4 NOT NULL,
	product_group_id int4 NOT NULL,
	product_group_name varchar(100) NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	CONSTRAINT promo_product_pg_hierarchy_pkey PRIMARY KEY (promo_id, product_group_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX promo_product_pg_hierarchy_idx ON price_promo.promo_product_pg_hierarchy USING btree (promo_id, product_group_id, hierarchy_level_id, hierarchy_value_id);