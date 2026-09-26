--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_promo_stacked_offers_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_stacked_offers_mapping
CREATE TABLE price_promo.tb_promo_stacked_offers_mapping (
	promo_id int4 NOT NULL,
	stacked_promo_id int4 NOT NULL,
	overlap_duration int4 NOT NULL,
	stackable_type text NOT NULL,
	offer_type_combined_display_name text NULL
);