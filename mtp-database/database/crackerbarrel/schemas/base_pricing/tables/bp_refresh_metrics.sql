--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_refresh_metrics stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_refresh_metrics

CREATE TABLE base_pricing.bp_refresh_metrics (
	metric_id serial4 NOT NULL,
	task_id int4 NOT NULL,
	metric_name varchar(100) NOT NULL,
	metric_value numeric NOT NULL,
	metric_unit varchar(50) NULL,
	metric_tags jsonb NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT bp_refresh_metrics_pkey PRIMARY KEY (metric_id),
	CONSTRAINT bp_refresh_metrics_task_id_fkey FOREIGN KEY (task_id) REFERENCES base_pricing.bp_refresh_task_history(task_id)
);

CREATE INDEX idx_refresh_metrics_metric_name ON base_pricing.bp_refresh_metrics USING btree (metric_name);
CREATE INDEX idx_refresh_metrics_metric_tags ON base_pricing.bp_refresh_metrics USING gin (metric_tags);
CREATE INDEX idx_refresh_metrics_task_id ON base_pricing.bp_refresh_metrics USING btree (task_id);