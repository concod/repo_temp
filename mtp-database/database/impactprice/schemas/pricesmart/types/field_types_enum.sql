--liquibase formatted sql
--changeset liquibase:field_types_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for field_types_enum

CREATE TYPE pricesmart."field_types_enum" AS ENUM (
	'integer',
	'numeric',
	'boolean',
	'date',
	'timestamp',
	'text',
	'json');
