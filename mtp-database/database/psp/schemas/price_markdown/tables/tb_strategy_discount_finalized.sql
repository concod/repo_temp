--liquibase formatted sql
--changeset liquibase:tb_strategy_discount_finalized_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_discount_finalized  - added serial 4
CREATE TABLE price_markdown.tb_strategy_discount_finalized (
	strategy_id int4 NOT NULL,
	product_level_value text NULL,
	store_level_value text NULL,
	pcd_id int4 NOT NULL,
	markdown_percentage float8 NULL,
	is_locked int2 NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	product_level_id int8 NOT NULL DEFAULT 0,
	store_level_id int8 NOT NULL DEFAULT 0,
	id serial4 NOT NULL
)
PARTITION BY LIST (strategy_id);