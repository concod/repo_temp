--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_metrics stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_metrics

CREATE TABLE price_markdown.tb_custom_alerts_metrics (
	alert_id int4 NOT NULL,
	operator_id int4 NOT NULL,
	metric_id int4 NOT NULL,
	logical_operator text NULL,
	threshold_value int8 NOT NULL,
	CONSTRAINT fk_alert FOREIGN KEY (alert_id) REFERENCES price_markdown.tb_custom_alerts_master(alert_id) ON DELETE CASCADE,
	CONSTRAINT fk_metric FOREIGN KEY (metric_id) REFERENCES price_markdown.tb_custom_alerts_metric_config(metric_id) ON DELETE CASCADE,
	CONSTRAINT fk_operator FOREIGN KEY (operator_id) REFERENCES price_markdown.tb_custom_alerts_operator_config(operator_id) ON DELETE CASCADE
);