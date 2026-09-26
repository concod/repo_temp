-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_size_buy_data_modifications_03 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-03 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-03 
-- comment: initial changeset for tb_size_buy_data_03

CREATE TABLE IF NOT EXISTS size_smart.tb_size_buy_data (
	id serial4 NOT NULL,
	season_code int4 NOT NULL,
	style_color varchar NOT NULL,
	style_desc varchar NULL,
	buy_units numeric DEFAULT 0 NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	size_profile jsonb NULL,
	data_generated bool DEFAULT false NULL,
	floorset date NULL,
	exit_date date NULL,
	store varchar NOT NULL,
	selected_size_profile varchar NULL,
	status varchar DEFAULT 'Draft'::character varying NULL,
	l0_name text NOT NULL,
	levels jsonb NULL,
	CONSTRAINT tb_size_buy_data_pkey PRIMARY KEY (id),
	CONSTRAINT uq_tb_size_buy_data_unique UNIQUE (l0_name, style_color, store, season_code)
);
CREATE INDEX IF NOT EXISTS idx_tb_size_buy_data_floorset ON size_smart.tb_size_buy_data USING btree (floorset) WHERE (floorset IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tb_size_buy_data_l0_season_style_store ON size_smart.tb_size_buy_data USING btree (l0_name, season_code, style_color, store);
CREATE INDEX IF NOT EXISTS idx_tb_size_buy_data_style_color ON size_smart.tb_size_buy_data USING btree (style_color);