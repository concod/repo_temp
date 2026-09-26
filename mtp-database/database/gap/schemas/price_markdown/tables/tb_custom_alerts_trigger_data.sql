--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_custom_alerts_trigger_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_trigger_data

CREATE TABLE price_markdown.tb_custom_alerts_trigger_data (
	alert_id int4 NOT NULL,
	strategy_id int4 NOT NULL,
	current_pcd_id int4 NOT NULL,
	measured_by int4 NOT NULL,
	display_alert int4 NOT NULL,
	triggered_on date NULL,
	alert_condition_chk varchar NULL
);


--changeset surya.avinash@impactanalytics.co:tb_custom_alerts_trigger_data_v020425 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding is_notification_sent column

alter table price_markdown.tb_custom_alerts_trigger_data
add column is_notification_sent int4 not null;

--changeset keerthana.reddy@impactanalytics.co:tb_custom_alerts_trigger_data_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown.tb_custom_alerts_trigger_data
ADD COLUMN currency_id int8;
