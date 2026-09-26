--liquibase formatted sql
--changeset liquibase:event_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master 
CREATE TABLE price_promo.event_master (
	event_id serial4 NOT NULL,
	"name" varchar NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	submit_by date NOT NULL,
	ad_type text NOT NULL,
	event_type text NOT NULL,
	marketing_notes text NULL,
	objective text NOT NULL,
	discounting_level varchar NULL,
	product_inclusion_type text NULL,
	has_locked_product_selection bool DEFAULT false NULL,
	store_selection_type text NULL,
	has_locked_store_selection bool DEFAULT false NULL,
	product_exclusion_type text NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NULL,
	is_locked bool DEFAULT false NULL,
	is_deleted int2 DEFAULT 0 NULL,
	is_under_processing bool DEFAULT false NULL,
	CONSTRAINT tb_event_master_pkey PRIMARY KEY (event_id)
);
CREATE INDEX event_master_start_date_idx ON price_promo.event_master USING btree (start_date, end_date);



--changeset liquibase:event_master_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dropping not null constraints from event_master

ALTER TABLE price_promo.event_master ALTER COLUMN ad_type DROP NOT NULL;
ALTER TABLE price_promo.event_master ALTER COLUMN event_type DROP NOT NULL;
ALTER TABLE price_promo.event_master ALTER COLUMN objective DROP NOT NULL;

--changeset liquibase:event_master_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding products_count and stores_count columns to event_master
ALTER TABLE price_promo.event_master 
ADD COLUMN products_count integer DEFAULT 0,
ADD COLUMN stores_count integer DEFAULT 0;


--changeset vamsi.balaga@impactanalytics.co:event_master_country_id stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding country_id column to event_master
ALTER TABLE price_promo.event_master ADD COLUMN country_id int4 DEFAULT 1 NULL;


--changeset harsh.singh@impactanalytics.co:event_master_03092026 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding customer related columns for event_master

ALTER TABLE price_promo.event_master 
ADD COLUMN IF NOT EXISTS customer_selection_type text NULL,
ADD COLUMN IF NOT EXISTS has_locked_customer_selection bool DEFAULT true NULL;


--changeset harsh.singh@impactanalytics.co:event_master_030920276 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding kvi_tagged_products_count column to event_master

ALTER TABLE price_promo.event_master ADD COLUMN IF NOT EXISTS kvi_tagged_products_count int4 DEFAULT 0 NULL;


--changeset narendren.saravanan@impactanalytics.co:event_master_status_170525 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding status column to event_master
ALTER TABLE price_promo.event_master ADD COLUMN status int2 DEFAULT 0 NOT NULL;

--changeset narendren.saravanan@impactanalytics.co:event_master_status_fk_constraint stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding foreign key constraint for status
ALTER TABLE price_promo.event_master ADD CONSTRAINT fk_event_master_status FOREIGN KEY (status) REFERENCES price_promo.event_status_config(status_id);