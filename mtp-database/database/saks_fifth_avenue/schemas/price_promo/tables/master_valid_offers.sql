--liquibase formatted sql
--changeset liquibase:master_valid_offers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for master_valid_offers

CREATE TABLE price_promo.master_valid_offers (
	offer_type varchar(100) NULL,
	offer_value varchar(100) NULL,
	offer_identifier varchar(100) NULL,
	discount_filter float8 NULL
);
CREATE INDEX master_offers_offer_discount_idx ON price_promo.master_valid_offers USING btree (offer_type, discount_filter);



--changeset vaibhav:master_valid_offers_version_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: version_2 master_valid_offers

ALTER TABLE price_promo.master_valid_offers
ADD COLUMN offer_x_value DOUBLE PRECISION NULL,
ADD COLUMN offer_x_type VARCHAR(100) NULL,
ADD COLUMN offer_y_value DOUBLE PRECISION NULL,
ADD COLUMN offer_y_type VARCHAR(100) NULL,
ADD COLUMN offer_z_value DOUBLE PRECISION NULL,
ADD COLUMN offer_z_type VARCHAR(100) NULL;

ALTER TABLE price_promo.master_valid_offers
DROP COLUMN offer_value;

DROP INDEX IF EXISTS price_promo.master_offers_offer_discount_idx;

CREATE INDEX master_valid_offers_discount_filter_idx
ON price_promo.master_valid_offers USING btree (discount_filter);

DROP INDEX IF EXISTS price_promo.master_valid_offers_offer_type_idx;
CREATE INDEX master_valid_offers_offer_type_idx
ON price_promo.master_valid_offers USING btree (offer_type, offer_x_value, offer_x_type, offer_y_value, offer_y_type, offer_z_value, offer_z_type);
