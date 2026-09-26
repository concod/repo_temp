--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:tb_query_placeholder_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_query_placeholder
CREATE TABLE pricesmart.tb_query_placeholder (
	query_id int4 NOT NULL,
	placeholder_id int4 NOT NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT tb_query_placeholder_pkey PRIMARY KEY (query_id, placeholder_id),
	CONSTRAINT tb_query_placeholder_query_id_fkey FOREIGN KEY (query_id) REFERENCES pricesmart.tb_query_catalog(query_id) ON DELETE CASCADE,
	CONSTRAINT tb_query_placeholder_placeholder_id_fkey FOREIGN KEY (placeholder_id) REFERENCES pricesmart.tb_placeholder_catalog(placeholder_id) ON DELETE CASCADE
);
