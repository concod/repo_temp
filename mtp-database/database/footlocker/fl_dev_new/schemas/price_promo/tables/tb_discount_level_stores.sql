--liquibase formatted sql
--changeset liquibase:tb_discount_level_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_discount_level_stores
CREATE TABLE price_promo.tb_discount_level_stores (
	store_level_id int8 NULL,
	store_id int4 NULL,
	CONSTRAINT tb_discount_level_stores_tb_promo_store_reco_details_fk FOREIGN KEY (store_level_id) REFERENCES price_promo.tb_promo_store_reco_details(store_level_id) ON DELETE CASCADE
);
