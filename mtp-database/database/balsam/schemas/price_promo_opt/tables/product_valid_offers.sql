--liquibase formatted sql
--changeset liquibase:product_valid_offers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_valid_offers


CREATE TABLE price_promo_opt.product_valid_offers (
	offer_type text NULL,
	currency_id integer NULL,
	offer_x_value float4 NULL,
	offer_x_type text NULL,
	offer_y_value int4 NULL,
	offer_y_type text NULL,
	offer_z_value int4 NULL,
	offer_z_type text NULL,
	offer_identifier text NULL,
	discount_filter float4 NULL,
	offer_type_combined_display_name text NULL,
	product_id int4 NULL
);