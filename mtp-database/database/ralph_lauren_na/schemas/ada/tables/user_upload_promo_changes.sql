--liquibase formatted sql
--changeset arghyadeep.bhattacharjee@impactanalytics.co:user_upload_promo_changes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_upload_promo_changes
--rollback: SELECT 1

CREATE TABLE if not exists "ada".user_upload_promo_changes (
	id serial4 NOT NULL,
	article varchar NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	country varchar NOT NULL,
	channel varchar NOT NULL,
	store_code _varchar NULL,
	table_name varchar NULL,
	product_bucket_code _int4 NULL,
	start_date date NOT NULL,
	end_date varchar NULL,
	fiscal_year_weeks _varchar NULL,
	discount_value int4 NOT NULL,
	include_exclude varchar NULL,
	updated_by varchar NOT NULL,
	updated_at timestamp NOT NULL,
	status int4 NULL,
	CONSTRAINT user_upload_promo_changes_pkey PRIMARY KEY (id)
);

--liquibase formatted sql
--changeset arjun.gajmer@impactanalytics.co:user_upload_promo_changes_table alter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: alter table for user_upload_promo_changes
--rollback: SELECT 1

ALTER TABLE "ada".user_upload_promo_changes  ALTER COLUMN end_date TYPE date USING end_date::date;
ALTER TABLE "ada".user_upload_promo_changes ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
