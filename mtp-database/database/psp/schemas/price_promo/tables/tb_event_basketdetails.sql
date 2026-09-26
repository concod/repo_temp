--liquibase formatted sql
--changeset anshika.mungiya@impactanalytics.co:tb_event_basketdetails_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_event_basketdetails_v1	

CREATE TABLE price_promo.tb_event_basketdetails (
	event_id int4 NOT NULL,
	event_offer_txn float8 NULL,
	event_offer_units_per_txn float8 NULL,
	event_offer_avg_basket_size float8 NULL,
	event_offer_avg_margin float8 NULL,
	event_offer_units float8 NULL,
	event_offer_revenue float8 NULL,
	event_offer_margin float8 NULL,
	CONSTRAINT event_basket_pk PRIMARY KEY (event_id)
);
CREATE INDEX event_id_idx_tpb ON price_promo.tb_event_basketdetails USING btree (event_id);