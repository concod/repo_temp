--liquibase formatted sql
--changeset liquibase:tb_exmd_template_id stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_exmd_template_id
CREATE TABLE price_promo.tb_exmd_template_id (
	template_id text NULL,
	"name" text NOT NULL,
	display_name text NOT NULL,
	is_active bool DEFAULT true NULL
);