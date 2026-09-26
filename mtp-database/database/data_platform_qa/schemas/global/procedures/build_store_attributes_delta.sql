--liquibase formatted sql
--changeset ashish.gupta@impactanalytics.co:build_store_attributes_delta runOnChange:true stripComments:false splitStatements:false context:delta_SP labels:MTP-38280
--comment: Bugfix to delete attributes in global when they become null
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_store_attributes_delta();
CREATE OR REPLACE PROCEDURE global.build_store_attributes_delta()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
		_attr varchar;
		_sql text;
		_attrs varchar;
		_query text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_store_attributes_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		-- requested - Old products will not come in daily sync @harsha
		
		 DELETE FROM 
              "global".store_attributes pa 
              USING "global".store_master pm 
              join public.store_delta_table pvt   
              using(store_code)
            WHERE 
               pvt.__record_type ='0'    
              and pa.store_code = pm.store_code
		 	  and pm.is_deleted = false;
             
		
		-- Deleting attributes from global table where attribute_value in public comes as null
            delete from 
             "global".store_attributes sa
             using "public".store_attributes_delta_table sadt
             where sadt.store_code = sa.store_code and sadt.attribute_name = sa.attribute_name and sadt.attribute_value is null;
		-- create partitions dynamically
		call global.build_list_partitions('store_attributes');
		-- get expected attributes list
	
	 _query := 'insert into global.store_attributes (
		  store_code, attribute_name, attribute_value
		)  select 
                        pvt.store_code,
                         attribute_name,
                         attribute_value
                        from 
                          public.store_attributes_delta_table pvt 
                          join global.store_master pm using(store_code) 
                        where 
                          pm.is_deleted = false
                          and pvt.__record_type =''1''
						  and exists  
							( select 
					             1
					            from 
					              global.store_generic_schema_mapping pgsm
					            where 
					              required_in_product 
					              and is_attribute
					              and pvt.attribute_name = pgsm.generic_column_name)
                                                  and attribute_value is not null	
              on conflict(store_code, attribute_name) do update 
              set attribute_value = excluded.attribute_value
            ';
		raise notice 'query%',_query;
		execute _query;
		-- recreate constraints and indexes
		--perform global.create_drop_index_list_ingestion('global', 'store_attributes', false);
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

