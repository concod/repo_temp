--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_metrics stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_metrics

CREATE TABLE price_markdown.tb_custom_alerts_metrics (
	alert_id int4 NOT NULL,
	operator_id int4 NOT NULL,
	metric_id int4 NOT NULL,
	logical_operator text NULL,
	threshold_value int8 NOT NULL,
	CONSTRAINT pk_alert_operator_metric PRIMARY KEY (alert_id, operator_id, metric_id),
	CONSTRAINT fk_alert FOREIGN KEY (alert_id) REFERENCES price_markdown.tb_custom_alerts_master(alert_id) ON DELETE CASCADE,
	CONSTRAINT fk_metric FOREIGN KEY (metric_id) REFERENCES price_markdown.tb_custom_alerts_metric_config(metric_id) ON DELETE CASCADE,
	CONSTRAINT fk_operator FOREIGN KEY (operator_id) REFERENCES price_markdown.tb_custom_alerts_operator_config(operator_id) ON DELETE CASCADE
);

--changeset utkarsh.tiwari@impactanalytics.co:tb_custom_alerts_metrics_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_custom_alerts_metrics_1.
ALTER TABLE price_markdown.tb_custom_alerts_metrics
ALTER COLUMN threshold_value TYPE float8 USING threshold_value::float8;
