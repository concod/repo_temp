--liquibase formatted sql
--changeset liquibase:tb_exmd_sfcc_ats_check stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_exmd_sfcc_ats_check
CREATE TABLE price_promo.tb_exmd_sfcc_ats_check (
	sfcc_ats_check_id text NULL,
	"name" text NOT NULL,
	display_name text NOT NULL,
	is_active bool DEFAULT true NULL
);