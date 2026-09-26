--liquibase formatted sql
--changeset liquibase:tb_promo_store_reco_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_store_reco_details
CREATE TABLE price_promo.tb_promo_store_reco_details (
	store_level_id bigserial NOT NULL,
	store_level_value jsonb NULL,
	promo_id int4 NULL,
	CONSTRAINT tb_promo_store_reco_details_pk PRIMARY KEY (store_level_id)
);