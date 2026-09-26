--liquibase formatted sql
--changeset liquibase:event_model  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for event_model
CREATE TYPE price_promo.event_model AS (
	"name" text,
	start_date date,
	end_date date,
	submit_offers_by date,
	marketing_notes text,
	event_ad_type text,
	event_type text,
	event_objective text,
	created_by int4,
	date_restriction price_promo.date_restriction,
	product_restriction price_promo.product_restriction,
	store_restriction price_promo.store_restriction,
	product_exclusion price_promo.product_exclusion);