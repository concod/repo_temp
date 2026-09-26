--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_notification_master_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_master_v2

CREATE TABLE base_pricing_restaurant.bp_notification_master_v2 (
	id bigserial NOT NULL,
	notification_id int8 NOT NULL,
	user_id varchar(255) NOT NULL,
	noe_code int4 NOT NULL,
	tenant_id varchar(255) NOT NULL,
	priority varchar(20) DEFAULT 'normal'::character varying NULL,
	status varchar(20) DEFAULT 'pending'::character varying NULL,
	subject text NULL,
	description text NULL,
	url text NULL,
	special_classification varchar(50) NULL,
	target_users jsonb NOT NULL,
	template_data jsonb DEFAULT '{}'::jsonb NULL,
	notification_metadata jsonb DEFAULT '{}'::jsonb NULL,
	delivery_channels jsonb DEFAULT '{}'::jsonb NULL,
	retry_count int4 DEFAULT 0 NULL,
	max_retries int4 DEFAULT 3 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	sent_at timestamptz NULL,
	failed_at timestamptz NULL,
	classification varchar(50) NULL,
	extra_attributes jsonb DEFAULT '{}'::jsonb NULL,
	screen_code int4 NULL,
	application_code int4 DEFAULT 3 NULL,
	bucket_name varchar(255) DEFAULT 'New'::character varying NULL,
	filter_tags jsonb DEFAULT '[]'::jsonb NULL,
	bookmarked bool DEFAULT false NULL,
	CONSTRAINT bp_notification_master_v2_notification_id_key UNIQUE (notification_id),
	CONSTRAINT bp_notification_master_v2_pkey PRIMARY KEY (id),
	CONSTRAINT bp_notification_master_v2_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
	CONSTRAINT bp_notification_master_v2_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'sent'::character varying, 'failed'::character varying, 'retrying'::character varying])::text[])))
);
CREATE INDEX idx_bp_notification_master_v2_application_code ON base_pricing_restaurant.bp_notification_master_v2 USING btree (application_code);
CREATE INDEX idx_bp_notification_master_v2_bookmarked ON base_pricing_restaurant.bp_notification_master_v2 USING btree (bookmarked);
CREATE INDEX idx_bp_notification_master_v2_bucket_name ON base_pricing_restaurant.bp_notification_master_v2 USING btree (bucket_name);
CREATE INDEX idx_bp_notification_master_v2_created_at ON base_pricing_restaurant.bp_notification_master_v2 USING btree (created_at);
CREATE INDEX idx_bp_notification_master_v2_notification_id ON base_pricing_restaurant.bp_notification_master_v2 USING btree (notification_id);
CREATE INDEX idx_bp_notification_master_v2_screen_code ON base_pricing_restaurant.bp_notification_master_v2 USING btree (screen_code);
CREATE INDEX idx_bp_notification_master_v2_status ON base_pricing_restaurant.bp_notification_master_v2 USING btree (status);
CREATE INDEX idx_bp_notification_master_v2_tenant_id ON base_pricing_restaurant.bp_notification_master_v2 USING btree (tenant_id);
CREATE INDEX idx_bp_notification_master_v2_user_id ON base_pricing_restaurant.bp_notification_master_v2 USING btree (user_id);


--changeset abhishek.singh@impactanalytics.co:bp_notification_master_v2_05 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_master_v2_05

ALTER TABLE base_pricing_restaurant.bp_notification_master_v2 
DROP CONSTRAINT bp_notification_master_v2_notification_id_key,
ADD CONSTRAINT bp_notification_master_v2_notification_id_key 
UNIQUE (notification_id, user_id);



--changeset abhishek.singh@impactanalytics.co:bp_notification_master_v2_6 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_master_v2_6

-- 1. Drop the existing unique constraint
ALTER TABLE base_pricing_restaurant.bp_notification_master_v2 
DROP CONSTRAINT IF EXISTS bp_notification_master_v2_notification_id_key;

-- 2. Add the new unique constraint with both notification_id and user_id (matching CB client)
ALTER TABLE base_pricing_restaurant.bp_notification_master_v2 
ADD CONSTRAINT bp_notification_master_v2_notification_id_key 
UNIQUE (notification_id, user_id);

--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_notification_master_v2_7 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notification_master_v2_7
ALTER TABLE base_pricing_restaurant.bp_notification_master_v2 
ALTER COLUMN notification_id TYPE bigint 
USING notification_id::bigint;