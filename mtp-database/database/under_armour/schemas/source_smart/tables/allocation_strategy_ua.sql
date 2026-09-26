--liquibase formatted sql
--changeset liquibase:allocation_strategy_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_strategy_ua

CREATE TABLE source_smart.allocation_strategy_ua (
	strategy_id uuid NOT NULL,
	strategy_name varchar(255) NOT NULL,
	description text NOT NULL,
	season_id varchar(255) NULL,
	forecast_version varchar(100) NULL,
	l0_name varchar(50) NULL,
	l1_name varchar(50) NULL,
	l2_name varchar(50) NULL,
	l3_name varchar(50) NULL,
	l4_name varchar(50) NULL,
	s0_name varchar(50) NULL,
	s1_name varchar(50) NULL,
	s2_name varchar(50) NULL,
	f0 numeric(18, 2) NULL,
	f1 numeric(18, 2) NULL,
	f2 numeric(18, 2) NULL,
	f3 numeric(18, 2) NULL,
	f4 numeric(18, 2) NULL,
	f5 numeric(18, 2) NULL,
	f6 numeric(18, 2) NULL,
	f7 numeric(18, 2) NULL,
	f8 numeric(18, 2) NULL,
	f9 numeric(18, 2) NULL,
	f10 numeric(18, 2) NULL,
	f11 numeric(18, 2) NULL,
	f12 numeric(18, 2) NULL,
	f13 numeric(18, 2) NULL,
	f14 numeric(18, 2) NULL,
	f15 numeric(18, 2) NULL,
	f16 numeric(18, 2) NULL,
	f17 numeric(18, 2) NULL,
	f18 numeric(18, 2) NULL,
	f19 numeric(18, 2) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	last_modified_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_by varchar(255) NOT NULL,
	last_modified_by varchar(255) NOT NULL,
	CONSTRAINT allocation_strategy_ua_pkey PRIMARY KEY (strategy_id),
	CONSTRAINT unique_strategy_name UNIQUE (strategy_name),
	CONSTRAINT fk_allocation_strategy_season FOREIGN KEY (season_id) REFERENCES source_smart.season_master(season_id)
);
CREATE INDEX idx_allocation_strategy_last_modified ON source_smart.allocation_strategy_ua USING btree (last_modified_at DESC);
CREATE INDEX idx_allocation_strategy_season_id ON source_smart.allocation_strategy_ua USING btree (season_id);

--changeset liquibase:allocation_strategy_ua_add_is_deletable stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: column to point that this strategy can't be deleted
ALTER TABLE source_smart.allocation_strategy_ua ADD COLUMN is_deletable bool DEFAULT true;