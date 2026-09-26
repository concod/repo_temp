--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:tb_placeholder_columns_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_placeholder_columns
CREATE TABLE pricesmart.tb_placeholder_columns (
	placeholder_column_id serial4 NOT NULL,
	placeholder_id int4 NOT NULL,
	metric_id int4 NULL,
	column_order int4 NOT NULL,
	column_expression text NOT NULL,
	column_alias varchar(255) NULL,
	is_dynamic bool DEFAULT false NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT tb_placeholder_columns_pkey PRIMARY KEY (placeholder_column_id),
	CONSTRAINT tb_placeholder_columns_placeholder_id_fkey FOREIGN KEY (placeholder_id) REFERENCES pricesmart.tb_placeholder_catalog(placeholder_id) ON DELETE CASCADE,
	CONSTRAINT tb_placeholder_columns_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES pricesmart.tb_metric_catalog(metric_id) ON DELETE CASCADE,
	CONSTRAINT tb_placeholder_columns_placeholder_id_column_order_key UNIQUE (placeholder_id, column_order)
);


--changeset narendren.saravanan@impactanalytics.co:tb_placeholder_columns_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: drop unique constraint on (placeholder_id, column_order)
ALTER TABLE pricesmart.tb_placeholder_columns DROP CONSTRAINT IF EXISTS tb_placeholder_columns_placeholder_id_column_order_key;
