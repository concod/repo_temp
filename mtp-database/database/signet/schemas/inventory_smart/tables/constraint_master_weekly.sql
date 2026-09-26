--liquibase formatted sql
--changeset kakumanu.abhishek@impactanalytics.co:constraint_master_weekly stripComments:false splitStatements:false context:Release_1_0 labels:constraint_master_weekly
--comment: initial changeset for constraint_master_weekly
CREATE TABLE IF NOT EXISTS inventory_smart.constraint_master_weekly (
	fiscal_year_week int4 NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	channel varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 NOT NULL DEFAULT 0,
	max_stock float4 NOT NULL DEFAULT 0,
	aps float4 NULL,
	ros float4 NULL,
	flag varchar NULL,
	user_adjusted_forecast float4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	mapping_code int4 NULL,
	CONSTRAINT cmw_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT cmw_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT cmw_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT cmw_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (fiscal_year_week);


--changeset ashish@impactanalytics.co:l0_l1_nulls stripComments:false splitStatements:false context:Release_1_0 labels:constraint_validity_master_weekly_partition_logic
--comment: initial changeset for constraint_validity_master_weekly l0_l1_nulls
ALTER TABLE inventory_smart.constraint_master_weekly ALTER COLUMN l0_name DROP NOT NULL;
ALTER TABLE inventory_smart.constraint_master_weekly ALTER COLUMN l1_name DROP NOT NULL;

--changeset kakumanu.abhishek@impactanalytics.co:drop_1 and add columns stripComments:false splitStatements:false context:Release_1_0 labels:dropping user_adj_fcst and adding upload_flag
--comment: initial changeset for dropping user_adj_fcst and adding upload_flag
ALTER TABLE inventory_smart.constraint_master_weekly DROP COLUMN user_adjusted_forecast;
ALTER TABLE inventory_smart.constraint_master_weekly ADD IF NOT EXISTS upload_flag varchar DEFAULT false NOT NULL;