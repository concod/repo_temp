-- liquibase formatted sql
-- changeset shameel.zeeeeshan@impactanalytics.co:sync_paf_sub_styles runOnChange:true stripComments:false splitStatements:false context:added sp labels:added odl styles as sub_styles column
-- comment: added added odl styles as sub_styles_sp

DROP PROCEDURE if exists public.sync_paf_sub_styles();

CREATE OR REPLACE PROCEDURE public.sync_paf_sub_styles()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_paf_sub_styles';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		
		update global.product_attributes_filter paf
		set sub_styles = t2.sub_styles
		from 
		(SELECT paf.article,ARRAY_AGG(distinct psm.old_style order by psm.old_style) AS sub_styles 
        FROM global.product_attributes_filter paf 
        LEFT JOIN 
        (select distinct old_article,article,split_part(old_article, '-', 1) as old_style 
        FROM inventory_smart.product_supersession_mapping psm) psm 
        ON paf.article = psm.article
        GROUP BY paf.article) t2
		where paf.article = t2.article
 		;
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