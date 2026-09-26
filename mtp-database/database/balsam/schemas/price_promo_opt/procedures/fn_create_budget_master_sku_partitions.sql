--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_create_budget_master_sku_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_create_budget_master_sku_partitions

DROP PROCEDURE if exists price_promo_opt.fn_create_budget_master_sku_partitions;
CREATE OR REPLACE PROCEDURE price_promo_opt.fn_create_budget_master_sku_partitions()
 LANGUAGE sql
AS $procedure$

CREATE TABLE "price_promo_opt"."budget_master_sku_default" PARTITION OF price_promo_opt.tb_budget_master_baseline default;

do $do$

    declare

    w record;

    begin 

            for w in select 

                     dd , 

                     to_char(dd ,'yyyymmdd') string_date,

                     min(dd)::date as start_date,

                     (max(dd) +  (1 || 'day')::interval)::date as end_date

                from generate_series( CURRENT_DATE-380, CURRENT_DATE+210, '1 day'::interval) dd

                group by 1 

                order by 1

            loop

                execute format('CREATE TABLE price_promo_opt.%I PARTITION OF price_promo_opt.tb_budget_master_baseline FOR VALUES FROM (%L) TO (%L)',

                'budget_master_sku_' || w.string_date::varchar,

                w.start_date,

                w.end_date

                );

            end loop;

    end

$do$;

$procedure$



;