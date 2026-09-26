--liquibase formatted sql
--changeset harshitha.sv@impactanalytics.co:alerts_config_table_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_config_table_v1
--comment: initial changeset for alerts_config_table VS intl
CREATE TABLE IF NOT EXISTS inventory_smart.alerts_config_table (
	article varchar NULL,
	product_lifecycle varchar NULL,
	channel varchar NULL,
	alert_name varchar NULL,
	launch_date date NULL,
	launch_floorset varchar NULL,
	floorset_start_date date NULL,
	floorset_end_date date NULL,
	ship_date date NULL,
	delta int4 NULL,
	buffer int4 NULL,
	alert_start_date date NULL,
	alert_end_date date NULL,
	plan_id varchar NULL,
	promised_reco_days varchar NULL
);

--changeset harshitha.sv@impactanalytics.co:alerts_config_table_v2 stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_config_table_v2
--comment: renaming and adding columns
alter table inventory_smart.alerts_config_table rename column launch_date to start_date;
alter table inventory_smart.alerts_config_table add column end_date DATE;
alter table inventory_smart.alerts_config_table add column lead_time INTEGER;

--changeset kanishka.parashar@impactanalytics.co:alerts_config_table_v3 stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_config_table_v2
--comment: updating data type
ALTER TABLE inventory_smart.alerts_config_table ALTER COLUMN promised_reco_days TYPE int4 USING promised_reco_days::int4;
