--liquibase formatted sql
--changeset liquibase:master_valid_offers_0206 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for master_valid_offers


CREATE TABLE price_promo_opt.master_valid_offers (
	offer_type varchar NULL,
	currency_id int4 NULL,
	l0_id int4 NULL,
	offer_x_value float8 NULL,
	offer_x_type varchar NULL,
	offer_y_value int4 NULL,
	offer_y_type varchar NULL,
	offer_z_value int4 NULL,
	offer_z_type varchar NULL,
	offer_identifier varchar NULL,
	discount_filter float8 NULL,
	offer_type_combined_display_name varchar NULL
);