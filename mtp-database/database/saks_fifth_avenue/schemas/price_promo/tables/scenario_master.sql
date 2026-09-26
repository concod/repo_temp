--liquibase formatted sql
--changeset liquibase:scenario_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for scenario_master

CREATE TABLE price_promo.scenario_master (
	scenario_id bigserial NOT NULL,
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	scenario_name varchar NULL,
	discount_level int8 NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	is_deleted int2 NULL DEFAULT 0,
	"uuid" uuid NOT NULL DEFAULT uuid_generate_v1(),
	is_approved int2 NULL,
	copied_scenario int4 NULL DEFAULT 0,
	CONSTRAINT scenario_master_pkey PRIMARY KEY (scenario_id),
	CONSTRAINT scenario_master_un UNIQUE (promo_id, scenario_name)
);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:scenario_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Aligning TEST environment `price_promo.scenario_master` table with DEV environment

-- Drop all existing columns
ALTER TABLE price_promo.scenario_master
    DROP COLUMN IF EXISTS event_id,
    DROP COLUMN IF EXISTS promo_id,
    DROP COLUMN IF EXISTS scenario_id,
    DROP COLUMN IF EXISTS scenario_name,
    DROP COLUMN IF EXISTS discount_level,
    DROP COLUMN IF EXISTS copied_scenario,
    DROP COLUMN IF EXISTS scenario_order_id,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS is_deleted,
    DROP COLUMN IF EXISTS "uuid",
    DROP COLUMN IF EXISTS is_approved;

-- Drop all existing indexes
DROP INDEX IF EXISTS idx_scenario_master_promo_id;
DROP INDEX IF EXISTS idx_scenario_master_scenario_id;
DROP INDEX IF EXISTS idx_scenario_master_promo_id_scenario_id;

-- Drop existing primary key constraint
ALTER TABLE price_promo.scenario_master
    DROP CONSTRAINT IF EXISTS scenario_master_pkey;

ALTER TABLE price_promo.scenario_master
  DROP CONSTRAINT IF EXISTS scenario_master_un;

ALTER TABLE price_promo.scenario_master
    ADD COLUMN event_id int4 NULL,
    ADD COLUMN promo_id int4 NOT NULL,
    ADD COLUMN scenario_id bigserial NOT NULL,
    ADD COLUMN scenario_name varchar NULL,
    ADD COLUMN discount_level int8 NOT NULL,
    ADD COLUMN copied_scenario int4 DEFAULT 0 NULL,
    ADD COLUMN scenario_order_id int2 DEFAULT 1 NOT NULL,
    ADD COLUMN created_by int4 NOT NULL,
    ADD COLUMN created_at timestamptz NOT NULL;

-- Recreate indexes to match DEV environment
CREATE INDEX idx_scenario_master_promo_id 
    ON price_promo.scenario_master USING btree (promo_id);
CREATE INDEX idx_scenario_master_promo_id_scenario_id 
    ON price_promo.scenario_master USING btree (promo_id, scenario_id);


ALTER TABLE price_promo.scenario_master
    ADD CONSTRAINT scenario_master_scenario_id_uk UNIQUE (scenario_id);

ALTER TABLE price_promo.scenario_master
    ADD CONSTRAINT scenario_master_pkey PRIMARY KEY (promo_id,scenario_id);




