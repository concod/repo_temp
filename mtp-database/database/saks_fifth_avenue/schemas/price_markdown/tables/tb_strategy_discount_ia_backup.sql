--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_strategy_discount_ia_backup_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: table_create_1
CREATE TABLE price_markdown.tb_strategy_discount_ia_backup (
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
	id int4 NOT NULL DEFAULT nextval('price_markdown.tb_strategy_discount_id_seq'::regclass),
	incremental_discount float8 NULL,
	previous_markdown_percentage int8 NULL,
	previous_pcd_id int4 NULL,
	average_retail_price float8 NULL,
	channel_info varchar NULL,
	markdown_type text NULL
);
CREATE INDEX tb_strategy_discount_ia_backup_strategy_id_idx ON price_markdown.tb_strategy_discount_ia_backup USING btree (strategy_id, pcd_id, product_level_id, store_level_id);