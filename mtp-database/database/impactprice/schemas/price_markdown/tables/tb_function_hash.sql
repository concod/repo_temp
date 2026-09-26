--liquibase formatted sql
--changeset liquibase:tb_function_hash stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_function_hash
CREATE TABLE price_markdown.tb_function_hash (
	id serial4 NOT NULL,
	function_name varchar NOT NULL,
	hash varchar NULL,
	CONSTRAINT tb_function_hash_pkey PRIMARY KEY (function_name)
);