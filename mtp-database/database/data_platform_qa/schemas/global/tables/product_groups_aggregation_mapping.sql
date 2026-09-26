-- liquibase formatted sql
-- changeset srishti.kumari@impactanalytics.co:product_groups_aggregation_mapping stripComments:false splitStatements:false context: MTP-57165 labels:product_groups_aggregation_mapping
-- comment: initial changeset for product_groups_aggregation_mapping
CREATE TABLE "global".product_groups_aggregation_mapping (
	pg_code int4 NOT NULL,
	aggregation_code varchar NOT NULL,
	ref_pg_code int4 NULL,
	avg_st_perc float4 NULL,
	rev_con_perc float4 NULL,
	CONSTRAINT product_groups_mapping_unique UNIQUE (pg_code, aggregation_code),
	CONSTRAINT product_groups_mapping_fkey FOREIGN KEY (pg_code) REFERENCES "global".product_groups(pg_code) ON DELETE CASCADE,
	CONSTRAINT product_groups_mapping_ref_pg_fkey FOREIGN KEY (ref_pg_code) REFERENCES "global".product_groups(pg_code)
);