--liquibase formatted sql
--changeset liquibase:product_exclusion stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_exclusion
CREATE TYPE price_promo.product_exclusion AS (
	product_exclusion_level text,
	specific_product_type text,
	products _int8,
	product_groups _int8,
	hierarchy_data jsonb);