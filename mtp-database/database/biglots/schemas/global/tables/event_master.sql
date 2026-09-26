--liquibase formatted sql
--changeset liquibase:event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_store_mapping_schema
--rollback: SELECT 1
CREATE TABLE "global".event_master (
	"date" date NULL,
	christmas int2 NULL,
	columbus_day int2 NULL,
	easter int2 NULL,
	fathers_day int2 NULL,
	good_friday int2 NULL,
	halloween int2 NULL,
	independence_day int2 NULL,
	labor_day int2 NULL,
	mlk_day int2 NULL,
	memorial_day int2 NULL,
	mothers_day int2 NULL,
	new_year int2 NULL,
	presidents_day int2 NULL,
	st_patricks_day int2 NULL,
	thanks_giving int2 NULL,
	valentines_day int2 NULL,
	winter_warm_up int2 NULL
);
CREATE INDEX event_master_date_idx ON global.event_master USING btree (date);
