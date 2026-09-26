--liquibase formatted sql
--changeset liquibase:facility_cost_summary stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_cost_summary
CREATE TABLE source_smart.facility_cost_summary (
	style_color_id varchar(255) NULL,
	store_code varchar(255) NULL,
	facility_id varchar(255) NULL,
	facility_country varchar(255) NULL,
	season_id varchar(255) NULL,
	fob numeric(12, 4) NULL,
	tariff_rate numeric(5, 4) NULL,
	freight numeric(12, 4) NULL,
	total_landed_cost numeric(12, 4) NULL,
	construction_type_id varchar(255) NULL,
	sourcing_class varchar(255) NULL,
	cost_id varchar(255) NULL,
	t2_sourcing_option_id varchar(255) NULL,
	t2_material_cost numeric(12, 4) NULL,
	CONSTRAINT fk_ct FOREIGN KEY (construction_type_id) REFERENCES source_smart.construction_type_master(construction_type_id) ON DELETE CASCADE,
	CONSTRAINT fk_fid FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE,
	CONSTRAINT fk_sc FOREIGN KEY (store_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT fk_scid FOREIGN KEY (style_color_id) REFERENCES source_smart.product_master(style_color_id) ON DELETE CASCADE,
	CONSTRAINT fk_si FOREIGN KEY (season_id) REFERENCES source_smart.season_master(season_id) ON DELETE CASCADE
);
