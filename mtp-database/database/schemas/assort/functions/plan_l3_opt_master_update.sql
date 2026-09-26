--liquibase formatted sql
--changeset liquibase:plan_l3_opt_master_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_master_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_l3_opt_master_update(jsonb, text);
CREATE OR REPLACE FUNCTION assort.plan_l3_opt_master_update(jsonb, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 
 /*
 Function/Procedure name: assort.plan_l3_opt_master_update
 Created by: Hemant Kumar Singh
 Created at: 15-Mar-2022
 Updated at: 01-jun-2022
 No of input parameter: 2
 Parameter Description : $1 = json, text
 Purpose: This function been created to update two table plan_l3_opt_master and plan_cluster_opt_master
 Calling Statement:
 Hemant Kumar SIngh: getting updating two table plan_l3_opt_master_update
 */
 
 declare 
 _query_combine text := '';
 _query_combine2 text := '';
 _query_combine3 text := '';
 _query_combine4 text := '';
 _filterkeys text[] ;
 _filtervals text[] ;
 _key text;
 _value text;
 _key1 text;
 _value1 text;
 _key2 text;
 _value2 text;
 _plan_code integer;
 _plan_bud_opt_id integer;
 _input_json json ;
 _isactive text;
 _attribute_value text;
 _where text;
 _l3_penetration_ty float;
 _l3_penetration_ly float;
_l2_drop_budget_ty float;
_penetration_ty float;
_budget_ty float;
_aur_ty float;
_budget_ly float;
_budget_diff float;
_receipts_quantity_ty float;
_air_ty float;
_rcpt_retail_ty float;
_total_receipts_cost_ly float;
_total_receipts_cost_ty float;
_retail_budget_diff float;
_penetration_diff float;
_retail_penetration_diff float;
_db_budget_ty float;
_optimization_level text:='';
_new_attribute_value text;
_update_attribute_value text;
_DB_query_combine text := '';
_DB_attribute_value text[] ;
_DB_attribute_text text ;
_DB_plan_budget_opt_id text[];
_DB_plan_budget_opt_id_text text;
_cntr integer;
--i integer;
 begin       
	 
	 	raise notice '%','Start';
	 
	 	_optimization_level= ''||$2 || '';
         for _input_json in select json_array_elements(value::json) input_json from 
             (select value from jsonb_each_text($1::jsonb)) x
             
         loop
         		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
                 loop 
                 if _key ='plan_code' then 
                  _plan_code = _value::integer;
                 raise notice '%',_plan_code;
                 elsif _key ='plan_bud_opt_id' then 
                     _plan_bud_opt_id = _value::integer;
                    raise notice '%',_plan_bud_opt_id;
                 elsif _key = 'is_active' then 
                     _isactive = _value;
                 elsif _key ='filters' then 
                     for _key1, _value1 in SELECT * FROM json_each_text(_value::json)  
                   loop 
                         _filterkeys := array_append(_filterkeys, _key1);
                         _filtervals := array_append(_filtervals, '''' || _value1 || '''');
                     if _where IS NULL then
                          _where:= ('where levels->>'''|| _key1 || ''' ' || ' in ('''|| _value1||''')')::text;
                     else
                         _where:= concat(_where, ' and  levels->>'''|| _key1 || ''' ' || ' in ('''|| _value1||''')');
                     end if;
                   end loop; -- end of where 
                   raise notice '%',_where;
                elsif _key ='attribute_value' then 
                     _attribute_value:= _value::text;
                     -- raise notice '_attribute_value %',_value;
                    -- execute 'SELECT count(*) cnt FROM assort.plan_l3_opt_master '||_where ||' AND plan_code='||_plan_code||' and levels->>''optimization_level'' = ''l3_optimization''  ' 
                    --		into _cntr;
                     _DB_query_combine:= 'SELECT array_agg(attribute_value),array_agg(plan_bud_opt_id) FROM assort.plan_l3_opt_master '||_where ||' AND plan_code='||_plan_code||' and levels->>''optimization_level'' = ''l3_optimization''  ';
	                   --   raise notice '_DB_query_combine%',_DB_query_combine;
                     
                     execute _DB_query_combine into _DB_attribute_value,_DB_plan_budget_opt_id ;
                    
                    
	                 
	                   
	              for _DB_attribute_text,_DB_plan_budget_opt_id_text in  select unnest (_DB_attribute_value) , unnest (_DB_plan_budget_opt_id)
	                    loop -- loop start _DB_plan_budget_opt_id_text
		                     raise notice '_DB_attribute_text%',_DB_attribute_text||'-'||_DB_plan_budget_opt_id_text;
	                     	
	                    
	                     _DB_attribute_text:= _DB_attribute_text::json;
	                      
	                   		if (_DB_attribute_text::json->>'penetration_ty') IS NOT null then
                                _penetration_ty:= (_DB_attribute_text::json->>'penetration_ty')::float;
                            	raise notice '_penetration_ty %',_penetration_ty;
                             end if;
                           	if (_DB_attribute_text::json->>'budget_ly') IS NOT null then 
                           		_budget_ly:= (_DB_attribute_text::json->>'budget_ly')::float;
                           	 end if;
	                       	if (_DB_attribute_text::json->>'aur_ty') IS NOT null then 
                           		_aur_ty:= (_DB_attribute_text::json->>'aur_ty')::float;
                           	 end if;
                           	if (_DB_attribute_text::json->>'air_ty') IS NOT null then 
                           		_air_ty:= (_DB_attribute_text::json->>'air_ty')::float;
                           	 end if;
                           	if (_DB_attribute_text::json->>'total_receipts_cost_ly') IS NOT null then 
                           		_total_receipts_cost_ly:= (_DB_attribute_text::json->>'total_receipts_cost_ly')::float;
                            end if;  
                        
                       
                     for _key2,_value2 in SELECT * FROM json_each_text(_value::json)  loop 
	                     
                        if _key2 ='penetration_ty' then 
                           _l3_penetration_ty = _value2::float;
                         --  raise notice 'penetration_ty %',_l3_penetration_ty;
                        elsif _key2 = 'penetration_ly' then 
                          _l3_penetration_ly = _value2::float;
                         -- raise notice 'penetration_ly %',_l3_penetration_ly;
                      	end if;
                      	if _optimization_level ='l2_optimization' then 
                      		
	                      -- raise notice '_DB_attribute_value: %',_DB_attribute_value;
	                       
	                      
                           if _key2 ='l2_drop_budget_ty' then 
                           		_l2_drop_budget_ty = _value2::float;
	                        elsif _key2 = 'budget_ty' then 
	                          	_budget_ty = _value2::float;
	                          raise notice '_budget_ty %',_budget_ty;
	                        elsif _key2 = 'rcpt_retail_ty' then 
	                          	_rcpt_retail_ty = _value2::float;
	                      end if;
	                     
	                     
	                      if _budget_ty is not null and _penetration_ty is not null then
                                _db_budget_ty:=((_budget_ty)*(_penetration_ty));
                               --raise notice '_db_budget_ty %',_db_budget_ty;
                           end if;
                          raise notice 'final 2 _db_budget_ty %',_db_budget_ty;
                         raise notice 'final 2 _aur_ty %',_aur_ty;
                          --raise notice 'calulate receipts_quantity_ty';
	                      if _db_budget_ty is not null and _aur_ty is not null then
                                _receipts_quantity_ty:=((_db_budget_ty)/((nullif(_aur_ty, 0))));
                           end if;
                          --raise notice 'calulate budget_diff',_receipts_quantity_ty;
	                      if _db_budget_ty is not null and _budget_ly is not null then
                                _budget_diff:=((_db_budget_ty) - (_budget_ly));
                           end if;
                          --raise notice 'calulate penetration_diff';
	                      if _db_budget_ty is not null and _budget_ly is not null then
                                _penetration_diff:=((((_db_budget_ty) - (_budget_ly))/ (nullif(_budget_ly, 0))));
                           end if;
                          --raise notice 'calulate total_receipts_cost_ty';
	                      if _receipts_quantity_ty is not null and _air_ty is not null then
                                _total_receipts_cost_ty:=((_receipts_quantity_ty)*(_air_ty));
                           end if;
                          --raise notice 'calulate retail_budget_diff';
	                      if _total_receipts_cost_ty is not null and _total_receipts_cost_ly is not null then
                                _retail_budget_diff:=((_total_receipts_cost_ty) -(_total_receipts_cost_ly));
                           end if;
                          --raise notice 'calulate retail_penetration_diff';
	                      if _retail_budget_diff is not null and _total_receipts_cost_ly is not null then
                                _retail_penetration_diff:=((_retail_budget_diff)/ (nullif(_total_receipts_cost_ly, 0)));
                           end if;
                          
                          
                          _new_attribute_value:= '{"budget_ty":'||coalesce(_db_budget_ty,0.0)||',"l2_drop_budget_ty":'||coalesce(_budget_ty,0.0)||',"receipts_quantity_ty":'||coalesce(_receipts_quantity_ty,0.0)||',"budget_diff":'||coalesce(_budget_diff,0.0)||',
													"penetration_diff":'||coalesce(_penetration_diff,0.0)||',"total_receipts_cost_ty":'||coalesce(_total_receipts_cost_ty,0.0)||',"retail_budget_diff":'||coalesce(_retail_budget_diff,0.0)||',
													"retail_penetration_diff":'||coalesce(_retail_penetration_diff,0.0)||'}';
						--raise notice 'final 2 _budget_ty %',_new_attribute_value;
			 				_query_combine4:= 'UPDATE assort.plan_l3_opt_master
			                                 SET attribute_value = attribute_value::jsonb || '''|| _new_attribute_value||'''
			                                   WHERE plan_bud_opt_id ='||_DB_plan_budget_opt_id_text||' AND plan_code='||_plan_code; 
					 		
			                execute _query_combine4;
					 		--raise notice 'final _query_combine4 %',_query_combine4;			
					 		   --end if;
                      end if;
         
                   end loop;
                end loop; ---- end loop _DB_plan_budget_opt_id_text
              end if;
                
         end loop;
               _query_combine:= 'UPDATE assort.plan_l3_opt_master
                                 SET is_active= '''||_isactive||''',
                                 attribute_value = attribute_value::jsonb || '''|| _attribute_value||'''
                                 WHERE plan_bud_opt_id ='||_plan_bud_opt_id||' AND plan_code='||_plan_code;
 								
 		                       
        		 _query_combine2:= 'UPDATE assort.plan_cluster_opt_master
                                SET  attribute_value =  attribute_value::jsonb||jsonb_build_object(''l3_penetration_ty'','||_l3_penetration_ty
 								|| ',''l3_penetration_ly'','||_l3_penetration_ly||') '
 								|| _where ||' AND plan_code='||_plan_code;
 		 
 				execute _query_combine;
 			 	execute _query_combine2;
 							
 			if _isactive='NO' then
 				_query_combine3:= 'DELETE FROM assort.plan_cluster_opt_master
 								'||_where ||' AND plan_code='||_plan_code;  
 				 execute _query_combine3;			
 		   end if;

 		 _where:= NULL;
 		 --raise notice ' final where %',_where;
          --raise notice '%',_query_combine;
          --raise notice '%',_query_combine2;
          --raise notice '%',_query_combine3;
         --raise notice '%',_query_combine4;
        
 		
     end loop;
 end
 ;
 $function$
;
