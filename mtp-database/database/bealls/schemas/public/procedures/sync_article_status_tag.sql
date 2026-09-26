--liquibase formatted sql
--changeset kshitij.kesarwani@impactanalytics.co:sync_article_status_tag runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:bealls_sync_article_status_tag
--comment: initial changeset for sync_article_status_tag
DROP PROCEDURE IF EXISTS public.sync_article_status_tag();
CREATE
OR
replace PROCEDURE public.sync_article_status_tag() 
language plpgsql 
SECURITY definer AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_status_tag';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	  DELETE FROM   inventory_smart.article_status_tag
	  WHERE  true;
	  INSERT INTO inventory_smart.article_status_tag
				  (
							  product_code ,
							  channel ,
							  article_status_tag ,
							  "size" ,
							  new_size ,
							  product_description ,
							  size_order ,
							  "order",
							  size_mapping_classification ,
							  article
				  )
	  SELECT DISTINCT product_code ,
					  channel ,
					  article_status_tag ,
					  "size" ,
					  new_size ,
					  x.product_description ,
					  size_order ,
					  "order",
					  size_mapping_classification ,
					  x.article
	  FROM            public.article_status_tag x
	  JOIN            global.product_master pm
	  using          (product_code);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;
