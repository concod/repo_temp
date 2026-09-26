--liquibase formatted sql
--changeset liquibase:tb_transaction_backup_mkd stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_transaction_backup_mkd

CREATE TABLE price_markdown_opt.tb_transaction_backup_mkd (
	strategy_id int4 NOT NULL,
	date_id date NOT NULL,
	product_id int8 NOT NULL,
	store_id int4 NOT NULL,
	clearance_indicator int4 NULL,
	"cost" float4 NULL,
	base_price float4 NULL,
	retail_price float4 NULL,
	quantity int4 NULL,
	revenue float4 NULL,
	margin float4 NULL,
	aur float4 NULL,
	aum float4 NULL,
	final_price float4 NULL,
	final_discount_percent float4 NULL,
	promo_discount float4 NULL,
	total_inv int4 NULL,
	sync_date_time date NULL
)
PARTITION BY RANGE (date_id);
