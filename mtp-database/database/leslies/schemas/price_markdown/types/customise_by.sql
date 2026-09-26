--liquibase formatted sql
--changeset liquibase:customise_by stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customise_by

CREATE TYPE price_markdown."customise_by" AS ENUM (
	'weekly',
	'full_custom',
	'config_object');
