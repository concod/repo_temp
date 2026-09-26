--liquibase formatted sql
--changeset liquibase:tb_special_offers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_special_offers
CREATE TABLE price_promo.tb_special_offers (
	id serial4 NOT NULL,
	offer_name varchar NOT NULL,
	offer_display_name varchar NOT NULL,
	is_active bool DEFAULT true NULL,
	customer_reach int4 NULL,
	customer_redemption_rate int4 NULL,
	discount_type_id int4 NULL,
	discount_value float8 NULL,
	CONSTRAINT tb_special_offers_pk PRIMARY KEY (id)
);