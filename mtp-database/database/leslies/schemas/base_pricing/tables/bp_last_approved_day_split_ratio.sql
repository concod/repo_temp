--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_day_split_ratio_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_last_approved_day_split_ratio_10


CREATE TABLE base_pricing.bp_last_approved_day_split_ratio (
    strategy_id int4 NOT NULL,
    l2_cid int4 NOT NULL,
    brand_id int4 NOT NULL,
    dates date NOT NULL,
    week_start_date date NOT NULL,
    day_ratio_bnm float8 NOT NULL,
    day_ratio_ecom float8 NOT NULL,
    snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approval_date timestamp NOT NULL,
    created_by int4 NOT NULL,
    CONSTRAINT bp_last_approved_day_split_ratio_pkey PRIMARY KEY (strategy_id, l2_cid, brand_id, dates),
    CONSTRAINT bp_last_approved_day_split_ratio_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id) ON DELETE CASCADE
);

CREATE INDEX idx_last_approved_day_approval_date ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_day_date_range ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id, dates);
CREATE INDEX idx_last_approved_day_l2_brand_date ON base_pricing.bp_last_approved_day_split_ratio USING btree (l2_cid, brand_id, dates);
CREATE INDEX idx_last_approved_day_strategy_date_l2_brand ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id, dates, l2_cid, brand_id);
CREATE INDEX idx_last_approved_day_strategy_id ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id);
CREATE INDEX idx_last_approved_day_week_range ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id, week_start_date);