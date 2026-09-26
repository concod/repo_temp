--liquibase formatted sql
--changeset liquibase:future_promotions_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for future_promotions_master


CREATE TABLE "global".future_promotions_master (
channel_code varchar NULL,
channel varchar NULL,
store_code varchar NOT NULL,
product_code varchar NOT NULL,
start_date Date NOT NULL,
end_date Date NOT NULL,
unit_retail_price float4 NULL,
discount_percent_offered float4 NULL,
discount_dollar_offered float4 NULL,
unit_net_selling_price float4 NULL,
promo_type varchar null,
CONSTRAINT future_promotions_master_pk PRIMARY KEY (store_code,product_code,start_date,end_date)
);