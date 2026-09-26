--liquibase formatted sql
--changeset abhimanyu.sheoran:store_split_ratio stripComments:false splitStatements:false context:Release_1_0 labels:store_split_ratio
--comment: store_split_ratio
CREATE TABLE inventory_smart.store_split_ratio (
	id serial4 NOT NULL,
	article varchar(50) NULL,
	product_code varchar(50) NOT NULL,
	"size" varchar(50) NULL,
	store_code varchar(50) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	peneteration float8 NULL,
	channel varchar NOT NULL,
	CONSTRAINT pk_store_split_ratio PRIMARY KEY (product_code, store_code, channel, fiscal_year_week)
);

--changeset raja.duraisamy@impactanalytics.co:store_split_ratio_index stripComments:false splitStatements:false context:Release_1_0 labels:store_split_ratio
--comment: store_split_ratio

CREATE INDEX IF NOT EXISTS idx_store_split_ratio_product_code_size_idx ON inventory_smart.store_split_ratio (product_code, size);