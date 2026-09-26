--liquibase formatted sql
--changeset liquibase:store_restriction stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_restriction
CREATE TYPE price_promo.store_restriction AS (
	store_restriction_level text,
	"lock" bool,
	stores _int8,
	store_groups _int8);