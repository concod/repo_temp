--liquibase formatted sql
--changeset liquibase:master_valid_offers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for master_valid_offers

CREATE TABLE price_promo.master_valid_offers (
	offer_type varchar NULL,
	offer_x_value float8 NULL,
	offer_x_type varchar NULL,
	offer_y_value float8 NULL,
	offer_y_type varchar NULL,
	offer_z_value float8 NULL,
	offer_z_type varchar NULL,
	offer_identifier varchar NULL,
	discount_filter float8 NULL,
	offer_type_combined_display_name text NULL
);
CREATE INDEX master_valid_offers_discount_filter_idx ON price_promo.master_valid_offers USING btree (discount_filter);
CREATE INDEX master_valid_offers_offer_type_idx ON price_promo.master_valid_offers USING btree (offer_type, offer_x_value, offer_x_type, offer_y_value, offer_y_type, offer_z_value, offer_z_type);