--liquibase formatted sql
--changeset liquibase:tb_event_basketdetails stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_event_basketdetails

CREATE TABLE price_promo.tb_event_basketdetails (
	event_id int4 NOT NULL,
	promo_offer_txn float8 NULL,
	promo_offer_units_per_txn float8 NULL,
	promo_offer_avg_basket_size float8 NULL,
	promo_offer_avg_margin float8 NULL,
	promo_offer_units float8 NULL,
	promo_offer_revenue float8 NULL,
	promo_offer_margin float8 NULL,
	CONSTRAINT event_basket_pk PRIMARY KEY (event_id)
);
CREATE INDEX event_id_idx_tpb ON price_promo.tb_event_basketdetails USING btree (event_id);

--changeset liquibase:tb_event_basketdetails_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: renamed columns
ALTER TABLE price_promo.tb_event_basketdetails
    DROP COLUMN promo_offer_txn,
    DROP COLUMN promo_offer_units_per_txn,
    DROP COLUMN promo_offer_avg_basket_size,
    DROP COLUMN promo_offer_avg_margin,
    DROP COLUMN promo_offer_units,
    DROP COLUMN promo_offer_revenue,
    DROP COLUMN promo_offer_margin;

ALTER TABLE price_promo.tb_event_basketdetails
    ADD COLUMN event_offer_txn float8 NULL,
    ADD COLUMN event_offer_units_per_txn float8 NULL,
    ADD COLUMN event_offer_avg_basket_size float8 NULL,
    ADD COLUMN event_offer_avg_margin float8 NULL,
    ADD COLUMN event_offer_units float8 NULL,
    ADD COLUMN event_offer_revenue float8 NULL,
    ADD COLUMN event_offer_margin float8 NULL;