--liquibase formatted sql
--changeset ishaan.singh@impactanalytics.co:material_channel_alert_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.material_channel_alert_table definition

CREATE TABLE inventory_smart.material_channel_alert_table (
	article text NOT NULL,
	store_code text NOT NULL,
	channel text NULL,
	alert_name text NULL,
	CONSTRAINT material_channel_alert_table_un UNIQUE (article,store_code,channel),
	CONSTRAINT material_channel_alert_table_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE NOT VALID
);


