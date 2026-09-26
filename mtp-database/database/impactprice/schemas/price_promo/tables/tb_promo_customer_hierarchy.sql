--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_promo_customer_hierarchy  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_promo_customer_hierarchy

CREATE TABLE IF NOT EXISTS price_promo.tb_promo_customer_hierarchy (
	promo_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name text NULL,
	CONSTRAINT tb_promo_customer_hierarchy_pkey PRIMARY KEY (promo_id, hierarchy_level_id, hierarchy_value_id)
);