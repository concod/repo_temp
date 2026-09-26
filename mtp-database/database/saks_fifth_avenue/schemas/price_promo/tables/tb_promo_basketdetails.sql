--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_promo_basketdetails stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for creating the price_promo.tb_promo_basketdetails table


-- Create the table
CREATE TABLE price_promo.tb_promo_basketdetails (
    promo_id int4 NOT NULL,
    promo_offer_txn float8 NULL,
    promo_offer_units_per_txn float8 NULL,
    promo_offer_avg_basket_size float8 NULL,
    CONSTRAINT promo_basket_pk PRIMARY KEY (promo_id)
);

-- Create index on promo_id
CREATE INDEX promo_id_idx_tpb 
    ON price_promo.tb_promo_basketdetails USING btree (promo_id);

--changeset liquibase:tb_promo_basketdetails_v2 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added more columns, type set to text.
ALTER TABLE price_promo.tb_promo_basketdetails
    ADD COLUMN promo_offer_avg_margin float8 NULL,
    ADD COLUMN promo_offer_units float8 NULL,
    ADD COLUMN promo_offer_revenue float8 NULL,
    ADD COLUMN promo_offer_margin float8 NULL;
