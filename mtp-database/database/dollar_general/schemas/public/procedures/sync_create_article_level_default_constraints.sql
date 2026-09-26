--liquibase formatted sql
--changeset swapnil.bhange-2:sync_create_article_level_default_constraints_v2 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:0002
--comment: creating SP sync_create_article_level_default_constraints_v2
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_create_article_level_default_constraints();
DROP PROCEDURE IF EXISTS public.sync_create_article_level_default_constraints(IN _is_historic boolean);
CREATE OR REPLACE procedure public.sync_create_article_level_default_constraints()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_create_article_level_default_constraints';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		INSERT INTO public.article_level_default_constraints(
					article,
					psa_name,
					min,
					max,
					wos,
					st)
		select rcmr.rcl_dimension->>'article' as article, substring(rcm.psa_code from '[^_]+$') as psa_name,
       		   CAST( CEILING( dpc.units_in_pack * dc.min ) AS INT4 ) AS min,
       		   CAST( CEILING( dpc.units_in_pack * dc.max ) AS INT4 ) AS max,
       		   dc.wos,
       		   dc.st
		 from inventory_smart.rcl_constraint_master rcm
		 join inventory_smart.rcl_constraint_master_rule rcmr
		 join (
				SELECT DISTINCT
			    pack_type_id AS product_code,
			    CASE WHEN article = pack_type_id THEN units_in_pack ELSE 1 END AS units_in_pack
			  	FROM inventory_smart.dc_pack_configuration
			  	GROUP BY 1,2) dpc on dpc.product_code = rcmr.rcl_dimension->>'article'
		USING(rule_code)
		join inventory_smart.default_constraints dc on substring(rcm.psa_code from '[^_]+$') = dc.psa_name
		group by 1,2,3,4,5,6 ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end ;
$procedure$
;



