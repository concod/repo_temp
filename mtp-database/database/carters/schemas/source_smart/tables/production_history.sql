--liquibase formatted sql
--changeset liquibase:production_history stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for production_history
CREATE TABLE source_smart.production_history (
	history_id varchar(255) NOT NULL,
	vendor_id varchar(255) NULL,
	facility_id varchar(255) NULL,
	dc_code varchar(255) NULL,
	construction_type_id varchar(255) NULL,
	season_id varchar(255) NULL,
	allocated_quantity int4 NULL,
	style_color_id varchar(255) NULL,
	CONSTRAINT ph_pk PRIMARY KEY (history_id),
	CONSTRAINT fk_style_color FOREIGN KEY (style_color_id) REFERENCES source_smart.product_master(style_color_id) ON DELETE CASCADE,
	CONSTRAINT production_history_construction_type_master_fk FOREIGN KEY (construction_type_id) REFERENCES source_smart.construction_type_master(construction_type_id) ON DELETE CASCADE,
	CONSTRAINT production_history_facility_master_fk FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE,
	CONSTRAINT production_history_season_master_fk FOREIGN KEY (season_id) REFERENCES source_smart.season_master(season_id) ON DELETE CASCADE,
	CONSTRAINT production_history_store_master_fk FOREIGN KEY (dc_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT production_history_vendor_master_fk FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);