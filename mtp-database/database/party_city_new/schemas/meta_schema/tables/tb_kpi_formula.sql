--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_kpi_formula stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
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
	is_deleted bool DEFAULT false NULL,
	download_week_aggregation_formula varchar(50) NULL,
	download_month_aggregation_formula varchar(50) NULL,
	product_roll_down text NULL,
	roll_down_channel text NULL,
	roll_up_channel text NULL,
	roll_up_product_hierarchy text NULL,
	roll_up_timeline text NULL,
	roll_down_timeline text NULL,
	CONSTRAINT tb_kpi_formula_id_unique UNIQUE (id),
	CONSTRAINT tb_kpi_formula_primary_key PRIMARY KEY (kpi_id, attribute_id)
);


-- meta_schema.tb_kpi_formula foreign keys

ALTER TABLE meta_schema.tb_kpi_formula ADD CONSTRAINT fk_tb_kpi_config_kpi FOREIGN KEY (kpi_id) REFERENCES meta_schema.tb_kpi_master(id);