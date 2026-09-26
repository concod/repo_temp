--liquibase formatted sql
--changeset liquibase:build_filter_cache runOnChange:true stripComments:false splitStatements:false ignore:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_filter_cache
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_filter_cache();
CREATE OR REPLACE PROCEDURE global.build_filter_cache()
 LANGUAGE plpgsql
AS $procedure$
/*
 * Function/Procedure name: global.build_filter_cache
 * Created by: Ashish Gupta
 * Created at: 19-Nov-2022
 * No of input parameter: 0
 * Parameter Description : 
 * Purpose: This SP pre calculate all possible filters initially.
 * Calling Statement:   
 *  call global.build_filter_cache();
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *  
 */
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_filter_cache';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_p2 jsonb;
	_p3 jsonb;
	_p4 jsonb;
	_p5 jsonb;
	_h varchar;
	_c int := 0;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	for _p2, _p3, _p4, _p5, _h in select 
	  '{}'::jsonb as p2, 
	  (
	    case when l0_name.attribute_value is null then '{}' :: jsonb else jsonb_build_object(
	      'l0_name', 
	      jsonb_build_array(
	        jsonb_build_object(
	          'type', 'list', 'operator', 'in', 'values', 
	          array[l0_name.attribute_value]
	        )
	      )
	    ) end
	  ) || (
	    case when hie.dimention = 'product' then jsonb_build_object(
	      hie.generic_column_name, array[] :: varchar[]
	    ) else '{}'::jsonb end
	  ) as p3, 
	  '{}'::jsonb as p4, 
	  (
	    case when channel.attribute_value is null then '{}' :: jsonb else jsonb_build_object(
	      'channel', 
	      jsonb_build_array(
	        jsonb_build_object(
	          'type', 'list', 'operator', 'in', 'values', 
	          array[channel.attribute_value]
	        )
	      )
	    ) end
	  ) || (
	    case when hie.dimention = 'store' then jsonb_build_object(
	      hie.generic_column_name, array[] :: varchar[]
	    ) else '{}'::jsonb end
	  ) as p5, 
	  hie.generic_column_name as h 
	from 
	  (
	    select 
	      'channel' as attribute_name, 
	      attribute_value 
	    from 
	      global.store_attributes 
	    where 
	      attribute_name = 'channel' 
	      and attribute_value in('ZALES', 'ZALES OUTLET') 
	    group by 
	      2 
	    union all 
	    select 
	      'channel', 
	      null
	  ) channel cross 
	  join (
	    select 
	      'l0_name' as attribute_name, 
	      attribute_value 
	    from 
	      global.product_attributes 
	    where 
	      attribute_name = 'l0_name' 
	    group by 
	      2 
	    union all 
	    select 
	      'l0_name', 
	      null
	  ) l0_name cross 
	  join (
	    select 
	      dimension as dimention, 
	      generic_column_name 
	    from 
	      (
	        select 
	          dimension, 
	          column_name as generic_column_name 
	        from 
	          global.filter_configurations fc 
	          join global.filter_configurations_mapping fcm using(fc_code) 
	        where 
	          is_deleted = false 
	          and dimension in('product') 
	        group by 
	          1, 
	          2
	      ) x 
	      join global.product_generic_schema_mapping pgsm using(generic_column_name) 
	    where 
	      required_in_product 
	    union all 
	    select 
	      dimension, 
	      generic_column_name 
	    from 
	      (
	        select 
	          dimension, 
	          column_name as generic_column_name 
	        from 
	          global.filter_configurations fc 
	          join global.filter_configurations_mapping fcm using(fc_code) 
	        where 
	          is_deleted = false 
	          and dimension in('store') 
	        group by 
	          1, 
	          2
	      ) x 
	      join global.store_generic_schema_mapping pgsm using(generic_column_name) 
	    where 
	      required_in_product
	  ) as hie 
	  -- where l0_name.attribute_value is null
	  -- and channel.attribute_value is null
	group by 
	  1, 
	  2, 
	  3, 
	  4, 
	  5
	order by 
	  1, 
	  2, 
	  3, 
	  4, 
	  5 asc loop
		PERFORM global.urm_hierarchies(concat('urm_hierarchies_cursor_', _c)::refcursor,
		_p2, 
		_p3,
		_p4,
		_p5,
		_h);
		_c := _c+1;
		commit;
	end loop;
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
