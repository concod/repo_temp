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

--changeset vamsi.balaga@impactanalytics.co:promo_master_170525 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing created_at type to timestamp
ALTER TABLE price_promo.promo_master ADD COLUMN last_simulation_time timestamp NULL;
ALTER TABLE price_promo.promo_master ADD COLUMN last_optimized_time timestamp NULL;
ALTER TABLE price_promo.promo_master ADD COLUMN total_inventory int4 NULL;
ALTER TABLE price_promo.promo_master ADD COLUMN currency_id int4 DEFAULT 1;


--changeset vamsi.balaga@impactanalytics.co:promo_master_15070150 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding to_be_simulated and to_be_optimised columns
ALTER TABLE price_promo.promo_master ADD to_be_simulated bool DEFAULT false NULL;
ALTER TABLE price_promo.promo_master ADD to_be_optimised bool DEFAULT false NULL;


--changeset ayush.keshari@impactanalytics.co:promo_master_07081459 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding review_status column
ALTER TABLE price_promo.promo_master ADD COLUMN IF NOT EXISTS review_status INTEGER DEFAULT NULL;

--changeset vamsi.balaga@impactanalytics.co:promo_master_14080306 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding finalized_promo_id_by_merchant column
ALTER TABLE price_promo.promo_master ADD finalized_promo_id_by_merchant int NULL;

--changeset shrrayan.sheel@impactanalytics.co:promo_master_07081458 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding is_vendor_created_promo and vendor_portal_status column
ALTER TABLE price_promo.promo_master ADD is_vendor_created_promo bool DEFAULT false NULL;
ALTER TABLE price_promo.promo_master ADD vendor_portal_status int2 DEFAULT 0 NOT NULL;
ALTER TABLE price_promo.promo_master ADD vendor_created_by int4;

--changeset narendren.saravanan@impactanalytics.co:remove_promo_master_indexes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: removing indexes from promo_master table

DROP INDEX IF EXISTS price_promo.idx_promo_master_date_filter;
DROP INDEX IF EXISTS price_promo.idx_promo_master_end_date;
DROP INDEX IF EXISTS price_promo.idx_promo_master_id;
DROP INDEX IF EXISTS price_promo.idx_promo_master_id_dates;
DROP INDEX IF EXISTS price_promo.idx_promo_master_id_is_under_processing;
DROP INDEX IF EXISTS price_promo.idx_promo_master_is_deleted;
DROP INDEX IF EXISTS price_promo.idx_promo_master_is_deleted_dates;
DROP INDEX IF EXISTS price_promo.idx_promo_master_is_deleted_status_dates;
DROP INDEX IF EXISTS price_promo.idx_promo_master_is_under_processing;
DROP INDEX IF EXISTS price_promo.idx_promo_master_last_approved_scenario_id;
DROP INDEX IF EXISTS price_promo.idx_promo_master_product_selection_type;
DROP INDEX IF EXISTS price_promo.idx_promo_master_recommendation_type_id;
DROP INDEX IF EXISTS price_promo.idx_promo_master_start_date;
DROP INDEX IF EXISTS price_promo.idx_promo_master_status;
DROP INDEX IF EXISTS price_promo.idx_promo_master_step_count;
DROP INDEX IF EXISTS price_promo.idx_promo_master_step_count_status;
DROP INDEX IF EXISTS price_promo.idx_promo_master_store_selection_type;

--changeset narendren.saravanan@impactanalytics.co:promo_master_status_fk_constraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding foreign key constraints for status and vendor_portal_status
ALTER TABLE price_promo.promo_master ADD CONSTRAINT fk_promo_master_status FOREIGN KEY (status) REFERENCES price_promo.promo_status_config(status_id);
ALTER TABLE price_promo.promo_master ADD CONSTRAINT fk_promo_master_vendor_portal_status FOREIGN KEY (vendor_portal_status) REFERENCES price_promo.promo_vendor_portal_status_config(status_id);

--changeset shrrayan.sheel@impactanalytics.co:promo_master_07081460 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding parent_vendor_promo_id and timestamp columns
ALTER TABLE price_promo.promo_master ADD parent_vendor_promo_id int4;
ALTER TABLE price_promo.promo_master ADD vendor_portal_status_updated_at timestamptz NULL;
ALTER TABLE price_promo.promo_master ADD review_status_updated_at timestamptz NULL;

--changeset vamsi.balaga@impactanalytics.co:promo_master_02090417 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: setting default value for currency_id
ALTER TABLE price_promo.promo_master ALTER COLUMN currency_id SET DEFAULT 1;

--changeset shrrayan.sheel@impactanalytics.co:promo_master_18091245 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add is_synced_to_vendor_portal column
ALTER TABLE price_promo.promo_master ADD COLUMN is_synced_to_vendor_portal bool DEFAULT false NULL;

--changeset harsh.singh@impactanalytics.co:promo_master_customer_fields_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: adding promo_master customer fields
ALTER TABLE price_promo.promo_master
ADD COLUMN IF NOT EXISTS customers_count int4 DEFAULT 0 NULL,
ADD COLUMN IF NOT EXISTS customer_selection_type int2 NULL;

--changeset pranshu.pandey@impactanalytics.co:promo_master_18091245 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add is_synced_to_vendor_portal column
ALTER TABLE price_promo.promo_master ADD COLUMN IF NOT EXISTS kvi_tagged_products_count int4 DEFAULT 0 NULL;
ALTER TABLE price_promo.promo_master ADD COLUMN IF NOT EXISTS execution_metadata jsonb NULL;
