--liquibase formatted sql
--changeset liquibase:tb_exmd_promo stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_exmd_promo
CREATE TABLE price_promo.tb_exmd_promo (
	promo_id int4 NOT NULL,
	template_id text NOT NULL,
	price_filter_id int4 NOT NULL,
	folder_id int4 NOT NULL,
	sfcc_ats_check_id text NULL,
	sfcc_dropship_id text NULL,
	promo_code text NULL,
	receipt_text_eng text NULL,
	receipt_text_french text NULL,
	sfcc_pip_text text NULL,
	sfcc_tender_type_promo_msg text NULL,
	sfcc_pip_customer_group text NULL,
	sfcc_customer_group text NULL,
	sfcc_pip_rank int4 NULL,
	sfcc_rank int4 NULL
);
ALTER TABLE price_promo.tb_exmd_promo ADD CONSTRAINT tb_exmd_promo_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES price_promo.promo_master(promo_id) ON DELETE CASCADE;

--changeset liquibase:tb_exmd_promo_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dropping not null constraints for price filter and folder for tb_exmd_promo
ALTER TABLE price_promo.tb_exmd_promo
ALTER COLUMN price_filter_id DROP NOT NULL;

ALTER TABLE price_promo.tb_exmd_promo
ALTER COLUMN folder_id DROP NOT NULL;
