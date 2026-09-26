--liquibase formatted sql
--changeset liquibase:customer_restriction stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_restriction
CREATE TYPE price_promo.customer_restriction AS (
	customer_restriction_level text,
	"lock" bool,
	hierarchy_data jsonb);