--liquibase formatted sql
--changeset liquibase:tb_rule_discount stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_rule_discount

CREATE TABLE price_markdown.tb_rule_discount (
	rule_id int4 NOT NULL,
	product_level_id int4 NOT NULL,
	min_value float4 NULL,
	max_value float4 NULL,
	applicable_value _float4 NULL,
	store_level_id int4 NOT NULL DEFAULT '-200'::integer,
	product_level_value text NULL,
	store_level_value text NULL
)
PARTITION BY LIST (rule_id);