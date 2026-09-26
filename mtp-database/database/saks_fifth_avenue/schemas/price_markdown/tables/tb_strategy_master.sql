--liquibase formatted sql
--changeset liquibase:tb_strategy_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_master - added serial 4
CREATE TYPE price_markdown."customise_by" AS ENUM (
	'weekly',
	'full_custom',
	'config_object'
);
CREATE TABLE price_markdown.tb_strategy_master (
	strategy_id serial4 NOT NULL,
	strategy_name text NOT NULL,
	strategy_comment text NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	status int2 NULL DEFAULT 0,
	product_recommendation_level int2 NULL DEFAULT '-200'::integer,
	store_recommendation_level int2 NULL DEFAULT '-200'::integer,
	markdown_type_id int2 NULL DEFAULT 1,
	optimisation_type int2 NULL DEFAULT 1,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	step_count int2 NULL DEFAULT 0,
	finalised_ia_recc int2 NULL,
	is_optimisation_running bool NOT NULL DEFAULT false,
	parent_strategy int4 NULL,
	calendar_config_id int4 NULL,
	calendar_config_json jsonb NULL,
	"customise_by" price_markdown."customise_by" NULL,
	draft_scenario_present bool NULL DEFAULT false,
	configured_by_sku_store_mapping bool NULL DEFAULT false,
	final_data_prepared bool NULL DEFAULT false,
	is_simulation_running bool NULL DEFAULT false,
	strategy_version int4 NULL,
	CONSTRAINT strategy_pkey PRIMARY KEY (strategy_id)
);
CREATE INDEX strategy_master_dates_idx_1 ON price_markdown.tb_strategy_master USING btree (start_date, end_date);



--liquibase formatted sql
--changeset liquibase:tb_strategy_master_version_column_addition_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed version column and added default as 1
ALTER TABLE price_markdown.tb_strategy_master DROP COLUMN strategy_version;
ALTER TABLE price_markdown.tb_strategy_master ADD version_number int NULL default 1;


--liquibase formatted sql
--changeset liquibase:copy_ia_session_id_column_addition_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added last_copy_ia_session_id column
ALTER TABLE price_markdown.tb_strategy_master ADD last_copy_ia_session_id varchar NULL;


--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:added_column_is_automated_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_automated column, default set to false.
ALTER TABLE price_markdown.tb_strategy_master ADD is_automated bool NULL DEFAULT false;



--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:added_previous_status_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added previous_status column
ALTER TABLE price_markdown.tb_strategy_master ADD previous_status int NULL;
--changeset vamsi.balaga@impactanalytics.co-11-08-20240-5:54:00:added_root_strategy_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added root_strategy column
ALTER TABLE price_markdown.tb_strategy_master ADD root_strategy int NULL;
--changeset harsh.singh@impactanalytics.co-11-11-2024-03:05:00:updating_final_data_prepared_column_value stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updating final_data_preparedt column value
update price_markdown.tb_strategy_master set final_data_prepared=false where final_data_prepared=true;
--changeset durgaprasad.tulugu@impactanalytics.co:added_column_allow_only_with_inv stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added column allow_only_with_inv.
ALTER TABLE price_markdown.tb_strategy_master ADD allow_only_with_inv boolean NOT NULL DEFAULT false;

--changeset durgaprasad.tulugu@impactanalytics.co:added_column_is_under_processing stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added column is_under_processing.
ALTER TABLE price_markdown.tb_strategy_master ADD is_under_processing bool NULL DEFAULT false;

--changeset durgaprasad.tulugu@impactanalytics.co:changed_the_default_value_for_is_under_processing stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed the default value for is_under_processing.
ALTER TABLE price_markdown.tb_strategy_master ALTER COLUMN allow_only_with_inv SET DEFAULT true;
