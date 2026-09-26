--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_regrouping_change_log stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_regrouping_change_log

CREATE TABLE base_pricing_restaurant.bp_regrouping_change_log (
	id bigserial NOT NULL,
	request_id varchar(100) NOT NULL,
	pg_id int4 NULL,
	rule_id int4 NULL,
	strategy_id int4 NULL,
	sg_id int4 NULL,
	status varchar(20) NOT NULL,
	created_by int4 NULL,
	triggered_by varchar(20) DEFAULT 'user'::character varying NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	log_data jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT bp_regrouping_change_log_pkey PRIMARY KEY (id),
	CONSTRAINT chk_at_least_one_id CHECK (((pg_id IS NOT NULL) OR (rule_id IS NOT NULL) OR (strategy_id IS NOT NULL) OR (sg_id IS NOT NULL))),
	CONSTRAINT chk_status CHECK (((status)::text = ANY ((ARRAY['started'::character varying, 'success'::character varying, 'failed'::character varying])::text[]))),
	CONSTRAINT chk_triggered_by CHECK (((triggered_by)::text = ANY ((ARRAY['user'::character varying, 'system'::character varying])::text[]))),
	CONSTRAINT fk_product_group FOREIGN KEY (pg_id) REFERENCES base_pricing_restaurant.bp_product_group(pg_id) ON DELETE CASCADE,
	CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES base_pricing_restaurant.bp_rule_master(id) ON DELETE CASCADE,
	CONSTRAINT fk_store_group FOREIGN KEY (sg_id) REFERENCES base_pricing_restaurant.bp_store_group(store_group_id) ON DELETE CASCADE,
	CONSTRAINT fk_strategy FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE CASCADE
);
CREATE INDEX idx_bp_regrouping_change_log_created_at ON base_pricing_restaurant.bp_regrouping_change_log USING btree (created_at DESC);
CREATE INDEX idx_bp_regrouping_change_log_pg_id ON base_pricing_restaurant.bp_regrouping_change_log USING btree (pg_id) WHERE (pg_id IS NOT NULL);
CREATE INDEX idx_bp_regrouping_change_log_request_id ON base_pricing_restaurant.bp_regrouping_change_log USING btree (request_id);
CREATE INDEX idx_bp_regrouping_change_log_request_status ON base_pricing_restaurant.bp_regrouping_change_log USING btree (request_id, status);
CREATE INDEX idx_bp_regrouping_change_log_rule_id ON base_pricing_restaurant.bp_regrouping_change_log USING btree (rule_id) WHERE (rule_id IS NOT NULL);
CREATE INDEX idx_bp_regrouping_change_log_sg_id ON base_pricing_restaurant.bp_regrouping_change_log USING btree (sg_id) WHERE (sg_id IS NOT NULL);
CREATE INDEX idx_bp_regrouping_change_log_status ON base_pricing_restaurant.bp_regrouping_change_log USING btree (status);
CREATE INDEX idx_bp_regrouping_change_log_strategy_id ON base_pricing_restaurant.bp_regrouping_change_log USING btree (strategy_id) WHERE (strategy_id IS NOT NULL);
CREATE INDEX idx_bp_regrouping_change_log_triggered_by ON base_pricing_restaurant.bp_regrouping_change_log USING btree (triggered_by);



--changeset abhishek.singh@impactanalytics.co:bp_regrouping_change_log_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_regrouping_change_log

-- First, drop the existing check constraints in leslies
ALTER TABLE base_pricing_restaurant.bp_regrouping_change_log 
DROP CONSTRAINT chk_status;

ALTER TABLE base_pricing_restaurant.bp_regrouping_change_log 
DROP CONSTRAINT chk_triggered_by;

-- Now add the check constraints using cb client's syntax
ALTER TABLE base_pricing_restaurant.bp_regrouping_change_log 
ADD CONSTRAINT chk_status CHECK (((status)::text = ANY (ARRAY[('started'::character varying)::text, ('success'::character varying)::text, ('failed'::character varying)::text])));

ALTER TABLE base_pricing_restaurant.bp_regrouping_change_log 
ADD CONSTRAINT chk_triggered_by CHECK (((triggered_by)::text = ANY (ARRAY[('user'::character varying)::text, ('system'::character varying)::text])));