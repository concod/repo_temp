--liquibase formatted sql
--changeset liquibase:markdown_type_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for markdown_type_enum

CREATE TYPE price_markdown."markdown_type_enum" AS ENUM (
	'Regular Price',
	'First Markdown',
	'Second Markdown',
	'Final Sale Price');