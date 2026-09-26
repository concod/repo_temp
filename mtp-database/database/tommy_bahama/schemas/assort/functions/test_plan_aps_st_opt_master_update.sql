--liquibase formatted sql
--changeset liquibase:test_plan_aps_st_opt_master_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for test_plan_aps_st_opt_master_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.test_plan_aps_st_opt_master_update(jsonb);
CREATE OR REPLACE FUNCTION assort.test_plan_aps_st_opt_master_update(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_DB_query_combine text := '';
_PL_query_combine text := '';
_filterkeys text[] ;
_filtervals text[] ;
_outerkey text;
_outervalue text;
_key text;
_value text;
_Pkey text;
_Pvalue text;
_Dkey text;
_Dvalue text;
_key1 text;
_value1 text;
_number_of_weeks float;
_plan_code integer;
_plan_clu_aps_id integer;
_input_json json ;
_DB_attribute_value json ;
_attribute_value json;
DB_attribute_string text;
_number_of_weeks_mpl float;
_st_clust_ty_mpl float;
_st_clust_ty float;
_aps_clust_ty float;
_avg_wk_cnt_ty float;
_CC_Threshold float;
_moq float;
_receipt_index float;
_DB_st_clust_ty float;
_DB_aps_clust_ty float;
_DB_avg_wk_cnt_ty float;
_DB_CC_Threshold float;
_DB_moq float;
_DB_receipt_index float;
_avg_wk_ty_changed boolean;
_st_clust_ty_changed boolean;

begin	

for _outerkey, _outervalue in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
		if _outerkey ='number_of_weeks' then 
		   _number_of_weeks:= _outervalue::float;
		    raise notice '%',_number_of_weeks;
		end if;
  end loop;
for _outerkey, _outervalue in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
		if _outerkey ='cluster_aps_st_data' then 
				for _input_json in select * from jsonb_array_elements(_outervalue::jsonb) 
					loop	
					raise notice '%',_input_json;
					
								for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
											loop
												if _key ='plan_code' then 
													_plan_code = _value::integer;
													raise notice '%',_plan_code;
												elsif _key ='plan_clu_aps_id' then 
												   _plan_clu_aps_id = _value::integer;
												   raise notice '%',_plan_clu_aps_id;
												elsif _key ='attribute_value' then 
													_attribute_value:= _value::json;
													 raise notice '%',_attribute_value;
												end if;
											end loop;
								
								for _Pkey, _Pvalue in SELECT * FROM jsonb_each_text(_attribute_value::jsonb) --WHERE value IS NOT NULL 
										loop
											if _Pkey ='st_clust_ty' then 
											   _st_clust_ty := _Pvalue::float;
											   raise notice '%',_st_clust_ty;
											elsif _Pkey ='aps_clust_ty' then 
											   _aps_clust_ty := _Pvalue::float;
											   raise notice '%',_aps_clust_ty;
											elsif _Pkey ='avg_wk_cnt_ty' then 
											   _avg_wk_cnt_ty := _Pvalue::float;
											   raise notice '%',_avg_wk_cnt_ty;
											elsif _Pkey ='CC_Threshold' then 
											  _CC_Threshold := _Pvalue::float;
											  raise notice '%',_CC_Threshold;
											elsif _Pkey ='moq' then 
											   _moq := _Pvalue::float;
											  raise notice '%',_moq;
											elsif _Pkey ='receipt_index' then 
											  _receipt_index := _Pvalue::float;
											  raise notice '%',_receipt_index;
											elsif _Pkey ='avg_wk_ty_changed' then 
											  _avg_wk_ty_changed := _Pvalue::boolean;
											  raise notice '%',_avg_wk_ty_changed;
											elsif _Pkey ='st_clust_ty_changed' then 
											  _st_clust_ty_changed := _Pvalue::boolean;
											  raise notice '%',_st_clust_ty_changed;
											end if;
										end loop;
									
					     _DB_query_combine:= 'SELECT attribute_value FROM assort.plan_cluster_aps WHERE plan_clu_aps_id ='||_plan_clu_aps_id||' AND plan_code='||_plan_code;	 
			    	     raise notice '%',_DB_query_combine;
					     execute _DB_query_combine into _DB_attribute_value;
					     raise notice '_DB_attribute_value: %',_DB_attribute_value;
								
									for _Dkey, _Dvalue in SELECT * FROM jsonb_each_text(_DB_attribute_value::jsonb) --WHERE value IS NOT NULL 
										loop
											if _Dkey ='st_clust_ty' then 
											   _DB_st_clust_ty := _Dvalue::float;
											   raise notice '_Dvalue= %',_Dvalue;
											elsif _Dkey ='aps_clust_ty' then 
											   _DB_aps_clust_ty := _Dvalue::float;
											   raise notice '%',_DB_aps_clust_ty;
											elsif _Dkey ='avg_wk_cnt_ty' then 
											   _DB_avg_wk_cnt_ty := _Dvalue::float;
											   raise notice '%',_DB_avg_wk_cnt_ty;
											elsif _Dkey ='CC_Threshold' then 
											  _DB_CC_Threshold := _Dvalue::float;
											  raise notice '%',_DB_CC_Threshold;
											elsif _Dkey ='moq' then 
											  _DB_moq := _Dvalue::float;
											  raise notice '%',_DB_moq;
											elsif _Dkey ='receipt_index' then 
											  _DB_receipt_index := _Dvalue::float;
											  raise notice '%',_DB_receipt_index;
											end if;
							            end loop;
							           
						    if(_st_clust_ty IS NULL AND _aps_clust_ty IS NULL AND _avg_wk_cnt_ty IS NULL) then	
						    	
								   if(_CC_Threshold IS NOT NULL) then
										 _DB_CC_Threshold := _CC_Threshold;
								   elsif(_moq IS NOT NULL) then
										 _DB_moq := _moq;
								   elsif(_receipt_index IS NOT NULL) then
										 _DB_receipt_index := _receipt_index;
								   end if;
                            else
                            	
								   if(_avg_wk_cnt_ty IS NOT NULL) then
										if(_avg_wk_ty_changed = TRUE) then
											_DB_avg_wk_cnt_ty := _avg_wk_cnt_ty;
										else
											_number_of_weeks_mpl:= (_DB_avg_wk_cnt_ty)*(_avg_wk_cnt_ty);
											
											if(_number_of_weeks_mpl > _number_of_weeks) then
												_DB_avg_wk_cnt_ty := _number_of_weeks;
											else
												_DB_avg_wk_cnt_ty := _number_of_weeks_mpl;
											end if;
										end if;
									end if;
								   if(_st_clust_ty IS NOT NULL) then
								   		if(_st_clust_ty_changed = TRUE) then
										   _DB_st_clust_ty := _st_clust_ty;
										else
											_st_clust_ty_mpl:= (_DB_st_clust_ty)*(_st_clust_ty);
											if(_st_clust_ty_mpl >= 1) then
												_DB_st_clust_ty := 1;
											else
												_DB_st_clust_ty:= _st_clust_ty_mpl;
											end if;
										end if;
									end if; 
								   if(_aps_clust_ty IS NOT NULL) then
										 _DB_aps_clust_ty := (_DB_aps_clust_ty)*(_aps_clust_ty);
								   end if;
							 end if;
							 
							 -- DB_attribute_string := 'attribute_value'||'{"st_clust_ty":'|| _DB_st_clust_ty||',"aps_clust_ty":'|| _DB_aps_clust_ty||',"avg_wk_cnt_ty":'|| _DB_avg_wk_cnt_ty||', "CC_Threshold":'|| _DB_CC_Threshold||',"moq":'||_DB_moq||',"receipt_index":'||_DB_receipt_index||'}';
							-- raise notice '%',  'DB_attribute_string';
							 DB_attribute_string := '{"st_clust_ty":'|| coalesce(_DB_st_clust_ty,0.0) ||',"aps_clust_ty":'||coalesce(_DB_aps_clust_ty,0.0)
								||',"avg_wk_cnt_ty":'||coalesce( _DB_avg_wk_cnt_ty,0.0) ||', "CC_Threshold":'|| coalesce(_DB_CC_Threshold,0.0) ||',"moq":'||coalesce(_DB_moq,0.0) ||',"receipt_index":'||coalesce(_DB_receipt_index,0.0) ||'}';
							
						
							
							 _PL_query_combine := 'UPDATE assort.plan_cluster_aps
SET attribute_value= attribute_value::jsonb ||   '''|| DB_attribute_string||'''
											  WHERE plan_clu_aps_id ='||_plan_clu_aps_id||' AND plan_code='||_plan_code;

					 raise notice '%',_PL_query_combine;
					 execute _PL_query_combine;
	         end loop;
	 end if;
  end loop;
end
;

$function$

;