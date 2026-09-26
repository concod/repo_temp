--liquibase formatted sql
--changeset liquibase:update_allocation_detail runOnChange:true stripComments:false splitStatements:false context:MTP-43185 labels:MTP-43185
--comment: MTP-43185->MTP-43419, fix, added default carton factor as 1  and label change
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
    with article_store_level as (
    select
        carfg.allocation_code,
        carfg.article,
        carfg.store as store_code,
        sum(carfg.allocated_total) as allocated_qty
        from inventory_smart.create_allocation_result_flat_gurobi carfg
        where allocation_code = $1
        group by 1,2,3
    )
    ,article_store_qty as(
        select
            asl.allocation_code,
            asl.article,
            asl.store_code,
            saf.channel,
            asl.allocated_qty,
            bcf.carton_factor,
            ceil(asl.allocated_qty/COALESCE(bcf.carton_factor,1)) as carton_allocated_qty
            from article_store_level asl
            left join global.store_attributes_filter saf using(store_code)
            left join inventory_smart.brand_carton_factor bcf using(article, channel)
    )
    ,final_result as (
        select
            store_code,
            sum(allocated_qty) as allocated_qty,
            sum(carton_allocated_qty) as carton_allocated_qty
        from article_store_qty
        group by 1
    )
    SELECT array(
        select
            jsonb_build_object('store_code', fr.store_code, 'allocated_qty', fr.allocated_qty, 'carton_allocated_qty', fr.carton_allocated_qty)
        from final_result fr)
    INTO _data;
--    Updation Part
    IF COALESCE(array_length(_data,1), 0)>0 THEN
        FOR i IN array_lower(_data, 1) .. array_upper(_data, 1)
        loop
           UPDATE inventory_smart.store_unit_capacity as suc
            SET allocated_qty = COALESCE(suc.allocated_qty,0) + (_data[i]->>'allocated_qty')::integer,
                carton_allocated_qty = COALESCE(suc.carton_allocated_qty,0) + (_data[i]->>'carton_allocated_qty')::integer
            WHERE suc.store_code = _data[i]->>'store_code';
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
