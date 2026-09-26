--liquibase formatted sql
--changeset liquibase:event_model_new_flow_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for event_model_new_flow_1


CREATE TYPE price_promo.event_model_new_flow AS (
	"name" text,
	start_date date,
	end_date date,
	submit_offers_by date,
	additional_attributes jsonb,
	created_by int4,
	date_restriction price_promo.date_restriction,
	product_restriction price_promo.product_restriction,
	store_restriction price_promo.store_restriction,
	product_exclusion price_promo.product_exclusion);