--liquibase formatted sql
--changeset liquibase:tb_agg_fin stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_agg_fin
CREATE TABLE "price_markdown"."tb_agg_fin" (
    strategy_id int4 NOT NULL,
    product_level_id int4 NOT NULL,
    store_level_id int4 NOT NULL,
    recommendation_date date NOT NULL,
    recommended_offer_percentage float8 NOT NULL,
    effective_price_point float8 NOT NULL,
    pcd_id int4 NOT NULL,
    sales_units float8 NULL DEFAULT 0,
    margin float8 NULL DEFAULT 0,
    revenue float8 NULL DEFAULT 0,
    status int2 NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NULL DEFAULT now(),
    created_by int4 NOT NULL DEFAULT 0,
    updated_by int4 NULL DEFAULT 0,
    rem_inv float8 NULL,
    spend float8 NULL,
    sales_units_uncapped float8 NULL
)PARTITION BY LIST (strategy_id)
;


--changeset surya.avinash@impactanalytics.co:tb_agg_fin_add_columns_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add previous_markdown_percentage and channel_info columns

ALTER TABLE "price_markdown"."tb_agg_fin"
ADD COLUMN previous_markdown_percentage float8 NULL,
ADD COLUMN channel_info varchar NULL;

--changeset keerthana.reddy@impactanalytics.co:tb_agg_fin_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown.tb_agg_fin
ADD COLUMN currency_id int8,
ADD COLUMN effective_price_point_with_vat float8,
ADD COLUMN margin_with_vat float8,
ADD COLUMN revenue_with_vat float8,
ADD COLUMN spend_with_vat float8;
