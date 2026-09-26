--liquibase formatted sql
    --changeset kumaran:tb_transaction_latest_mkd_v6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for tb_transaction_latest_mkd_v6
CREATE TABLE price_markdown_opt.tb_transaction_latest_mkd (
        date_id date NOT NULL,
        s0_id int4 NOT NULL,
        s1_id int4 NOT NULL,
        country text NULL,
        channel text NULL,
        style_cuq text NULL,
        product_id int8 NOT NULL,
        store_id int4 NOT NULL,
        clearance_indicator int4 NULL,
        "cost" float4 NULL,
        base_price float4 NULL,
        retail_price float4 NULL,
        quantity int4 NULL,
        revenue float4 NULL,
        margin float4 NULL,
        aur float4 NULL,
        aum float4 NULL,
        final_price float4 NULL,
        final_discount_percent float4 NULL,
        promo_discount float4 NULL,
        total_inv int4 NULL,
        sync_date_time date NULL,
        CONSTRAINT mkd_txn_pkey PRIMARY KEY (product_id, store_id, s0_id, s1_id, date_id)
)
PARTITION BY RANGE (date_id);
CREATE INDEX mkd_s1_id_product_id_idx ON price_markdown_opt.tb_transaction_latest_mkd USING btree (product_id, store_id, s0_id, s1_id, date_id);
