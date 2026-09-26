--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:so5_integration_offer_execution_details  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for so5_integration_offer_execution_details

CREATE TABLE price_promo.so5_integration_offer_execution_details (
	ia_offer_id int8 NULL,
	offer_name varchar NULL,
	start_date date NULL,
	end_date date NULL,
	inclusion_product_group_id varchar NULL,
	exclusion_product_group_id varchar NULL,
	template_id varchar NULL,
	price_filter int8 NULL,
	target_folder varchar NULL,
	location_list _int4 NULL,
	eligibility_condition varchar NULL,
	eligibility_condition_value int8 NULL,
	limits int8 NULL,
	discount_type varchar NULL,
	discount_value float8 NULL,
	no_of_tiers int8 NULL,
	tier int8 NULL,
	promo_code varchar NULL,
	receipt_text_eng varchar NULL,
	receipt_text_fr varchar NULL,
	sfcc_pip_text varchar NULL,
	sfcc_drop_ship varchar NULL,
	sfcc_tender_type_promo_msg varchar NULL,
	sfcc_pip_customer_group varchar NULL,
	sfcc_customer_group varchar NULL,
	sfcc_pip_rank int8 NULL,
	sfcc_rank int8 NULL,
	sfcc_ats_check varchar NULL,
	promo_action varchar NULL,
	status varchar NULL,
	deploy bool NULL,
	updated_at timestamp DEFAULT now() NULL,
	id bigserial NOT NULL
);