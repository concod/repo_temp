--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_user_email_master stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_user_email_master

CREATE TABLE base_pricing.bp_user_email_master (
	id bigserial NOT NULL,
	user_id int4 NOT NULL,
	email_address varchar(255) NOT NULL,
	email_type varchar(50) DEFAULT 'primary'::character varying NULL,
	is_verified bool DEFAULT false NULL,
	is_active bool DEFAULT true NULL,
	verification_token varchar(255) NULL,
	verification_expires_at timestamptz NULL,
	email_preferences jsonb DEFAULT '{"system": true, "strategy": true, "marketing": true, "price_alerts": true, "weekly_reports": false}'::jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT bp_user_email_master_email_format CHECK (((email_address)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
	CONSTRAINT bp_user_email_master_email_type_check CHECK (((email_type)::text = ANY (ARRAY[('primary'::character varying)::text, ('secondary'::character varying)::text, ('work'::character varying)::text, ('personal'::character varying)::text]))),
	CONSTRAINT bp_user_email_master_pkey PRIMARY KEY (id),
	CONSTRAINT bp_user_email_master_user_email_unique UNIQUE (user_id, email_address)
);

CREATE INDEX idx_user_email_master_active ON base_pricing.bp_user_email_master USING btree (is_active, is_verified);
CREATE INDEX idx_user_email_master_email_address ON base_pricing.bp_user_email_master USING btree (email_address);
CREATE INDEX idx_user_email_master_user_id ON base_pricing.bp_user_email_master USING btree (user_id);
CREATE INDEX idx_user_email_master_verification ON base_pricing.bp_user_email_master USING btree (verification_token) WHERE (verification_token IS NOT NULL);