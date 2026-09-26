--liquibase formatted sql
--changeset linu.nazil:update_alerts_product_store_level runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:new_sp for allocation tracker fix for alerts color
--comment: initial changeset for update_article_allocation_tracker fix for alerts color
--rollback: SELECT 1
drop procedure if exists inventory_smart.update_alerts_product_store_level(plan_code varchar);
CREATE OR REPLACE PROCEDURE inventory_smart.update_alerts_product_store_level(IN plan_code character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.update_alerts_product_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
   _at date;
   _article_cursor jsonb[];
   i int;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    SELECT max(updated_at) INTO _at FROM inventory_smart.plan_master p WHERE p.plan_code = $1;

    SELECT ARRAY(
        SELECT DISTINCT jsonb_build_object('article', a.article, 'channel', a.channel, 'inventory_source', p.inventory_source)
        FROM inventory_smart.article_allocation_tracker a
        JOIN inventory_smart.create_allocation_result_flat_gurobi p USING (article)
        WHERE p.allocation_code = $1 
    ) INTO _article_cursor;

    FOR i IN array_lower(_article_cursor, 1) .. array_upper(_article_cursor, 1)
    loop
        if _article_cursor[i]->>'inventory_source' = 'dc' then
            UPDATE inventory_smart.alerts_product_store_level as aps
            SET number_of_allocations = aps.number_of_allocations + 1
            WHERE aps.article = _article_cursor[i]->>'article' 
              AND aps.channel = _article_cursor[i]->>'channel';
        elsif _article_cursor[i]->>'inventory_source' = 'po' then
            UPDATE inventory_smart.po_master as po
            SET number_of_allocations = po.number_of_allocations + 1
            WHERE po.article = _article_cursor[i]->>'article' 
              AND po.channel = _article_cursor[i]->>'channel';
        end if;
   
    END LOOP;
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
