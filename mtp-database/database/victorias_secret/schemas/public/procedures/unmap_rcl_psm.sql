--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:unmap_rcl_psm_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: VS-390
--comment: added delete statement to clean the rcl_product_mapping_product_store_rule table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.unmap_rcl_psm();
CREATE OR REPLACE PROCEDURE public.unmap_rcl_psm()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.unmap_rcl_psm';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
		_rcl_code int;
		_rcl_dt text;
		_rcl_jsonb text;
		_sql text;
    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	    for _rcl_code, _rcl_dt, _rcl_jsonb in select x.rcl_code, string_agg(x.level || ' ' || y.generic_column_datatype, ', '), string_agg(quote_literal(x.level) || ', ' || x.level, ', ') from (select rcl_code, unnest(level) as level from global.rcl_master) x join global.product_generic_schema_mapping y on x.level = y.generic_column_name group by 1 loop
		   	execute '
				create temp table rcl_psm_master_rule_' || _rcl_code || ' on commit drop as
				select 
					rcl_code,
					psa_code,
		            psa_name,
		            validity,
					jsonb_build_object(' || _rcl_jsonb || ') as rcl_dimension from (
						select concat(''{"'',
				            replace(replace(rcl_dimension,
				            ''::'',
				            ''":"''),
				            '';;'',
				            ''","''),
				            ''"}'')::jsonb as rcl_dimension,
							rcl_code,
							psa_code,
				            psa_name,
							range_agg(daterange(start_date::date,
				            end_date::date)) as validity
				   		from public.unmapped_psm
				        where rcl_code = ' || _rcl_code || '
						group by rcl_dimension, rcl_code, psa_code, psa_name
					) x, jsonb_to_record(rcl_dimension) as (' || _rcl_dt || ');';
           execute '
				DELETE FROM global.rcl_product_mapping_product_store x  
				USING (
					select
				        rcl_code,
				        rule_code,
				        psa_code,
				        validity
				    from rcl_psm_master_rule_' || _rcl_code || '
				         x
				    join global.rcl_product_mapping_product_store_rule y
				    	using(rcl_code, rcl_dimension)
				    group by 1,2,3,4) y 
				WHERE (x.rcl_code, x.rule_code, x.psa_code, x.validity) = (y.rcl_code, y.rule_code, y.psa_code, y.validity);';
	    end loop;
	   execute '
		DELETE FROM global.rcl_product_mapping_product_store_rule rpmpsr
		WHERE NOT EXISTS (
    		SELECT 1
    		FROM global.rcl_product_mapping_product_store rpmps
    		WHERE rpmps.rule_code = rpmpsr.rule_code
		);';
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
