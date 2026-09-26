--liquibase formatted sql
--changeset akshay@impactanalytics.co:mfa_policies stripComments:false splitStatements:false context:Release_1 labels:mfa_policies
--comment: initial changeset for mfa_policies
CREATE TABLE "global".mfa_policies (
	id int4 NOT NULL,
	factor_type varchar NOT NULL,
	purpose varchar NOT NULL,
	ttl_seconds int4 NOT NULL,
	max_attempts int4 NOT NULL,
	resend_cooldown_seconds int4 DEFAULT 30 NOT NULL,
	max_resends_per_otp int4 DEFAULT 3 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	lifecycle_expiry int4 DEFAULT 420 NOT NULL,
	CONSTRAINT mfa_policies_factor_type_purpose_is_active_key UNIQUE (factor_type, purpose, is_active),
	CONSTRAINT mfa_policies_pkey PRIMARY KEY (id)
);