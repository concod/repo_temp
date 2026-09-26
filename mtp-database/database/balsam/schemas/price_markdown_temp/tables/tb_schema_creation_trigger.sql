--liquibase formatted sql
--changeset liquibase:price_markdown_temp.tb_schema_creation_trigger stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown_temp.tb_schema_creation_trigger

CREATE TABLE price_markdown_temp.tb_schema_creation_trigger (
	temp_value bool NOT NULL
);
