--liquibase formatted sql
--changeset liquibase:store_grade_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_grade_master
CREATE TABLE "global".store_grade_master (
	store_grade_id serial4 NOT NULL,
	store_grade_name varchar NOT NULL,
	grade_method varchar NOT NULL,
	grade_nomenclature varchar NULL,
	grade_number int4 NULL,
	performance_metrics jsonb NULL,
	grade_level varchar NOT NULL,
	ph_code int4 NULL,
	store_codes _varchar NOT NULL,
	channel _varchar NOT NULL,
	unit_sales int4 NULL,
	lost_sales int4 NULL,
	unit_receipt int4 NULL,
	valid_time_period datemultirange NOT NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT store_grade_master_pk PRIMARY KEY (store_grade_id),
	CONSTRAINT product_hierarchies_filter_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code),
	CONSTRAINT store_grade_master_fk_user FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code)
);
