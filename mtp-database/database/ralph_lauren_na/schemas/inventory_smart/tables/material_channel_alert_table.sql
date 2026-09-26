--liquibase formatted sql
--changeset jugal.mehra@impactanalytics.co:material_channel_alert_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.material_channel_alert_table definition

CREATE TABLE inventory_smart.material_channel_alert_table (
	article text NOT NULL,
	store_code text NOT NULL,
	channel text NULL,
	alert_name text NULL,
	CONSTRAINT material_channel_alert_table_un UNIQUE (article,store_code,channel),
	CONSTRAINT material_channel_alert_table_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE NOT VALID
);


--changeset jugal.mehra@impactanalytics.co:material_channel_alert_table_change stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-57594
--comment: change column name from alert_name to alert MTP-57594

ALTER TABLE inventory_smart.material_channel_alert_table RENAME COLUMN alert_name TO alert;

--changeset jugal.mehra@impactanalytics.co:material_channel_alert_table_change_column_name stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-58063
--comment: change column name from alert to alert_name again MTP-58063

ALTER TABLE inventory_smart.material_channel_alert_table RENAME COLUMN alert TO alert_name;
