--liquibase formatted sql
--changeset liquibase:tb_exmd_target_folder stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_exmd_target_folder
CREATE TABLE price_promo.tb_exmd_target_folder (
	folder_id int4 NULL,
	"name" text NOT NULL,
	display_name text NOT NULL,
	is_active bool DEFAULT true NULL,
	start_date date NOT NULL,
	end_date date NOT NULL
);