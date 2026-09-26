--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_strategy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_strategy_mapping

CREATE TABLE price_markdown.tb_custom_alerts_strategy_mapping (
	alert_id int4 NOT NULL,
	strategy_id int4 NOT NULL,
	measured_at varchar NOT NULL,
	measured_by int4 NOT NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT pk_alert_strategy PRIMARY KEY (alert_id, strategy_id),
	CONSTRAINT fk_alert_id FOREIGN KEY (alert_id) REFERENCES price_markdown.tb_custom_alerts_master(alert_id) ON DELETE CASCADE,
	CONSTRAINT fk_strategy_id FOREIGN KEY (strategy_id) REFERENCES price_markdown.tb_strategy_master(strategy_id) ON DELETE CASCADE
);
