--liquibase formatted sql
--changeset rahul.mishra@impactanalytics.co:set_all_count_issue_fix_tpc runOnChange:true stripComments:false splitStatements:false context:MTP-100367 labels:MTP-100367
--comment: MTP-102259 – use article_store_grade for grade filter instead of saf; Fix: remove user_adjusted_forecast column reference as confirmed by data team - not required - fix query filter error - query store grade from article_store_grade
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.bulk_update_constraint_validity_weekly(jsonb, jsonb, jsonb, jsonb, int4, _int4, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.bulk_update_constraint_validity_weekly(_pf jsonb, _sf jsonb, _tf jsonb, _nv jsonb, _updated_by integer, _mapping_codes integer[], _cmw jsonb, _return_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$ 
	declare 
		_query_pa text := '';
    	_query_sa text := '';
    	_query_cmw text :='';
    
   		_tq jsonb := (($3 - 'sort') - 'limit');
   		_selected_records text := '';
   		_weekly_update_query text :='';
   		_no_of_fiscal_weeks int4 :=0;
   	
   		_query_table_filters text;
   		_set jsonb;
   		_l0_name text := (inventory_smart.get_l0_name_from_input(_pf)::text[])[1];
   		_l0_name_f json := _pf -> 'l0_name';
   		v_cnt numeric;
   		_temp_table text := gen_random_uuid();
   		_temp_data_table text := gen_random_uuid();
   		_result jsonb;
   		 l0_name_json jsonb;
   		
   		_updated_cmw jsonb;
   		_mapping_code_con text := case when coalesce(array_length(_mapping_codes, 1), 0) = 0 
			then ' ' || 'and l0_name = ' || quote_literal(_l0_name) else ' and  mapping_code = any(''' || concat(_mapping_codes) || ''') and l0_name = ' || quote_literal(_l0_name) end;
		-- New vars for grade handling
		_sf_wo_grade jsonb;
		_grade_values text;
	
   	begin
	   	
	   	 raise notice '_l0_name_f %', _l0_name_f;
	    l0_name_json :=   jsonb_build_object('l0_name', _l0_name_f);
	   	_updated_cmw := _cmw || l0_name_json;
	    raise notice '_updated_cmw %', _updated_cmw;
	  
	   	_query_cmw := global.form_main_table_filters_v2('constraint_master_weekly', _updated_cmw );
	    raise notice '_query_cmw %', _query_cmw;
	  
		raise notice ' filter condition %', _mapping_code_con;
	
		_query_pa := inventory_smart.form_main_table_filters('ph_master', _pf );
		-- Remove store_grade from SAF filter so that grade can be applied via ASG
		_sf_wo_grade := _sf - 'store_grade';
	    _query_sa := global.form_main_table_filters_v2( 'store_attributes_filter',  _sf_wo_grade  );
	    _query_table_filters := global.form_table_query(_tq);
	    
	    -- Extract list of grade values (if provided) to filter on ASG
	    IF (_sf ? 'store_grade') THEN
	        SELECT concat(array_agg(value))
	        INTO _grade_values
	        FROM json_array_elements_text(((json_extract_path((_sf->'store_grade')::json, '0')::json)->>'values')::json);
	        IF coalesce(_grade_values, '') <> '' THEN
	            IF coalesce(_query_table_filters, '') = '' THEN
	                _query_table_filters := ' WHERE (asg.grade = any(''' || _grade_values || '''::varchar[]))';
	            ELSE
	                _query_table_filters := _query_table_filters || ' AND (asg.grade = any(''' || _grade_values || '''::varchar[]))';
	            END IF;
	        END IF;
	    END IF;
	    _selected_records :='';
		raise notice ' _return_type %', _return_type; 

		if _query_table_filters is not null and _query_table_filters <> '' then
    		if position('saf.store_code' in _query_table_filters) = 0 and position('store_code' in _query_table_filters) > 0 then
       			_query_table_filters := replace(_query_table_filters, 'store_code', 'saf.store_code');
    		end if;
		end if;
	
		_selected_records := 'with cmw as materialized(' ||
				' select cmw.fiscal_year_week, cmw.l0_name as cmw_l0_name,  cmw.l1_name as cmw_l1_name,  cmw.channel, cmw.product_code, cmw.store_code, cmw.wos, ' ||
			'transit_time,safety_stock, min_stock,max_stock,aps, ros, flag, ' ||
			'cmw.created_at,  cmw.updated_at,  cmw.updated_by,  cmw.created_by,  mapping_code as cmw_mapping_code ' ||
			' from inventory_smart.constraint_master_weekly cmw ' || _query_cmw ||
				' ), ' ||
			' paf as   materialized(' ||
				'select *, article as product_code from inventory_smart.ph_master ' ||
			    _query_pa ||
			'),' ||
			' saf as materialized(' ||
				' select store_code from global.store_attributes_filter saf   '||
				 _query_sa ||
				') '||
			', cmw_final as materialized( ' ||
			'select   cmw.fiscal_year_week as  cmw_fiscal_year_week,   cmw_l0_name,    cmw_l1_name,  cmw.channel, cmw.product_code, cmw.store_code, ' ||
			'   cmw_mapping_code 	 ' ||    
 			'			  from cmw  ' ||
			'			  join  paf using (product_code) ' ||
			'			  join saf  using (store_code) ' ||
			'			  left join (select article as product_code, store_code, grade as store_grade, ph_code from inventory_smart.article_store_grade) asg on (asg.store_code = cmw.store_code AND asg.product_code = paf.product_code) '  || _query_table_filters ||
			'			  order by fiscal_year_week, product_code, cmw_mapping_code ' ||
			'	) ' ;
			

 		raise notice ' _selected_records %', _selected_records;
		
		IF _return_type = 'record_count' then
		
				
			--raise notice ' _selected_records %', _selected_records;
		    _selected_records := _selected_records || 'select jsonb_build_object(''record_count'', count(distinct cmw_mapping_code),' ||
				' ''sku_count'', count(distinct product_code))as count from cmw_final ' ; 
			
			raise notice 'Count query %', _selected_records;
		
			execute _selected_records  ||' ' into _result;
			return _result;
		ELSE
			for _set in select value from jsonb_array_elements(_nv) loop 
				raise notice '_set: %', _set;
			
		    	_weekly_update_query :=   _selected_records || ' update inventory_smart.constraint_master_weekly AS w SET ' ||
					  '   updated_by = '  		|| quote_literal(_updated_by) 		  || '::int4 '  ||
				      ',   updated_at = now() ';
				     
				     
				--Update WOS passed and value is not null     
                if jsonb_exists(_set, 'wos') then 
                    _weekly_update_query :=   _weekly_update_query ||   ', wos = '  		    || quote_literal(_set->>'wos') 		  || '::float4 ' ;
                end if;
               
                if jsonb_exists(_set, 'min_stock') then 
                    _weekly_update_query :=   _weekly_update_query || 	  ',   min_stock = '  		|| quote_literal(_set->>'min_stock')  || '::float4 '  ;
                end if;
               
                if jsonb_exists(_set, 'max_stock') then 
                    _weekly_update_query :=   _weekly_update_query ||    ',   max_stock = '  		|| quote_literal(_set->>'max_stock')  || '::float4 '  ;
                end if;
                
               _weekly_update_query :=   _weekly_update_query ||    '  FROM  cmw_final as f' ||  _query_cmw ||
				 	  ' AND w.mapping_code = f.cmw_mapping_code AND w.l0_name = f.cmw_l0_name ' ;
				
				 	 
				if jsonb_exists(_set, 'wos') then 
                    _weekly_update_query :=   _weekly_update_query ||   ' AND wos IS NOT NULL ' ;
                end if;	   
               
                if jsonb_exists(_set, 'min_stock') then 
                    _weekly_update_query :=   _weekly_update_query ||   ' AND min_stock IS NOT NULL '  ;
                end if;	   
               
                if jsonb_exists(_set, 'max_stock') then 
                    _weekly_update_query :=   _weekly_update_query ||   ' AND max_stock IS NOT NULL '  ;
                end if;	   

				if jsonb_exists(_set, 'fiscal_year_week') then
                _weekly_update_query := _weekly_update_query || ' AND w.fiscal_year_week = ' || quote_literal(_set->>'fiscal_year_week') || '::int4';
            	end if;


		    raise notice ' _weekly_update_query %', _weekly_update_query;
			execute _weekly_update_query;
				
			end loop;
	    end if;
	execute 'select json_build_object(''record_count'', 0, ''sku_count'', 0)' into _result;
	return _result;
	end
$function$
;
