--liquibase formatted sql
--changeset liquibase:season_product_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for season_product_mapping
CREATE TABLE source_smart.season_product_mapping (
	mapping_id varchar(255) NOT NULL,
	season_id varchar(255) NOT NULL,
	style_color_id varchar(255) NOT NULL,
	new_product_flag varchar(1) NOT NULL,
	CONSTRAINT pm_pk PRIMARY KEY (mapping_id),
	CONSTRAINT pm_product_master_fk FOREIGN KEY (style_color_id) REFERENCES source_smart.product_master(style_color_id) ON DELETE CASCADE,
	CONSTRAINT pm_season_master_fk FOREIGN KEY (season_id) REFERENCES source_smart.season_master(season_id) ON DELETE CASCADE
);