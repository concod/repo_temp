--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_promo_basketdetails stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for creating the price_promo.tb_promo_basketdetails table


CREATE TABLE price_promo.tb_promo_basketdetails (
	promo_id int4 NOT NULL,
	promo_offer_txn float8 NULL,
	promo_offer_units_per_txn float8 NULL,
	promo_offer_avg_basket_size float8 NULL,
	promo_offer_avg_margin float8 NULL,
	promo_offer_units float8 NULL,
	promo_offer_revenue float8 NULL,
	promo_offer_margin float8 NULL,
	CONSTRAINT promo_basket_pk PRIMARY KEY (promo_id)
);
CREATE INDEX promo_id_idx_tpb ON price_promo.tb_promo_basketdetails USING btree (promo_id);