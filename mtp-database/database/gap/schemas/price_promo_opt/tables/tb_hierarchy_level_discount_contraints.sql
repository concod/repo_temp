--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:tb_hierarchy_level_discount_contraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_hierarchy_level_discount_contraints


CREATE TABLE price_promo_opt.tb_hierarchy_level_discount_contraints (
	product_discount_level_id int4 NOT NULL,
	products_on_max_upto_percent float8 NULL,
	CONSTRAINT tb_hierarchy_level_discount_contraints_pkey PRIMARY KEY (product_discount_level_id)
);