--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:ph_auto_alloc_rule_mapping_ddl stripComments:false splitStatements:false context:Release_MTP_47934 labels:MTP_47934
--comment: initial changeset for ph_auto_alloc_rule_mapping

CREATE TABLE inventory_smart.ph_auto_alloc_rule_mapping (
	ph_code int4 NOT NULL,
	article varchar NOT NULL,
	channel varchar NOT NULL,
	approval_type varchar NULL,
	threshold float8 NULL,
	l0_name varchar NOT NULL,
	is_active bool DEFAULT true NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT unique_article_channel UNIQUE (article, channel)
);
CREATE INDEX idx_auto_alloc_scheduler_type ON inventory_smart.ph_auto_alloc_rule_mapping USING btree (article, channel);