

-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_pack_summary_buy_modification_changes stripComments:false splitStatements:false context:tb_pack_summary_buy_modification_changes labels:tb_pack_summary_buy_modification_changes
-- comment: updated changeset for tb_pack_summary_buy

CREATE TABLE size_smart.tb_pack_summary_buy (
	id serial4 NOT NULL,
	style_color varchar NOT NULL,
	planning_group varchar NOT NULL,
	sizes json NULL,
	style_desc varchar NULL,
	valid_config int4 NULL,
	prepack_config int4 NULL,
	sizes_prepack int4 NULL,
	buy_qty int4 NULL,
	plan_code int4 NOT NULL,
	status varchar NULL,
	season_code int4 NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	total_store int4 NULL,
	floorset date NULL,
	size_dist jsonb NULL,
	CONSTRAINT pack_summary_buy_pkey PRIMARY KEY (id),
	CONSTRAINT unique_style_plan_season UNIQUE (style_color, planning_group, plan_code, season_code)
);

-- changeset akashkumar.rana@impactanalytics.co:tb_pack_summary_buy_modification_changes_2 stripComments:false splitStatements:false context:tb_pack_summary_buy_modification_changes_2 labels:tb_pack_summary_buy_modification_changes_2	
-- comment: updated changeset for tb_pack_summary_buy_02

ALTER TABLE size_smart.tb_pack_summary_buy
ALTER COLUMN sizes_prepack TYPE jsonb USING to_jsonb(sizes_prepack);

ALTER TABLE size_smart.tb_pack_summary_buy
ALTER COLUMN sizes_prepack DROP NOT NULL;



-- changeset akashkumar.rana@impactanalytics.co:tb_pack_summary_buy_modification_changes_3 stripComments:false splitStatements:false context:tb_pack_summary_buy_modification_changes_3 labels:tb_pack_summary_buy_modification_changes_3	
-- comment: updated changeset for tb_pack_summary_buy_03

ALTER TABLE size_smart.tb_pack_summary_buy
ADD COLUMN trigger int4 DEFAULT 0 NOT NULL;

-- changeset akashkumar.rana@impactanalytics.co:tb_pack_summary_buy_modification_changes_4 stripComments:false splitStatements:false context:tb_pack_summary_buy_modification_changes_4 labels:tb_pack_summary_buy_modification_changes_4	
-- comment: updated changeset for tb_pack_summary_buy_04
alter table size_smart.tb_pack_summary_buy
add column size_dist_new jsonb null;

alter table size_smart.tb_pack_summary_buy
add column buy_qty_new int4 null;

-- changeset akashkumar.rana@impactanalytics.co:tb_pack_summary_buy_modification_changes_5 stripComments:false splitStatements:false context:tb_pack_summary_buy_modification_changes_5 labels:tb_pack_summary_buy_modification_changes_5	
-- comment: updated changeset for tb_pack_summary_buy_05
alter table size_smart.tb_pack_summary_buy 
add column updated_by int4 null;

-- changeset akashkumar.rana@impactanalytics.co:tb_pack_summary_buy_modification_changes_6 stripComments:false splitStatements:false context:tb_pack_summary_buy_modification_changes_6 labels:tb_pack_summary_buy_modification_changes_6	
-- comment: updated changeset for tb_pack_summary_buy_06
ALTER TABLE size_smart.tb_pack_summary_buy
ADD COLUMN size_range_id int4 NULL;