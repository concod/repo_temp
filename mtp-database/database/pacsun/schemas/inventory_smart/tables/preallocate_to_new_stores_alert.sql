--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:preallocate_to_new_stores_alert stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:pacsun_preallocate_to_new_stores_alert 
--comment: initial changeset for preallocate_to_new_stores_alert
CREATE TABLE IF NOT EXISTS inventory_smart.preallocate_to_new_stores_alert (
	store_code varchar NULL,
	store_name varchar NULL,
	store_code_name varchar NULL,
	s0_name varchar NULL,
	s1_id_name varchar NULL,
	s2_id_name varchar NULL,
	s3_id_name varchar NULL,
	country_name varchar NULL,
	state_name varchar NULL,
	opening_date date NULL,
	reservation_date date NULL,
	total_sku_count int4 NULL,
	approved_sku_count int4 NULL,
	released_sku_count int4 NULL,
	approval_needed varchar NULL,
	release_needed varchar NULL,
	new_store_reserve_flag int4 NULL,
	nsr_is_resolved int4 NULL,
	CONSTRAINT preallocate_to_new_stores_alert_pk PRIMARY KEY (store_code)
);

--changeset sreevathsa.sp:preallocate_to_new_stores_alert_add_columns stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_preallocate_to_new_stores_alert_add_columns
--comment: adding vi_date to preallocate_to_new_stores_alert
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS channel VARCHAR null;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS channel_name VARCHAR null;