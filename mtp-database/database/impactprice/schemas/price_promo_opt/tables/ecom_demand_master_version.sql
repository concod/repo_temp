--liquibase formatted sql
--changeset mohan.krishna@impactanalytics.co:ecom_demand_master_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ecom_demand_master_version


CREATE TABLE price_promo_opt.ecom_demand_master_version (
	order_date date NOT NULL,
	order_type varchar NULL,
	order_id varchar NOT NULL,
	total_paid_amount float8 NULL,
	total_line_discount_amount float8 NULL,
	total_overall_discount_amount float8 NULL,
	total_effective_discount_amount float8 NULL,
	total_demand_units int4 NULL,
	total_canceled_units int4 NULL,
	total_net_units int4 NULL,
	universal_sku_number varchar NOT NULL,
	universal_customer_choice_number varchar NOT NULL,
	total_current_price_net float8 NULL,
	total_original_price_net float8 NULL,
	version_code int4 NOT NULL,
	CONSTRAINT ecom_demand_master_key PRIMARY KEY (order_id, universal_sku_number, version_code)
)
PARTITION BY LIST (version_code);