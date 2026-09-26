    --liquibase formatted sql
    --changeset rohankumar.sinha:lovisa_marksmart_tb_simulation_week_mkd_version stripComments:false splitStatements:false context:lovisa_marksmart_tb_simulation_week_mkd_version
    --comment: initial changeset for lovisa_marksmart_tb_simulation_week_mkd_version


CREATE TABLE price_markdown_opt.lovisa_marksmart_tb_simulation_week_mkd_version (
	version_code int4 NOT NULL,
	product_id int4 NOT NULL,
	week_start_date date NOT NULL,
	base_percentage int4 NOT NULL,
	bnm_sales_units float8 NULL,
	bnm_baseline_sales_units float8 NULL,
	bnm_elasticity float8 NULL,
	ecom_sales_units float8 NULL,
	ecom_baseline_sales_units float8 NULL,
	ecom_elasticity float8 NULL,
	CONSTRAINT tb_simulation_week_mkd_pk_2 PRIMARY KEY (version_code, product_id, week_start_date, base_percentage)
)
PARTITION BY LIST (version_code);