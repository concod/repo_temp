--liquibase formatted sql
--changeset darsh.badukle@impactanalytics.co:dc_to_dc_material_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.dc_to_dc_material_list

CREATE TABLE inventory_smart.dc_to_dc_material_master (
    article               VARCHAR,
    channel               VARCHAR,
    product_description   VARCHAR,
    style_color_id        VARCHAR,
    ax_structure          VARCHAR,
    ax_label              VARCHAR,
    ax_class              VARCHAR,
    ax_merch_division     VARCHAR,
    ax_subclass           VARCHAR,
    brand                 VARCHAR,
    gm_perc               DOUBLE PRECISION,
    aur                   DOUBLE PRECISION,
    PRIMARY KEY (article, channel)
);

--changeset kuldeep.rathore:dc_to_dc_material_list_season_year stripComments:false splitStatements:false context:Release_1_2 labels:MTP-59520
--comment: season and year added
ALTER TABLE inventory_smart.dc_to_dc_material_master
ADD COLUMN season varchar,
ADD COLUMN year varchar;