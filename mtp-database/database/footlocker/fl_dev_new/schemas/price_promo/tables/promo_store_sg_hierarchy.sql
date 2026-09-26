--liquibase formatted sql
--changeset liquibase:promo_store_sg_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_store_sg_hierarchy

CREATE TABLE price_promo.promo_store_sg_hierarchy (
	promo_id int4 NOT NULL,
	store_group_id int4 NOT NULL,
	store_group_name text NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name text NULL,
	"uuid" varchar(50) NULL,
	CONSTRAINT promo_store_pg_hierarchy_pkey PRIMARY KEY (promo_id, store_group_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX promo_store_pg_hierarchy_idx ON price_promo.promo_store_sg_hierarchy USING btree (promo_id, store_group_id, hierarchy_level_id, hierarchy_value_id);