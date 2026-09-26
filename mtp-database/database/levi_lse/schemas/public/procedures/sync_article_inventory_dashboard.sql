--liquibase formatted sql
--changeset himansh.bhardwaj:sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        --deleting the table
        delete from 
          inventory_smart.article_inventory_dashboard
        where 
          true;
        
        -- insert everything
        insert into inventory_smart.article_inventory_dashboard (
            article, store_code, store_name, floorset_date, markdown_date, l7_code, article_description, color, size_count, l2_name, l4_name, l5_name, l6_name, global_fit_platform, distributions, lw_units, lw_revenue, lw_margin_perc, price, promo_percentage, vir_pdu_remaining, last_8_week_sales, iob, oh, oh_it, oh_it_oo, stockout, shortfall, normal, excess, wos_oh, wos_oh_oo, wos_oh_it_oo, wos_target, oo, it, wos_oh_it, vir_reservation_total, delivered_mtd, perc_committed, sell_through_perc, instock_percentage, dc_oh, discount, last_4_week_sales, lw_margin, l0_name, l1_name, msrp, l3_name, w2_units, w3_units, w4_units, w5_units, w6_units, w7_units, w8_units, wtd_units, dc_it, dc_oo, in_stock_count, total_count, product_tag, store_grade, channel, country_id, state, store_group, territory, district, article_alert_flag
        ) 
        SELECT 
            article, store_code, store_name, floorset_date, markdown_date, l7_code, article_description, color, size_count, l2_name, l4_name, l5_name, l6_name, global_fit_platform, distributions, lw_units, lw_revenue, lw_margin_perc, price, promo_percentage, vir_pdu_remaining::jsonb, last_8_week_sales, iob::jsonb, oh, oh_it, oh_it_oo, stockout, shortfall, normal, excess, wos_oh, wos_oh_oo, wos_oh_it_oo, wos_target, oo, it, wos_oh_it, vir_reservation_total::jsonb, delivered_mtd, perc_committed, sell_through_perc, instock_percentage, dc_oh::jsonb, discount, last_4_week_sales, lw_margin, l0_name, l1_name, msrp, l3_name, w2_units, w3_units, w4_units, w5_units, w6_units, w7_units, w8_units, wtd_units, dc_it::jsonb, dc_oo::jsonb, in_stock_count, total_count, product_tag, store_grade, l0_name as channel, country_id, state, store_group, territory, district, article_alert_flag
        FROM 
          public.article_inventory_dashboard x
        LEFT JOIN (SELECT store_code,MAX(country_id) as country_id,MAX(state) as state,MAX(territory) as territory, MAX(district) as district FROM global.store_attributes_filter GROUP BY 1) y 
        USING(store_code)
        LEFT JOIN
        (
        select distinct store_code,array(SELECT jsonb_array_elements_text(store_group::jsonb))::varchar[] as store_group from
        (
        select distinct store_code,store_groups ->> 'name' as store_group 
        from
          (
          select
            store_code,
            json_build_object(
            'name',
            array_agg(distinct name)) as store_groups
          from
            (
            select
              distinct saf.store_code,
              a.sg_code,
              b.name
            from
              global.store_groups_mapping a
            inner join (
              select
                distinct sg_code,
                name,
                is_deleted
              from
                global.store_groups) b
                using(sg_code)
            inner join global.store_attributes_filter saf 
            using(store_code)
            where b.is_deleted is false ) b
          group by
            1 
          ) a ) b ) b
          using(store_code);
          
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    end
$procedure$
;