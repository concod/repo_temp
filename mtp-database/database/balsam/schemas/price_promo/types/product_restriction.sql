--liquibase formatted sql
--changeset liquibase:product_restriction stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_restriction
CREATE TYPE price_promo.product_restriction AS (
	product_restriction_level text,
	"lock" bool,
	specific_product_type text,
	products _int8,
	product_groups _int8,
	hierarchy_data jsonb);