--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:so5_integration_product_group_details  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for so5_integration_product_group_details


CREATE TABLE price_promo.so5_integration_product_group_details (
	product_group_id varchar NULL,
	"name" varchar NULL,
	department varchar NULL,
	"class" varchar NULL,
	mfg varchar NULL,
	svs varchar NULL,
	"action" varchar NULL,
	is_excluded bool NULL,
	updated_at timestamp NULL DEFAULT now(),
	promo_id int4 NULL,
	id bigserial NOT NULL
);