--liquibase formatted sql
--changeset liquibase:promo_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_master


CREATE TABLE price_promo.promo_master (
	promo_id serial4 NOT NULL,
	promo_code varchar(100) NULL,
	event_id int4 NULL,
	"name" text NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	step_count int2 NULL,
	status int2 DEFAULT 0 NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	products_count int4 DEFAULT 0 NULL,
	stores_count int4 DEFAULT 0 NULL,
	style_id_count int4 NULL,
	product_selection_type int2 NULL,
	store_selection_type int2 NULL,
	exclusion_selection_type int2 NULL,
	customer_type int2 NULL,
	offer_distribution_channel int2 NULL,
	ad_type int2 DEFAULT 1 NULL,
	is_hero_promo int2 DEFAULT 0 NOT NULL,
	is_lock_promo int2 DEFAULT 0 NOT NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NULL,
	marketing_channel varchar(100) DEFAULT '0'::character varying NULL,
	"uuid" uuid DEFAULT uuid_generate_v1() NULL,
	copied_from int4 NULL,
	future_sku_selection varchar(20) NULL,
	last_approved_scenario_id int4 NULL,
	offer_comment text NULL,
	upload_used int2 DEFAULT 0 NULL,
	sap_promo_level int2 DEFAULT 5 NULL,
	is_auto_resimulated int2 DEFAULT 0 NULL,
	is_under_processing int2 DEFAULT 0 NULL,
	is_overridden_scenario int2 DEFAULT 0 NULL,
	recommendation_type_id int2 NULL,
	copied_at timestamptz NULL,
	last_exmd_synced_time timestamptz NULL,
	is_overridden_scenario_finalized bool DEFAULT false NULL,
	has_stacked_offers bool NULL,
	is_simulation_disabled bool DEFAULT false NULL,
	CONSTRAINT promo_master_pkey PRIMARY KEY (promo_id),
	CONSTRAINT promo_master_ukey UNIQUE (promo_id, name)
);
CREATE INDEX idx_promo_master_date_filter ON price_promo.promo_master USING btree (start_date, end_date);
CREATE INDEX idx_promo_master_end_date ON price_promo.promo_master USING btree (end_date);
CREATE INDEX idx_promo_master_id ON price_promo.promo_master USING btree (promo_id);
CREATE INDEX idx_promo_master_id_dates ON price_promo.promo_master USING btree (promo_id, start_date, end_date);
CREATE INDEX idx_promo_master_id_is_under_processing ON price_promo.promo_master USING btree (promo_id, is_under_processing);
CREATE INDEX idx_promo_master_is_deleted ON price_promo.promo_master USING btree (is_deleted);
CREATE INDEX idx_promo_master_is_deleted_dates ON price_promo.promo_master USING btree (is_deleted, start_date, end_date);
CREATE INDEX idx_promo_master_is_deleted_status_dates ON price_promo.promo_master USING btree (is_deleted, status, start_date, end_date);
CREATE INDEX idx_promo_master_is_under_processing ON price_promo.promo_master USING btree (is_under_processing);
CREATE INDEX idx_promo_master_last_approved_scenario_id ON price_promo.promo_master USING btree (last_approved_scenario_id);
CREATE INDEX idx_promo_master_product_selection_type ON price_promo.promo_master USING btree (product_selection_type);
CREATE INDEX idx_promo_master_recommendation_type_id ON price_promo.promo_master USING btree (recommendation_type_id);
CREATE INDEX idx_promo_master_start_date ON price_promo.promo_master USING btree (start_date);
CREATE INDEX idx_promo_master_status ON price_promo.promo_master USING btree (status);
CREATE INDEX idx_promo_master_step_count ON price_promo.promo_master USING btree (step_count);
CREATE INDEX idx_promo_master_step_count_status ON price_promo.promo_master USING btree (step_count, status);
CREATE INDEX idx_promo_master_store_selection_type ON price_promo.promo_master USING btree (store_selection_type);



--changeset vamsi.balaga@impactanalytics.co:promo_master_created_at_type_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing created_at type to timestamp
ALTER TABLE price_promo.promo_master ALTER COLUMN created_at TYPE timestamp USING created_at::timestamp;
ALTER TABLE price_promo.promo_master ALTER COLUMN created_at SET DEFAULT now() at time zone 'UTC';


--changeset vamsi.balaga@impactanalytics.co:promo_master_v2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for promo_master

ALTER TABLE price_promo.promo_master
ADD COLUMN	last_simulation_time timestamp NULL,
ADD COLUMN	last_optimized_time timestamp NULL,
ADD COLUMN	total_inventory int4 NULL,
ADD COLUMN	currency_id int4 DEFAULT 1 NULL;

--changeset shrrayan.sheel@impactanalytics.co:promo_master_customer_fields_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: adding promo_master customer fields
ALTER TABLE price_promo.promo_master
ADD COLUMN customers_count int4 DEFAULT 0 NULL,
ADD COLUMN customer_selection_type int2 NULL;

--changeset narendren.saravanan@impactanalytics.co:promo_master_execution_metadata stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: adding execution_metadata JSONB column to promo_master
ALTER TABLE price_promo.promo_master
ADD COLUMN execution_metadata jsonb NULL;