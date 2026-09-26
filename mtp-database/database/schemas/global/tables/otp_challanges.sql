
--liquibase formatted sql
--changeset liquibase:akshay.jain stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for otp_challenges
CREATE TABLE "global".otp_challenges (
	user_id int8 NOT NULL,
	policy_id int8 NOT NULL,
	otp_hash bytea NOT NULL,
	otp_salt bytea NOT NULL,
	attempts int4 DEFAULT 0 NOT NULL,
	resend_count int4 DEFAULT 0 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	last_sent_at timestamptz NULL,
	expires_at timestamptz NOT NULL,
	used_at timestamptz NULL,
	id bigserial NOT NULL,
	otp_enc bytea NULL,
	oc_lifecycle_expiry timestamptz NOT NULL,
	CONSTRAINT otp_challenges_pkey PRIMARY KEY (id),
	CONSTRAINT otp_challenges_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES "global".mfa_policies(id),
	CONSTRAINT otp_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES "global".user_master(user_code) ON DELETE CASCADE
);