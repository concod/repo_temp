--liquibase formatted sql
--changeset arvindar.prasad@impactanalytics.co:tb_kpi_formula stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39134
--comment: initial changeset for tb_kpi_formula
CREATE TABLE meta_schema.tb_kpi_formula (
	id serial4 NOT NULL,
	kpi_id int4 NOT NULL,
	prd_hcrchy_agg_formula text NULL,
	total_formula varchar NULL,
	update_formula varchar NULL,
	update_spread_logic varchar NULL,
	week_aggregation_formula varchar NULL,
	total_bucket_aggregation_formula varchar NULL,
	matchwith_formula varchar NULL,
	attribute_id int4 NOT NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_kpi_formula_id_unique UNIQUE (id),
	CONSTRAINT tb_kpi_formula_primary_key PRIMARY KEY (kpi_id, attribute_id),
	CONSTRAINT fk_tb_kpi_config_kpi FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id)
);
