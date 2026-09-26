--liquibase formatted sql
--changeset liquibase:tb_backup_ia stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_backup_ia

CREATE TABLE price_markdown_opt.tb_backup_ia (
	strategy_id int4 NULL,
	product_level_id int4 NULL,
	store_level_id int4 NULL,
	pcd_id int4 NULL,
	recommended_offer_percentage float8 NULL,
	sales_units float8 NULL,
	revenue float8 NULL,
	margin float8 NULL,
	created_at timestamptz NULL
);
CREATE INDEX backup_stg_ia ON price_markdown_opt.tb_backup_ia USING btree (strategy_id);

--changeset keerthana.reddy@impactanalytics.co:tb_backup_ia_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown_opt.tb_backup_ia
ADD COLUMN currency_id int8,
ADD COLUMN revenue_with_vat float8,
ADD COLUMN margin_with_vat float8;
