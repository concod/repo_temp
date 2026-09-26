--liquibase formatted sql
--changeset liquibase:speed_tracing_simulate stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for speed_tracing_simulate

CREATE TABLE price_promo_opt.speed_tracing_simulate (
	id serial4 NOT NULL,
	promo_id int4 NOT NULL,
	scenario_id _int4 NOT NULL,
	fetch_promo_details_dur interval second GENERATED ALWAYS AS ((fetch_promo_details_end - fetch_promo_details_start)) STORED NULL,
	create_promo_product_filter_dur interval second GENERATED ALWAYS AS ((create_promo_product_filter_end - create_promo_product_filter_start)) STORED NULL,
	create_discount_filter_dur interval second GENERATED ALWAYS AS ((create_discount_filter_end - create_discount_filter_start)) STORED NULL,
	delete_existing_recommended_scenarios_dur interval second GENERATED ALWAYS AS ((delete_existing_recommended_scenarios_end - delete_existing_recommended_scenarios_start)) STORED NULL,
	create_date_partitions_dur interval second GENERATED ALWAYS AS ((create_date_partitions_end - create_date_partitions_start)) STORED NULL,
	fetch_store_data_dur interval second GENERATED ALWAYS AS ((fetch_store_data_end - fetch_store_data_start)) STORED NULL,
	offer_attractiveness_dur interval second GENERATED ALWAYS AS ((offer_attractiveness_end - offer_attractiveness_start)) STORED NULL,
	cannibalization_coeff_dur interval second GENERATED ALWAYS AS ((cannibalization_coeff_end - cannibalization_coeff_start)) STORED NULL,
	pf_coeff_dur interval second GENERATED ALWAYS AS ((pf_coeff_end - pf_coeff_start)) STORED NULL,
	insert_data_dur interval second GENERATED ALWAYS AS ((insert_data_end - insert_data_start)) STORED NULL,
	refresh_aggregated_scenarios_dur interval second GENERATED ALWAYS AS ((refresh_aggregated_scenarios_end - refresh_aggregated_scenarios_start)) STORED NULL,
	drop_unlogged_tables_dur interval second GENERATED ALWAYS AS ((drop_unlogged_tables_end - drop_unlogged_tables_start)) STORED NULL,
	fetch_promo_details_start timestamptz NULL,
	fetch_promo_details_end timestamptz NULL,
	create_promo_product_filter_start timestamptz NULL,
	create_promo_product_filter_end timestamptz NULL,
	create_discount_filter_start timestamptz NULL,
	create_discount_filter_end timestamptz NULL,
	delete_existing_recommended_scenarios_start timestamptz NULL,
	delete_existing_recommended_scenarios_end timestamptz NULL,
	create_date_partitions_start timestamptz NULL,
	create_date_partitions_end timestamptz NULL,
	fetch_store_data_start timestamptz NULL,
	fetch_store_data_end timestamptz NULL,
	offer_attractiveness_start timestamptz NULL,
	offer_attractiveness_end timestamptz NULL,
	cannibalization_coeff_start timestamptz NULL,
	cannibalization_coeff_end timestamptz NULL,
	pf_coeff_start timestamptz NULL,
	pf_coeff_end timestamptz NULL,
	insert_data_start timestamptz NULL,
	insert_data_end timestamptz NULL,
	refresh_aggregated_scenarios_start timestamptz NULL,
	refresh_aggregated_scenarios_end timestamptz NULL,
	drop_unlogged_tables_start timestamptz NULL,
	drop_unlogged_tables_end timestamptz NULL,
	total_dur interval second GENERATED ALWAYS AS ((drop_unlogged_tables_end - fetch_promo_details_start)) STORED NULL
);

--changeset liquibase:speed_tracing_simulate_version_new stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for speed_tracing_simulate_2

-- Drop existing generated interval columns
ALTER TABLE price_promo_opt.speed_tracing_simulate
DROP COLUMN IF EXISTS fetch_promo_details_dur,
DROP COLUMN IF EXISTS create_promo_product_filter_dur,
DROP COLUMN IF EXISTS create_discount_filter_dur,
DROP COLUMN IF EXISTS delete_existing_recommended_scenarios_dur,
DROP COLUMN IF EXISTS create_date_partitions_dur,
DROP COLUMN IF EXISTS fetch_store_data_dur,
DROP COLUMN IF EXISTS offer_attractiveness_dur,
DROP COLUMN IF EXISTS cannibalization_coeff_dur,
DROP COLUMN IF EXISTS pf_coeff_dur,
DROP COLUMN IF EXISTS insert_data_dur,
DROP COLUMN IF EXISTS refresh_aggregated_scenarios_dur,
DROP COLUMN IF EXISTS drop_unlogged_tables_dur,
DROP COLUMN IF EXISTS total_dur,
DROP COLUMN IF EXISTS promo_id,
DROP COLUMN IF EXISTS scenario_id
;
ALTER TABLE price_promo_opt.speed_tracing_simulate
ADD COLUMN promo_id integer NULL,
ADD COLUMN scenario_id integer[] NULL,
ADD COLUMN total_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM drop_unlogged_tables_end - fetch_promo_details_start)::integer) STORED NULL,
ADD COLUMN insert_data_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM insert_data_end - insert_data_start)::integer) STORED NULL,
ADD COLUMN create_promo_product_filter_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM create_promo_product_filter_end - create_promo_product_filter_start)::integer) STORED NULL,
ADD COLUMN create_discount_filter_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM create_discount_filter_end - create_discount_filter_start)::integer) STORED NULL,
ADD COLUMN fetch_store_data_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM fetch_store_data_end - fetch_store_data_start)::integer) STORED NULL,
ADD COLUMN offer_attractiveness_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM offer_attractiveness_end - offer_attractiveness_start)::integer) STORED NULL,
ADD COLUMN cannibalization_coeff_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM cannibalization_coeff_end - cannibalization_coeff_start)::integer) STORED NULL,
ADD COLUMN pf_coeff_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM pf_coeff_end - pf_coeff_start)::integer) STORED NULL,
ADD COLUMN refresh_aggregated_scenarios_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM refresh_aggregated_scenarios_end - refresh_aggregated_scenarios_start)::integer) STORED NULL,
ADD COLUMN fetch_promo_details_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM fetch_promo_details_end - fetch_promo_details_start)::integer) STORED NULL,
ADD COLUMN drop_unlogged_tables_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM drop_unlogged_tables_end - drop_unlogged_tables_start)::integer) STORED NULL,
ADD COLUMN delete_existing_recommended_scenarios_dur integer GENERATED ALWAYS AS (EXTRACT(epoch FROM delete_existing_recommended_scenarios_end - delete_existing_recommended_scenarios_start)::integer) STORED NULL;

