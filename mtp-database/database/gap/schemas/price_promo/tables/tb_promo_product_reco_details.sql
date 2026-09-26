--liquibase formatted sql
--changeset liquibase:tb_promo_product_reco_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_product_reco_details
CREATE TABLE price_promo.tb_promo_product_reco_details (
	product_level_id bigserial NOT NULL,
	product_level_value jsonb NULL,
	promo_id int4 NULL,
	CONSTRAINT tb_promo_product_reco_details_pk PRIMARY KEY (product_level_id)
);


--changeset vamsi.balaga@impactanalytics.co:tb_promo_product_reco_details_promo_id_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Create index on promo_id
CREATE INDEX tb_promo_product_reco_details_promo_id_idx ON price_promo.tb_promo_product_reco_details USING btree (promo_id);