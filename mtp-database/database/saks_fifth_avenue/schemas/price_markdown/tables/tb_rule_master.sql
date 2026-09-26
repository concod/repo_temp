--liquibase formatted sql
--changeset liquibase:tb_rule_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_rule_master
CREATE TABLE price_markdown.tb_rule_master (
	rule_id serial4 NOT NULL,
	rule_name text NOT NULL,
	rule_type int2 NOT NULL,
	is_default_rule int2 NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at varchar(50) NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	min_value float4 NULL,
	max_value float4 NULL,
	applicable_value _float4 NULL DEFAULT ARRAY[]::real[],
	rule_flexibility_type_id int2 NULL,
	rule_description text NULL,
	rule_product_level int4 NULL,
	rule_store_level int4 NULL,
	products_count int4 NULL,
	stores_count int4 NULL,
	created_from_strategy bool NULL DEFAULT false,
	CONSTRAINT rule_master_pkey PRIMARY KEY (rule_id)
);