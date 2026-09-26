--liquibase formatted sql
--changeset saad.adeeb@impactanalytics.co:strategy_base stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.strategy_base definition
CREATE  TABLE inventory_smart.strategy_base (
	article text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	clearance int4 NULL,
	"style" text NULL,
	ph_code int4 NULL,
	channel text NULL,
	color text NULL,
	season text NULL,
	brand text NULL,
	launch_date text NULL,
	article_status_tag text NULL,
	product_description text NULL,
	style_color_id text NULL,
	product_code_size_map jsonb NULL,
	sizes _text NULL,
	product_codes _text NULL,
	gcsea_oh int4 NULL,
	korea_oh int4 NULL,
	japan_oh int4 NULL
);
ALTER TABLE inventory_smart.strategy_base ADD CONSTRAINT strategy_base_pk PRIMARY KEY (article,channel);

--changeset sidhartha.c@impactanalytics.co:strategy_base stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.strategy_base definition added column
ALTER TABLE inventory_smart.strategy_base
ADD COLUMN model_description VARCHAR,
ADD COLUMN supersede_flag VARCHAR;
