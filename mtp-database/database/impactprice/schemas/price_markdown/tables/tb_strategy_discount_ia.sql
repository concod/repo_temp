--liquibase formatted sql
--changeset liquibase:tb_strategy_discount_ia_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_discount_ia  - added serial 4
CREATE TABLE price_markdown.tb_strategy_discount_ia (
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
	id serial4 NOT NULL,
	incremental_discount float8 NULL,
	previous_markdown_percentage int8 NULL
)
PARTITION BY LIST (strategy_id);
CREATE INDEX tb_strategy_discount_ia_strategy_id_idx ON price_markdown.tb_strategy_discount_ia USING btree (strategy_id, pcd_id, product_level_id, store_level_id);


--changeset liquibase:tb_strategy_discount_ia_prev_pcd_avg_retail_price stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added previous_pcd_id and average_retail_price columns
ALTER TABLE price_markdown.tb_strategy_discount_ia ADD previous_pcd_id int4 NULL;
ALTER TABLE price_markdown.tb_strategy_discount_ia ADD average_retail_price float8 NULL;
--changeset liquibase:tb_strategy_discount_ia_channel_info_markdown_typ stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added channel_info and markdown_type columns
ALTER TABLE price_markdown.tb_strategy_discount_ia ADD channel_info varchar NULL;
ALTER TABLE price_markdown.tb_strategy_discount_ia ADD markdown_type text NULL;


--changeset keerthana.reddy@impactanalytics.co:tb_strategy_discount_ia_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns
ALTER TABLE price_markdown.tb_strategy_discount_ia
ADD COLUMN currency_id int8,
ADD COLUMN average_retail_price_with_vat float8;