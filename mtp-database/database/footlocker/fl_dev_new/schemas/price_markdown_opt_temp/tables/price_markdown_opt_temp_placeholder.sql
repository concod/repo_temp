--liquibase formatted sql
--changeset liquibase:price_markdown_opt_temp_placeholder_v2308 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown_opt_temp_placeholder

CREATE TABLE price_markdown_opt_temp.price_markdown_opt_temp_placeholder (
	temp_value bool NOT NULL
);