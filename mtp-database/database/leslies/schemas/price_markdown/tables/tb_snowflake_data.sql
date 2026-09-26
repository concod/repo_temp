--liquibase formatted sql
--changeset liquibase:tb_snowflake_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_snowflake_data
CREATE TABLE price_markdown.tb_snowflake_data (
	sku_id int4 NOT NULL,
	store_id int4 NOT NULL,
	effective_date date NOT NULL,
	price_status int4 NOT NULL,
	price numeric NOT NULL,
	"action" text NOT NULL,
	updated_by text NOT NULL,
	updated_at timestamp NOT NULL,
	ia_approval_status price_markdown."strategy_approval_status_enum" NULL DEFAULT 'Not Approved'::price_markdown.strategy_approval_status_enum,
	channel text NOT NULL,
	pcd_id int4 NOT NULL,
	product_level_id int4 NOT NULL
)
PARTITION BY LIST (date(updated_at));

--changeset harsh.singh@impactanalytics.co:tb_snowflake_data_v071024 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added columns to the table

alter table price_markdown.tb_snowflake_data
add strategy_id int4,
add discount float8,
add base_price numeric,
add product_id int4,
add style_id text;