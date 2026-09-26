--liquibase formatted sql
--changeset liquibase:tb_promo_product_reco_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_product_reco_details
CREATE TABLE price_promo.tb_promo_product_reco_details (
	product_level_id bigserial NOT NULL,
	product_level_value jsonb NULL,
	promo_id int4 NULL,
	CONSTRAINT tb_promo_product_reco_details_pk PRIMARY KEY (product_level_id)
);