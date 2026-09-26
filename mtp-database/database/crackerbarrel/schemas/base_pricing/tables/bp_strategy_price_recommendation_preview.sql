--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_price_recommendation_preview stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_price_recommendation_preview

CREATE TABLE base_pricing.bp_strategy_price_recommendation_preview (
	session_id varchar(100) NOT NULL,
	strategy_id int4 NULL,
	view_type varchar(50) NULL,
	hd_sku varchar(100) NULL,
	base_price_finalized_price numeric NULL,
	"comments" text NULL,
	store_id varchar(100) NULL,
	store_name varchar(255) NULL,
	price_zone varchar(100) NULL,
	line_group varchar(100) NULL,
	created_by varchar(255) NOT NULL,
	created_at timestamp NOT NULL,
	expires_at timestamp DEFAULT (now() + '24:00:00'::interval) NULL,
	segment_id int4 NULL,
	channel_id int4 NULL,
	is_selected bool DEFAULT true NOT NULL
);

CREATE INDEX idx_preview_expires_at ON base_pricing.bp_strategy_price_recommendation_preview USING btree (expires_at);
CREATE INDEX idx_preview_strategy_id ON base_pricing.bp_strategy_price_recommendation_preview USING btree (strategy_id);