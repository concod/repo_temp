--liquibase formatted sql
--changeset liquibase:stylecolor_facility_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for stylecolor_facility_mapping
CREATE TABLE source_smart.stylecolor_facility_mapping (
	style_color_id varchar(255) NOT NULL,
	facility_id varchar(255) NOT NULL,
	facility_tier2_eligibility varchar(50) NULL,
	CONSTRAINT fk_fid FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE,
	CONSTRAINT fk_scifc FOREIGN KEY (style_color_id) REFERENCES source_smart.product_master(style_color_id) ON DELETE CASCADE
);
