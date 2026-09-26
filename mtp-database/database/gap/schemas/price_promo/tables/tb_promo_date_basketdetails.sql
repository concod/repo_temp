--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tb_promo_date_basketdetails stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_date_basketdetails

CREATE TABLE price_promo.tb_promo_date_basketdetails (
	promo_id int4 NOT NULL,
	"date" date NOT NULL,
	promo_offer_txn float8 NULL,
	promo_offer_units_per_txn float8 NULL,
	promo_offer_avg_basket_size float8 NULL,
	promo_offer_avg_margin float8 NULL,
	promo_offer_units float8 NULL,
	promo_offer_revenue float8 NULL,
	promo_offer_margin float8 NULL
);
CREATE INDEX promo_id_idx_tpdb ON price_promo.tb_promo_date_basketdetails USING btree (promo_id);