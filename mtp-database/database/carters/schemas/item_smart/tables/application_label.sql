--liquibase formatted sql
--changeset rahul.chodvadiya@impactanalytics.co:application_label_1 stripComments:false splitStatements:false context:Release_1_2 labels:add_download_key
--comment: map kpi with thier app labels in monthly view download

CREATE TABLE IF NOT EXISTS item_smart.application_label (
	label_id serial4 NOT NULL,
	kpi varchar NULL,
	application_label_name varchar NULL,
	key_name varchar(50) NULL
);

ALTER TABLE item_smart.application_label
ADD COLUMN IF NOT EXISTS download_key VARCHAR(70) DEFAULT '' NOT NULL;

