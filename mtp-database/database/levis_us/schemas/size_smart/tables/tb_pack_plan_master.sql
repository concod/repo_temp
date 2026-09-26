
-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_pack_plan_master_modification_changes_01 stripComments:false splitStatements:false context:tb_pack_plan_master_modification_changes_01 labels:tb_pack_plan_master_modification_changes_01	
-- comment: updated changeset for tb_pack_plan_master_01	

CREATE TABLE IF NOT EXISTS size_smart.tb_pack_plan_master (
	plan_code serial4 NOT NULL,
	plan_name varchar NOT NULL,
	created_by int4 NULL,
	"hierarchy" jsonb NULL,
	season varchar NULL,
	no_of_style_colors int4 DEFAULT 0 NULL,
	style_colors_with_prepack int4 DEFAULT 0 NULL,
	style_colors_optimized int4 DEFAULT 0 NULL,
	status varchar DEFAULT 'Draft'::character varying NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	is_deleted bool DEFAULT false NULL,
	season_code int4 NULL,
	season_start_date date NULL,
	season_end_date date NULL,
	style_colors_size_buy_generated float8 DEFAULT 0.0 NULL,
	pct_style_colors_with_prepack float8 DEFAULT 0.0 NULL,
	pct_style_colors_optimized float8 DEFAULT 0.0 NULL,
	pct_size_buy_generated float8 DEFAULT 0.0 NULL,
	total_buy_units numeric NULL,
	pack_buy_units numeric NULL,
	optimize_buy_units numeric NULL,
	CONSTRAINT pack_plan_master_pkey PRIMARY KEY (plan_code)
);

-- changeset akashkumar.rana@impactanalytics.co:tb_pack_plan_master_modification_changes_5 stripComments:false splitStatements:false context:tb_pack_plan_master_modification_changes_5 labels:tb_pack_plan_master_modification_changes_5	
-- comment: removed constraint on plan_name for levis_us_05
ALTER TABLE size_smart.tb_pack_plan_master
DROP CONSTRAINT IF EXISTS pack_plan_master_plan_name_key;