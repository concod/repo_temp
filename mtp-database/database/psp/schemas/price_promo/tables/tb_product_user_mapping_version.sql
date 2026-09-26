--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_product_user_mapping_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_user_mapping_version

CREATE TABLE IF NOT EXISTS price_promo.tb_product_user_mapping_version (
	product_id int8 NOT NULL,
	primaryupc text NULL,
	vendor_id int4 NULL,
	vendor text NULL,
	vendor_cuq text NULL,
	vendor_cid int4 NULL,
	vendor_mail_id text NULL,
	version_code int4 NOT NULL,
	CONSTRAINT tb_prod_user_map_v_uniq_key UNIQUE (version_code, primaryupc, vendor_cid, vendor_mail_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX tb_prod_user_map_v_idx ON price_promo.tb_product_user_mapping_version USING btree (primaryupc); 