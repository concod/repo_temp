--liquibase formatted sql
--changeset himansh.bhardwaj:sync_aid_aa_dc_2  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sync_aid_aa_dc_2
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_aid_aa_dc();
CREATE OR REPLACE PROCEDURE public.sync_aid_aa_dc()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_aid_aa_dc';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    WITH product_dc_mapping AS (
    SELECT article, l0_name, dc_code
    FROM "global".product_mapping_product_dc pmpd
    LEFT JOIN "global".product_attributes_filter paf USING(product_code)
    WHERE is_active = true
    GROUP BY 1,2,3
    ),
    aic AS (
    SELECT article, dc_code, vir_reservation_remaining
    FROM inventory_smart.article_inventory_constraint
    WHERE dc_flag = true
    ),
    us_ecom_vir AS (
    SELECT
        pdm.article, pdm.l0_name, pdm.dc_code,
        COALESCE(aic.vir_reservation_remaining, 0) AS vir_reservation_remaining,
        SUM(CASE WHEN COALESCE(aic.vir_reservation_remaining,0) > 0 THEN 1 ELSE 0 END) OVER (PARTITION BY pdm.article) AS has_vir_positive
    FROM product_dc_mapping pdm
    LEFT JOIN aic ON pdm.article = aic.article AND pdm.dc_code = aic.dc_code
    WHERE pdm.l0_name = 'US O O ECOM'
    ),
    final_mapping AS (
    SELECT article, l0_name, dc_code
    FROM (
        SELECT article, l0_name, dc_code,
        CASE
            WHEN has_vir_positive > 0 THEN CASE WHEN vir_reservation_remaining > 0 THEN 1 ELSE 0 END
            ELSE 0
        END AS keep_row
        FROM us_ecom_vir
        UNION ALL
        SELECT pdm.article, pdm.l0_name, pdm.dc_code, 1 AS keep_row
        FROM product_dc_mapping pdm
        WHERE pdm.l0_name <> 'US O O ECOM'
    ) x
    WHERE keep_row = 1
    ),
    sku_dc_available_units as (
    select article,dc_code,sum(oh) as oh 
    from inventory_smart.sku_dc_available_units sdau 
    group by 1,2
    having sum(oh)>0
    ),
    final_cte as (
    select  f.*,name,row_number() over(partition by  article order by name) as rnk from final_mapping f
    join sku_dc_available_units using(article,dc_code)
    left join global.distribution_centres using(dc_code)
    )
    ,usable as (
    select article,b.name AS auto_allocation_dc from final_cte fc JOIN (SELECT dc_code,name FROM "global".distribution_centres dc) b using(dc_code)
    where rnk=1
    )

    update inventory_smart.article_inventory_dashboard a
    set auto_allocation_dc = b.auto_allocation_dc
    from usable b
    where a.article = b.article;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;