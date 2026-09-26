--liquibase formatted sql
--changeset liquibase:format_master_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for format_master_create
CREATE TABLE monday_smart.format_master (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	"label" varchar NOT NULL,
	active bool NULL DEFAULT true,
	format varchar NOT NULL,
	description varchar NULL,
	kc_code int2 NULL,
	sort_order int2 NOT NULL,
	module_code int2 NULL,
	screen_code int2 NULL,
	CONSTRAINT tb_kpi_format_new_id_key UNIQUE (id),
	CONSTRAINT fk_catgeory_kpi_new_id FOREIGN KEY (kc_code) REFERENCES monday_smart.kpi_categories_master(kc_code),
	CONSTRAINT fk_screen_kpi_new_id FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code)
);