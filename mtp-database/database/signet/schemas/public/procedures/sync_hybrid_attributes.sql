--liquibase formatted sql
--changeset aman.lakkoju:Added new sku flag column  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-28188
--comment: Added new sku flag column 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_hybrid_attributes();
CREATE OR REPLACE PROCEDURE public.sync_hybrid_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_hybrid_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	 _column_cnt integer;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select count(1) into _column_cnt from information_schema."columns" c 
		where table_schema ='global'
			and table_name ='product_attributes_filter'
			and column_name  in ('product_tag','ordering','sku_grade','new_sku_flag');
		if _column_cnt = 4 then
			update 
			  global.product_attributes_filter paf 
			set 
			  product_tag = x.product_tag, 
			  ordering = x.ordering, 
			  sku_grade = x.sku_grade,
			  new_sku_flag = x.new_sku_flag 
			from 
			  (
				SELECT 
				  x.* 
				FROM 
				  public.product_hybrid_attributes x 
				  join global.product_master using(product_code)
			  ) x 
			where 
			  paf.product_code = x.product_code;
			DELETE FROM 
			  "global".product_attributes pa USING "global".product_master pm 
			WHERE 
			  pa.product_code = pm.product_code 
			  and attribute_name in (
				'product_tag', 'ordering', 'sku_grade', 'new_sku_flag'
			  ) 
			  AND pm.is_deleted = false;
			insert into global.product_attributes (
			  product_code, attribute_name, attribute_value
			) 
			select 
			  x.product_code, 
			  x.attribute_name, 
			  case when gsm.generic_column_datatype = 'varchar[]' then array(
				select 
				  jsonb_array_elements_text(x.attribute_value :: jsonb)
			  )::varchar else x.attribute_value end as attribute_value 
			from 
			  (
				select 
				  product_code, 
				  j.key as attribute_name, 
				  j.value as attribute_value 
				from 
				  (
					select 
					  product_code, 
					  to_jsonb(t) as j 
					from 
					  (
						select 
						  product_code, product_tag, ordering, sku_grade, new_sku_flag
						from 
						  public.product_hybrid_attributes
					  ) t
				  ) x, 
				  jsonb_each_text(j) as j 
				where 
				  value is not null 
				  and value != ''
				  and key not in('product_code')
			  ) x 
			  join global.product_generic_schema_mapping gsm on x.attribute_name = gsm.generic_column_name
			  on conflict(product_code, attribute_name) do update 
			  set attribute_value = excluded.attribute_value; 
		end if;
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
