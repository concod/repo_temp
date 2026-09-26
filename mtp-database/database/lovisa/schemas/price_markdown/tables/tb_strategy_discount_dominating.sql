--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::tb_strategy_discount_dominating_20251106 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_discount_dominating

CREATE TABLE price_markdown.tb_strategy_discount_dominating (
	strategy_id int4 NOT NULL,
	product_level_value text NULL,
	store_level_value text NULL,
	pcd_id int4 NOT NULL,
	markdown_percentage float8 NULL,
	is_locked int2 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	updated_by int4 DEFAULT 0 NULL,
	product_level_id int8 DEFAULT 0 NOT NULL,
	store_level_id int8 DEFAULT 0 NOT NULL,
	id serial4 NOT NULL,
	previous_markdown_percentage float8 NULL,
	incremental_discount float8 NULL,
	approval_status price_markdown."strategy_approval_status_enum" DEFAULT 'Not Approved'::price_markdown.strategy_approval_status_enum NULL,
	previous_pcd_id int4 NULL,
	channel_info varchar NULL,
	average_retail_price float8 NULL,
	markdown_type text NULL,
	action_status price_markdown."action_status_enum" DEFAULT 'No Action'::price_markdown.action_status_enum NULL,
	currency_id int8 NULL,
	average_retail_price_with_vat float8 NULL,
	effective_price_point int8 NULL
)
PARTITION BY LIST (strategy_id);
CREATE INDEX tb_strategy_discount_strategy_dominating_id_idx ON price_markdown.tb_strategy_discount_dominating USING btree (strategy_id, pcd_id, product_level_id, store_level_id);