--liquibase formatted sql
--changeset Shaik.Azmathulla@imapctanalytics.co:sync_delete_intermediate_supersession_upload runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:sync_delete_intermediate_supersession_upload
--comment: Created new sp for delete intermediate supersession upload
--rollback: SELECT 1

DROP procedure IF EXISTS public.sync_delete_intermediate_supersession_upload();
CREATE OR REPLACE PROCEDURE public.sync_delete_intermediate_supersession_upload()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_delete_intermediate_supersession_upload';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	DROP TABLE IF EXISTS style_mapping_table_temp;
	
	CREATE TEMP TABLE style_mapping_table_temp AS 
	SELECT concat(new_article,old_article) AS old_new_article,
		   concat(old_article,COALESCE(split_part( old_size,'-',1),''),new_article) AS old_new_article_size
	FROM inventory_smart.style_mapping_table smt ;
	
	DELETE  
	FROM inventory_smart.intermediate_supersession_upload isu 
	WHERE EXISTS (SELECT 1 
				  FROM style_mapping_table_temp smtt 
				  WHERE concat(isu.new_article,isu.old_article) = smtt.old_new_article 
				  );

	DELETE 
	FROM inventory_smart.intermediate_supersession_upload isu  
	WHERE EXISTS (SELECT 1 
				  FROM style_mapping_table_temp smtt 
				  WHERE concat(isu.old_article,COALESCE(isu.old_size,''),isu.new_article) = smtt.old_new_article_size 
				  )
	AND is_deleted =1;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;