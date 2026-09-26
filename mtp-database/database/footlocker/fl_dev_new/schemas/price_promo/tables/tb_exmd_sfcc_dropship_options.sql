--liquibase formatted sql
--changeset liquibase:tb_exmd_sfcc_dropship_options stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_exmd_sfcc_dropship_options
CREATE TABLE price_promo.tb_exmd_sfcc_dropship_options (
	sfcc_dropship_id text NULL,
	"name" text NOT NULL,
	display_name text NOT NULL,
	is_active bool DEFAULT true NULL
);