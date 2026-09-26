--liquibase formatted sql
--changeset liquibase:tb_calendar_pcd stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_calendar_pcd
CREATE TABLE price_markdown.tb_calendar_pcd (
	calendar_pcd_id serial4 NOT NULL,
	pcd_start_date date NOT NULL,
	pcd_end_date date NOT NULL,
	calendar_config_id int4 NOT NULL,
	frequency int4 NOT NULL,
	frequency_id int4 NULL,
	CONSTRAINT tb_calendar_pcd_pk PRIMARY KEY (calendar_pcd_id)
);