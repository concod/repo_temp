--liquibase formatted sql
--changeset liquibase:promo_store_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_store_hierarchy - added index
CREATE TABLE price_promo.promo_store_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name text NULL,
	"uuid" uuid DEFAULT uuid_generate_v1() NOT NULL,
	CONSTRAINT promo_store_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX promo_store_hierarchy_idx ON price_promo.promo_store_hierarchy USING btree (promo_id, hierarchy_level_id, hierarchy_value_id);