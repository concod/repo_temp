--liquibase formatted sql
--changeset liquibase:dc_split_ratio stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: initial changeset for dc_split_ratio

CREATE TABLE IF NOT EXISTS oms.dc_split_ratio (
	id serial4 NOT NULL,
	article varchar(100) NULL,
	product_code varchar(100) NOT NULL,
	"size" varchar(100) NULL,
	loc_code varchar(100) NOT NULL,
	channel varchar(100) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	penetration float8 NULL,
	CONSTRAINT pk_dc_split_ratio PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);

 --changeset raja.duraisamy@impactanalytics.co:dc_split_ratio_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for dc_split_ratio based on query analysis
CREATE INDEX IF NOT EXISTS dc_split_ratio_combine_idx ON oms.dc_split_ratio USING btree (product_code, loc_code, article, "size");