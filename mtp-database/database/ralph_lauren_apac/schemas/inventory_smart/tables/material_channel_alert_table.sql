--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:material_channel_alert_table_changepk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.material_channel_alert_table_change_pk definition

CREATE TABLE inventory_smart.material_channel_alert_table (
	article text NOT NULL,
	store_code text NOT NULL,
	channel text NULL,
	alert_name text NULL,
	forecasting_channel varchar NULL,
	retail_region varchar NULL,
	CONSTRAINT material_channel_alert_table_un UNIQUE (article, store_code, channel,alert_name)
);


-- inventory_smart.material_channel_alert_table foreign keys

ALTER TABLE inventory_smart.material_channel_alert_table ADD CONSTRAINT material_channel_alert_table_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;


