--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tb_event_date_basketdetails stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_event_date_basketdetails	

CREATE TABLE price_promo.tb_event_date_basketdetails (
	event_id int4 NOT NULL,
	"date" date NOT NULL,
	event_offer_txn float8 NULL,
	event_offer_units_per_txn float8 NULL,
	event_offer_avg_basket_size float8 NULL,
	event_offer_avg_margin float8 NULL,
	event_offer_units float8 NULL,
	event_offer_revenue float8 NULL,
	event_offer_margin float8 NULL
);
