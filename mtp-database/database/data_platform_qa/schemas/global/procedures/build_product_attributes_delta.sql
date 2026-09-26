--liquibase formatted sql
--changeset mohammed.abdulla@impactanalytics.co:build_product_attributes_delta runOnChange:true stripComments:false splitStatements:false context:delta_SP labels:MTP-38280
--comment: adding coalesce to handle null
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_product_attributes_delta();
CREATE OR REPLACE PROCEDURE global.build_product_attributes_delta()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
            _attr varchar;
            _sql text;
            _attrs varchar;
            _query text;
            _array_col_type text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_attributes_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			set work_mem = '10GB';

            -- Get required cols list
            select 
              coalesce(string_agg(generic_column_name, ''','''),'') into _array_col_type
            from 
              (
                select 
                  generic_column_name     
                from 
                  global.product_generic_schema_mapping 
                where 
                  generic_column_datatype in ('varchar[]', 'text[]')) as a;
            -- requested - Old products will not come in daily sync @harsha
            DELETE FROM 
              "global".product_attributes pa 
              USING "global".product_master pm 
              join public.product_delta_table pvt   using(product_code)
            WHERE 
               pvt.__record_type ='0'    
              and pa.product_code = pm.product_code
              and attribute_name not in ('product_tag', 'ordering', 'sku_grade', 'clearance_article') -- article_status_tag is not in list because need a full reset of this not like other attributes
              AND pm.is_deleted = false;

            -- Deleting attributes from global table where attribute_value in public comes as null
            delete from 
             "global".product_attributes pa
             using "public".product_attributes_delta_table padt
             where padt.product_code = pa.product_code and padt.attribute_name = pa.attribute_name and padt.attribute_value is null;
             
            -- create partitions dynamically
            call global.build_list_partitions('product_attributes');
            -- get expected attributes list
          
            -- take a backup of constraints and indexes and remove them
           -- perform global.create_drop_index_list_ingestion('global', 'product_attributes', true);
            -- insert attributes of non deleted products

        _query := 'insert into global.product_attributes (
              product_code, attribute_name, attribute_value
            ) select 
                    pvt.product_code,
                    attribute_name,
                  case when attribute_name in (''' || _array_col_type || ''') 
                  then 
                  case when attribute_value =''[]'' then ''{}'' 
                  else replace (replace (replace (attribute_value,''["\"'',''{''),''\""]'',''}''),''\"","\"'','','') end 
                  else attribute_value
                  end as attribute_value                       
                  from 
                          public.product_attributes_delta_table pvt 
                          join global.product_master pm using(product_code) 
                        where 
                          pm.is_deleted = false
                          and pvt.__record_type =''1''
						  and exists  
							( select 
					             1
					            from 
					              global.product_generic_schema_mapping pgsm
					            where 
					              required_in_product 
					              and is_attribute
					              and pvt.attribute_name = pgsm.generic_column_name)
                                                  and attribute_value is not null	
              on conflict(product_code, attribute_name) do update 
              set attribute_value = excluded.attribute_value
            ';
       	 raise notice 'query%',_query;
            execute _query;
            -- recreate constraints and indexes
         --   perform global.create_drop_index_list_ingestion('global', 'product_attributes', false);
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