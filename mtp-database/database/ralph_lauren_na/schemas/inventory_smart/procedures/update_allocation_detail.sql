--liquibase formatted sql
--changeset karthikeswar:update_allocation_detail runOnChange:true stripComments:false splitStatements:false context:MTP-62526 labels:MTP-62526
--comment: MTP-62526
--rollback: SELECT 1
DROP procedure if exists inventory_smart.update_allocation_detail(plan_code varchar);
CREATE OR REPLACE PROCEDURE inventory_smart.update_allocation_detail(IN plan_code character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.update_allocation_detail';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _data jsonb[];
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
--    Calculation Part
    WITH article_store_level as materialized(
    SELECT
        carfg.allocation_code,
        carfg.article,
        carfg.store as store_code,
        SUM(carfg.allocated_total) as allocated_qty
        FROM inventory_smart.create_allocation_result_flat_gurobi carfg
        WHERE allocation_code = '102633'
        GROUP BY 1,2,3
    )
    -- done this way to avoid issue with same article multiple products with same size(highly rare to occur - seen recently).
    ,article_l3 as (
    	SELECT
    	    article, max(l3_name) l3_name
    	    FROM "global".product_attributes_filter paf
    	    WHERE article IN (SELECT DISTINCT article FROM article_store_level)
    	    GROUP BY article
    )
    ,article_store_l3_qty as(
        SELECT
            asl.allocation_code,
            asl.article,
            asl.store_code,
            asl.allocated_qty,
            al3.l3_name
            FROM article_store_level asl
            LEFT JOIN article_l3 al3 USING(article)
    )
    ,final_result as (
        SELECT
        	l3_name,
            store_code,
            SUM(allocated_qty) as allocated_qty
        FROM article_store_l3_qty
        GROUP BY 1, 2
    )
    SELECT array(
        select
            jsonb_build_object('product_hierarchy', fr.l3_name, 'store_code', fr.store_code, 'allocated_qty', fr.allocated_qty)
        from final_result fr)
    INTO _data;
--    Updation Part
    IF COALESCE(array_length(_data,1), 0)>0 THEN
        FOR i IN array_lower(_data, 1) .. array_upper(_data, 1)
        loop
           UPDATE inventory_smart.store_unit_capacity as suc
            SET allocated_qty = COALESCE(suc.allocated_qty,0) + (_data[i]->>'allocated_qty')::integer
            WHERE suc.store_code = _data[i]->>'store_code' and suc.product_hierarchy = _data[i]->>'product_hierarchy';
        END LOOP;
    END IF;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;
