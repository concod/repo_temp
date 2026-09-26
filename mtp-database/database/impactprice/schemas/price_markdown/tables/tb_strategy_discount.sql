--liquibase formatted sql
--changeset liquibase:tb_strategy_discount_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_discount - added serial 4
CREATE TABLE price_markdown.tb_strategy_discount (
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
	previous_markdown_percentage float8 NULL,
	incremental_discount float8 NULL,
	approval_status price_markdown.strategy_approval_status_enum NULL,
	previous_pcd_id int4 NULL
)
PARTITION BY LIST (strategy_id);
CREATE INDEX tb_strategy_discount_strategy_id_idx ON price_markdown.tb_strategy_discount USING btree (strategy_id, pcd_id, product_level_id, store_level_id);


--changeset liquibase:tb_strategy_discount_channel_info_avg_retail_price_addition stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added channel_info and average_retail_priec columns
ALTER TABLE price_markdown.tb_strategy_discount ADD channel_info varchar NULL;
ALTER TABLE price_markdown.tb_strategy_discount ADD average_retail_price float8 NULL;
--changeset liquibase:tb_strategy_discount_markdown_type_column_action_status_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added markdown_type column and action status column
ALTER TABLE price_markdown.tb_strategy_discount ADD markdown_type text NULL;
ALTER TABLE price_markdown.tb_strategy_discount ADD action_status price_markdown."action_status_enum" NULL;

--changeset surya.avinash@impactanalytics.co:tb_strategy_discount_set_default_action_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added default value action status column
ALTER TABLE price_markdown.tb_strategy_discount ALTER COLUMN action_status SET DEFAULT 'No Action'::price_markdown."action_status_enum";

--changeset vamsi.balaga@impactanalytics.co:tb_strategy_discount_set_default_approval_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added default value for approval_status column
ALTER TABLE price_markdown.tb_strategy_discount ALTER COLUMN approval_status SET DEFAULT 'Not Approved'::price_markdown.strategy_approval_status_enum;

--changeset keerthana.reddy@impactanalytics.co:tb_strategy_discount_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns
ALTER TABLE price_markdown.tb_strategy_discount
ADD COLUMN currency_id int8,
ADD COLUMN average_retail_price_with_vat float8;
