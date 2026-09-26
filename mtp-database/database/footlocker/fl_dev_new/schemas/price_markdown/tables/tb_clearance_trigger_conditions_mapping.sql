--liquibase formatted sql
--changeset liquibase:tb_clearance_trigger_conditions_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_conditions_mapping

CREATE TABLE price_markdown.tb_clearance_trigger_conditions_mapping (
	trigger_id int4 NOT NULL,
	metric_id int4 NOT NULL,
	timeframe_id int4 NOT NULL,
	operator_id int4 NOT NULL,
	logical_operator text NULL,
	threshold_value_1 float8 NOT NULL,
	threshold_value_2 float8 NULL,
	CONSTRAINT tb_clearance_trigger_conditions_mapping_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES price_markdown.tb_clearance_trigger_metric_config(metric_id),
	CONSTRAINT tb_clearance_trigger_conditions_mapping_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES price_markdown.tb_clearance_trigger_operator_config(operator_id),
	CONSTRAINT tb_clearance_trigger_conditions_mapping_timeframe_id_fkey FOREIGN KEY (timeframe_id) REFERENCES price_markdown.tb_clearance_trigger_timeframe_config(timeframe_id),
	CONSTRAINT tb_clearance_trigger_conditions_mapping_trigger_id_fkey FOREIGN KEY (trigger_id) REFERENCES price_markdown.tb_clearance_trigger_info_master(trigger_id)
);