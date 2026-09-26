--liquibase formatted sql
--changeset liquibase:tb_strategy_config_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_config  - added trigger_config_id and removed strategy_config_id

CREATE TABLE price_markdown.tb_strategy_config (
	strategy_config_comment text NULL,
	calendar_config_id int4 NOT NULL,
	no_of_weeks int4 NOT NULL,
	no_of_days int4 NOT NULL,
	product_recommendation_level int2 DEFAULT '-200'::integer NULL,
	store_recommendation_level int2 DEFAULT '-200'::integer NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	updated_by int4 DEFAULT 0 NULL,
	min_discount int4 NULL,
	max_discount int4 NULL,
	min_step_size int4 NULL,
	max_step_size int4 NULL,
	min_markdowns int4 NULL,
	max_markdowns int4 NULL,
	sell_through_percent float4 NOT NULL,
	gross_margin_percent float4 NULL,
	least_selected_product_hierarchy_level int4 NULL,
	is_active int2 DEFAULT 1 NOT NULL,
	trigger_config_id int4 NULL,
	CONSTRAINT trigger_config_id FOREIGN KEY (trigger_config_id) REFERENCES price_markdown.tb_clearance_trigger_info_master(trigger_id)
);


--changeset utkarsh.tiwari@impactanalytics.co:added_column_is_hard_markdown stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_hard_markdown column, default set to TRUE.	
ALTER TABLE price_markdown.tb_strategy_config
ADD COLUMN is_hard_markdown BOOLEAN NOT NULL DEFAULT TRUE;