--liquibase formatted sql
--changeset vishal.kumar:liquibase:oms_constraints_qc_time stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_qc_time
CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_qc_time (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	fiscal_year_month int4 NOT NULL,
	fical_year_week int4 NOT NULL,
	qc_time int4 NOT NULL,
	created_by varchar NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	CONSTRAINT pk_oms_constraints_qc_time PRIMARY KEY (product_code, loc_code, fiscal_year_month, fical_year_week)
);

--changeset vishal.kumar::oms_constraints_qc_time_gap_remove stripComments:false splitStatements:false context:Release_1_2 labels:DAT-1122
--comment: initial changeset for oms_constraints_qc_time

ALTER TABLE inventory_smart.oms_constraints_qc_time ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;