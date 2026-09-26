--liquibase formatted sql
--changeset liquibase:custom_alerts_severity_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for custom_alerts_severity_level

CREATE TYPE price_markdown."custom_alerts_severity_level" AS ENUM (
	'low',
	'medium',
	'high');