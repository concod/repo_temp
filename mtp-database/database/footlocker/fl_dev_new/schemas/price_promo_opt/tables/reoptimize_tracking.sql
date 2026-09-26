--liquibase formatted sql
--changeset liquibase:reoptimize_tracking stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reoptimize_tracking


CREATE TABLE price_promo_opt.reoptimize_tracking (
	id serial4 NOT NULL,
	promo_id int4 NOT NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	"date" date NOT NULL,
	error_message text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT reoptimize_tracking_pkey PRIMARY KEY (id),
	CONSTRAINT reoptimize_tracking_promo_date_key UNIQUE (promo_id, date),
	CONSTRAINT reoptimize_tracking_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text])))
);
CREATE INDEX idx_reoptimize_tracking_date_status ON price_promo_opt.reoptimize_tracking USING btree (date, status);
CREATE INDEX idx_reoptimize_tracking_promo_id ON price_promo_opt.reoptimize_tracking USING btree (promo_id);