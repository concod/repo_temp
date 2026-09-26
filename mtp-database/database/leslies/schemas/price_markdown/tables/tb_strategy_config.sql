--liquibase formatted sql
--changeset liquibase:tb_strategy_config_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_config  - added serial 4
CREATE TABLE price_markdown.tb_strategy_config (
	strategy_config_id serial4 NOT NULL,
	strategy_config_name text NOT NULL,
	strategy_config_comment text NULL,
	calendar_config_id int4 NOT NULL,
	no_of_weeks int4 NOT NULL,
	no_of_days int4 NOT NULL,
	product_recommendation_level int2 NULL DEFAULT '-200'::integer,
	store_recommendation_level int2 NULL DEFAULT '-200'::integer,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	min_discount int4 NULL,
	max_discount int4 NULL,
	min_step_size int4 NULL,
	max_step_size int4 NULL,
	min_markdowns int4 NULL,
	max_markdowns int4 NULL,
	sell_through_percent float4 NOT NULL,
	gross_margin_percent float4 NULL,
	least_selected_product_hierarchy_level int4 NULL,
	CONSTRAINT strategy_config_pkey PRIMARY KEY (strategy_config_id),
	CONSTRAINT tb_strategy_config_unique UNIQUE (strategy_config_name)
);


--changeset durgaprasad.tulugu@impactanalytics.co:added_column_is_active_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_active column, default set to 1.
ALTER TABLE price_markdown.tb_strategy_config ADD is_active int2 NOT NULL DEFAULT 1;
