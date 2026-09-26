--liquibase formatted sql
--changeset aman.allkoju:article_inventory_dashboard_updates stripComments:false splitStatements:false context:Release_1_0 labels:article_inventory_dashboard_updates
--comment: article_inventory_dashboard_updates

CREATE TABLE IF NOT EXISTS inventory_smart.article_inventory_dashboard (
    article TEXT DEFAULT NULL,
    store_code TEXT DEFAULT NULL,
    channel TEXT DEFAULT NULL,
    oh FLOAT8 DEFAULT NULL,
    oo FLOAT8 DEFAULT NULL,
    it FLOAT8 DEFAULT NULL,
    tot_inv FLOAT8 DEFAULT NULL,
    lw_revenue FLOAT8 DEFAULT NULL,
    lw_margin FLOAT8 DEFAULT NULL,
    lw_margin_percentage FLOAT8 DEFAULT NULL,
    promo_percentage FLOAT8 DEFAULT NULL,
    total_count INT8 DEFAULT NULL,
    in_stock_count INT8 DEFAULT NULL,
    in_stock INT8 DEFAULT NULL,
    normal INT8 DEFAULT NULL,
    shortfall INT8 DEFAULT NULL,
    stockout INT8 DEFAULT NULL,
    excess INT8 DEFAULT NULL,
    oh_dc FLOAT8 DEFAULT NULL,
    oo_dc FLOAT8 DEFAULT NULL,
    it_dc FLOAT8 DEFAULT NULL,
    wos_oh FLOAT8 DEFAULT NULL,
    wos_oh_it FLOAT8 DEFAULT NULL,
    wos FLOAT8 DEFAULT NULL,
    twos FLOAT8 DEFAULT NULL,
    l0_name VARCHAR DEFAULT NULL,
    l1_name VARCHAR DEFAULT NULL,
    l2_name VARCHAR DEFAULT NULL,
    l3_name VARCHAR DEFAULT NULL,
    store_name VARCHAR DEFAULT NULL,
    product_type VARCHAR DEFAULT NULL,
    product_description VARCHAR DEFAULT NULL,
    launch_date VARCHAR DEFAULT NULL,
    price FLOAT8 DEFAULT NULL,
    aur FLOAT8 DEFAULT NULL,
    average_discount FLOAT8 DEFAULT NULL,
    l6m_units FLOAT8 DEFAULT NULL,
    ata_eaches FLOAT8 DEFAULT NULL,
    ata_packs FLOAT8 DEFAULT NULL,
    ata FLOAT8 DEFAULT NULL,
    dc_instock_count INT8 DEFAULT NULL,
    dc_instock_total_count INT8 DEFAULT NULL,
    dc_instock FLOAT8 DEFAULT NULL,
    version_code VARCHAR DEFAULT NULL,
    week_to_date_sales FLOAT8 DEFAULT NULL,
    last_day_sales FLOAT8 DEFAULT NULL,
    sales_1_ago FLOAT8 DEFAULT NULL,
    sales_2_ago FLOAT8 DEFAULT NULL,
    sales_3_ago FLOAT8 DEFAULT NULL,
    sales_4_ago FLOAT8 DEFAULT NULL,
    sales_5_ago FLOAT8 DEFAULT NULL,
    sales_6_ago FLOAT8 DEFAULT NULL,
    sales_7_ago FLOAT8 DEFAULT NULL,
    sales_8_ago FLOAT8 DEFAULT NULL,
    ros FLOAT8 DEFAULT NULL,
    dc_oh_oo_it_wos FLOAT8 DEFAULT NULL,
    dc_oh_wos FLOAT8 DEFAULT NULL,
    dc_oh_oo_wos FLOAT8 DEFAULT NULL,
    style_color_status VARCHAR DEFAULT NULL,
    si FLOAT8 DEFAULT NULL,
    si_oh_it FLOAT8 DEFAULT NULL,
    si_oh_oo_it FLOAT8 DEFAULT NULL,
    available_stores_percentage FLOAT8 DEFAULT NULL,
    sell_through_rate FLOAT8 DEFAULT NULL,
    grade VARCHAR DEFAULT NULL,

    CONSTRAINT article_inventory_dashboard_pk 
        PRIMARY KEY (article, store_code),

    CONSTRAINT article_inventory_dashboard_store_fk 
        FOREIGN KEY (store_code) 
        REFERENCES global.store_master(store_code) 
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);

--changeset aman.lakkoju:item_status_and_wos_oh_oo_columns_added stripComments:false splitStatements:false context:initial_release labels:item_status_and_wos_oh_oo_columns_added
--comment: item_status_and_wos_oh_oo_columns_added
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS item_status varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wos_oh_oo float4 NULL;

--changeset aman_lakkoju:Added_style_color_store_status stripComments:false splitStatements:false context:initial_release labels:Added_style_color_store_status
--comment: Added_style_color_store_status
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS style_color_store_status varchar NULL;