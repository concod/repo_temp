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
	status int2 NOT NULL DEFAULT 0,
	is_deleted int2 NOT NULL DEFAULT 0,
	ad_type int2 NULL DEFAULT 1,
	step_count int2 NULL,
	products_count int4 NULL,
	stores_count int4 NULL,
	style_id_count int4 NULL,
	product_selection_type int2 NULL,
	store_selection_type int2 NULL,
	customer_type int2 NULL,
	offer_distribution_channel int2 NULL,
	is_hero_promo int2 NOT NULL DEFAULT 0,
	is_lock_promo int2 NOT NULL DEFAULT 0,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	marketing_channel varchar(100) NULL DEFAULT 0,
	copied_from int4 NULL,
	future_sku_selection varchar(20) NULL,
	last_approved_scenario_id int4 NULL,
	offer_comment text NULL,
	upload_used int2 NULL DEFAULT 0,
	sap_promo_level int2 NULL DEFAULT 5,
	is_auto_resimulated int2 NULL DEFAULT 0,
	is_under_processing int2 NULL DEFAULT 0,
	is_overridden_scenario int2 NULL DEFAULT 0,
	CONSTRAINT promo_master_pkey PRIMARY KEY (promo_id),
	CONSTRAINT promo_master_uk UNIQUE (name, event_id)
);
CREATE INDEX promo_master_promo_id_idx ON price_promo.promo_master USING btree (promo_id);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.promo_master table to match the DEV environment schema by dropping all columns and indexes, then recreating them

-- Drop existing constraints and indexes that need to be replaced
ALTER TABLE price_promo.promo_master
    DROP CONSTRAINT IF EXISTS promo_master_uk,
    DROP CONSTRAINT IF EXISTS promo_master_pkey;

DROP INDEX IF EXISTS promo_master_promo_id_idx;

-- Drop columns that are not in the DEV environment
ALTER TABLE price_promo.promo_master
    DROP COLUMN IF EXISTS is_deleted,
    DROP COLUMN IF EXISTS products_count,
    DROP COLUMN IF EXISTS stores_count,
    DROP COLUMN IF EXISTS style_id_count,
    DROP COLUMN IF EXISTS product_selection_type,
    DROP COLUMN IF EXISTS store_selection_type,
    DROP COLUMN IF EXISTS exclusion_selection_type,
    DROP COLUMN IF EXISTS customer_type,
    DROP COLUMN IF EXISTS offer_distribution_channel,
    DROP COLUMN IF EXISTS ad_type,
    DROP COLUMN IF EXISTS is_hero_promo,
    DROP COLUMN IF EXISTS is_lock_promo,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS marketing_channel,
    DROP COLUMN IF EXISTS "uuid",
    DROP COLUMN IF EXISTS copied_from,
    DROP COLUMN IF EXISTS future_sku_selection,
    DROP COLUMN IF EXISTS last_approved_scenario_id,
    DROP COLUMN IF EXISTS offer_comment,
    DROP COLUMN IF EXISTS upload_used,
    DROP COLUMN IF EXISTS sap_promo_level,
    DROP COLUMN IF EXISTS is_auto_resimulated,
    DROP COLUMN IF EXISTS is_under_processing,
    DROP COLUMN IF EXISTS is_overridden_scenario,
    DROP COLUMN IF EXISTS recommendation_type_id;

-- Recreate all columns to match DEV environment
ALTER TABLE price_promo.promo_master
    ADD COLUMN is_deleted int2 DEFAULT 0 NOT NULL,
    ADD COLUMN products_count int4 NULL,
    ADD COLUMN stores_count int4 NULL,
    ADD COLUMN style_id_count int4 NULL,
    ADD COLUMN product_selection_type int2 NULL,
    ADD COLUMN store_selection_type int2 NULL,
    ADD COLUMN exclusion_selection_type int2 NULL,
    ADD COLUMN customer_type int2 NULL,
    ADD COLUMN offer_distribution_channel int2 NULL,
    ADD COLUMN ad_type int2 DEFAULT 1 NULL,
    ADD COLUMN is_hero_promo int2 DEFAULT 0 NOT NULL,
    ADD COLUMN is_lock_promo int2 DEFAULT 0 NOT NULL,
    ADD COLUMN created_by int4 NOT NULL,
    ADD COLUMN updated_by int4 NULL,
    ADD COLUMN created_at timestamptz NOT NULL,
    ADD COLUMN updated_at timestamptz NULL,
    ADD COLUMN marketing_channel varchar(100) DEFAULT '0' NULL,
    ADD COLUMN "uuid" uuid DEFAULT uuid_generate_v1() NULL,
    ADD COLUMN copied_from int4 NULL,
    ADD COLUMN future_sku_selection varchar(20) NULL,
    ADD COLUMN last_approved_scenario_id int4 NULL,
    ADD COLUMN offer_comment text NULL,
    ADD COLUMN upload_used int2 DEFAULT 0 NULL,
    ADD COLUMN sap_promo_level int2 DEFAULT 5 NULL,
    ADD COLUMN is_auto_resimulated int2 DEFAULT 0 NULL,
    ADD COLUMN is_under_processing int2 DEFAULT 0 NULL,
    ADD COLUMN is_overridden_scenario int2 DEFAULT 0 NULL,
    ADD COLUMN recommendation_type_id int2 NULL;

-- Add the unique constraint to match DEV environment
ALTER TABLE price_promo.promo_master
    ADD CONSTRAINT promo_master_ukey UNIQUE (promo_id, name),
    ADD CONSTRAINT promo_master_pkey PRIMARY KEY (promo_id);

-- Recreate indexes to match DEV environment
CREATE INDEX idx_promo_master_id 
    ON price_promo.promo_master USING btree (promo_id);
CREATE INDEX idx_promo_master_id_dates 
    ON price_promo.promo_master USING btree (promo_id, start_date, end_date);



--changeset sidahrth.harish@impactanalytics.co:promo_master_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added additional column to indicate copied at
ALTER TABLE price_promo.promo_master ADD copied_at timestamptz NULL;


--changeset sidahrth.harish@impactanalytics.co:promo_master_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added additional column to indicate last synced time
ALTER TABLE price_promo.promo_master ADD last_exmd_synced_time timestamptz NULL;


--changeset vamsi.balaga@impactanalytics.co:promo_master_14102024 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added additional column to indicate overridden scenario is finalized
ALTER TABLE price_promo.promo_master ADD is_overridden_scenario_finalized bool DEFAULT false NULL;

--changeset vamsi.balaga@impactanalytics.co:promo_master_13110317 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added has_stacked_offers column to indicate whether the promo has stacked offers or not
ALTER TABLE price_promo.promo_master ADD has_stacked_offers bool DEFAULT false NULL;

--changeset vamsi.balaga@impactanalytics.co:promo_master_18110709 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: adding default value as null to trigger the process when it is null (null indicates the value has not been set)
ALTER TABLE price_promo.promo_master ALTER COLUMN has_stacked_offers DROP DEFAULT;

--changeset vamsi.balaga@impactanalytics.co:promo_master_23111425 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added is_simulation_disabled column to indicate whether the promo is disabled for simulation or not
ALTER TABLE price_promo.promo_master ADD is_simulation_disabled bool DEFAULT false NULL;