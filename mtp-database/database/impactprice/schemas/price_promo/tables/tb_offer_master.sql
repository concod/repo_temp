--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_offer_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_offer_master

CREATE TABLE price_promo.tb_offer_master (
    id INT4,
    name TEXT,    
    display_name TEXT,
    min_value INT4,
    max_value INT4,
    is_active INT4 DEFAULT 1,
    is_complex_offer BOOLEAN DEFAULT FALSE,
    take_max_value_from_product_master BOOLEAN DEFAULT FALSE
);