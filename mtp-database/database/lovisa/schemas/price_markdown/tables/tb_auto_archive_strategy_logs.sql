--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_auto_archive_strategy_logs_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: table_create_1
CREATE TABLE price_markdown.tb_auto_archive_strategy_logs (
	action_date date NOT NULL,
	action_time timestamp NOT NULL,
	action_type text NOT NULL,
	strategy_id int4 NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	status int4 NOT NULL
);


--changeset durgaprasad.tulugu@impactanalytics.co:tb_auto_archive_strategy_logs_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_entry_before_archive column.
ALTER TABLE price_markdown.tb_auto_archive_strategy_logs ADD is_entry_before_archive bool NOT NULL DEFAULT true;
