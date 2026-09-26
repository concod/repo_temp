--liquibase formatted sql
--changeset liquibase:tb_installs_master_table_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_installs_master_table

DROP TABLE if exists price_promo.tb_installs_master_table;
CREATE TABLE price_promo.tb_installs_master_table (
	hierarchy_code text NULL,
	main_sku int4 NULL,
	install_cost float8 NULL,
	install_rup float8 NULL,
	cross_elasticity float8 NULL
);

