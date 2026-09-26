--liquibase formatted sql
--changeset hemantkumar.bajaj:sync_sync_last_allo_date_paf_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:
--comment: initial changeset
--rollback: SELECT 1

DROP procedure IF EXISTS public.sync_last_allo_date_paf();
CREATE OR REPLACE PROCEDURE public.sync_last_allo_date_paf()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_last_allo_date_paf';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin        
        WITH list AS (
            SELECT DISTINCT
                ladt.article,
                ladt.last_allocation_date
            FROM inventory_smart.last_allocation_date_table AS ladt
            LEFT JOIN inventory_smart.article_status_tag AS ast
                ON ladt.article = ast.article
                WHERE ast.article_status_tag IS NOT NULL
                AND ast.article_status_tag NOT IN ('', 'Old')
        )
        UPDATE global.product_attributes_filter AS t1
            SET last_allocated_date = ladt.last_allocation_date
            FROM list AS ladt
                WHERE ladt.article = t1.article;

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