--liquibase formatted sql
--changeset liquibase:tb_installs_redemption_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_installs_redemption

DROP TABLE if exists price_promo.tb_installs_redemption;
CREATE TABLE price_promo.tb_installs_redemption (
	hierarchy_code text NULL,
	phase int4 NULL,
	final_redemption float8 NULL
);


