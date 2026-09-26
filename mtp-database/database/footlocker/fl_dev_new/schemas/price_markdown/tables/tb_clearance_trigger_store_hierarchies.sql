--liquibase formatted sql
--changeset liquibase:tb_clearance_trigger_store_hierarchies_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_store_hierarchies

CREATE TABLE price_markdown.tb_clearance_trigger_store_hierarchies (
	trigger_id int4 NOT NULL,
	hierarchy_level int4 NOT NULL,
	hierarchy_level_id int4 NOT NULL,
	hierarchy_level_name text NULL,
	CONSTRAINT tb_clearance_store_hierarchies_trigger_id_fkey FOREIGN KEY (trigger_id) REFERENCES price_markdown.tb_clearance_trigger_info_master(trigger_id)
);