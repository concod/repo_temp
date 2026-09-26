--liquibase formatted sql
--changeset liquibase:plan_aps_st_opt_master_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_aps_st_opt_master_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_aps_st_opt_master_update(jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_aps_st_opt_master_update(jsonb)
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
_Dvalue float;
_key1 text;
_value1 text;
_number_of_weeks float;
_plan_code integer;
_plan_filters jsonb;
_input_json json ;
_exist_attr_val json ;
_attribute_value json;
_DB_attribute_string text;
_number_of_weeks_mpl float;
_st_clust_ty_mpl float;
_st_ty float;
_aps_ty float;
_min_CC float;
_core_CC float;
_avg_wk_cnt_ty float;
_CC_Threshold float;
_moq float;
_receipt_index float;
_attribute_name text;
_operator text;
_prefix text;
_where text;
_cluster_aps_st_data jsonb ;
_max_cc integer;
 _plan_clu_aps_id text;
-- _cntr int :=0;
begin


/*
        Function/Procedure name: assort_smart.plan_aps_st_opt_master_update
        Created by: Sadhana J
        Created at: 23-05-2022
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose: This function been created to update aps st cluster data

        Calling Statement:

        select * from assort_smart.plan_aps_st_opt_master_update(
        '
           {
              "number_of_weeks": 7,
              "cluster_aps_st_data": [
                {
                  "plan_code": "1315",
                  "plan_clu_aps_id": 3055,
                  "filters": [
                    {
                      "attribute_name": "plan_code",
                      "operator": "in",
                      "value": ["1315"],
                    },
                    {
                      "attribute_name": "l0_name",
                      "value": ["Home"],
                      "prefix": "levels",
                      "operator": "in",
                    },
                    {
                      "attribute_name": "l1_name",
                      "value": ["Home"],
                      "prefix": "levels",
                      "operator": "in",
                    },
                    {
                      "attribute_name": "l2_name",
                      "value": ["Other Home"],
                      "prefix": "levels",
                      "operator": "in",
                    },
                    {
                      "attribute_name": "l3_name",
                      "value": ["< $22"],
                      "prefix": "levels",
                      "operator": "in",
                    },
                  ],
                  "attribute_value": {
                    "aps_clust_ly": 0.13835448219402377,
                    "aps_clust_ty": 0.988246301385884,
                    "st_clust_ly": 0.03724928366762178,
                    "st_clust_ty": 0.03724928366762178,
                    "avg_wk_cnt_ty": 7,
                    "max_cc": null,
                    "moq": null,
                    "cc_threshold": 1.1,
                    "st_clust_ty_changed": true,
                    "avg_wk_ty_changed": true,
                  },
                },
              ],
            }
        '
        );

        Updated_by Updated_on Purpose
        Sadhana J 23-05-2022: to update , where-clause
*/

 _number_of_weeks:= (($1)->>'number_of_weeks')::float;
_cluster_aps_st_data:= (($1)->>'cluster_aps_st_data')::jsonb;

for _input_json in select * from jsonb_array_elements(_cluster_aps_st_data::jsonb)
    loop

    -- get filter, plan_code, attribute_value data from payload
    _plan_code = (_input_json->>'plan_code')::integer;
    --raise notice '%',_plan_code;
     _plan_filters =( _input_json->>'filters')::jsonb;
     --raise notice '%',_plan_filters;
    _attribute_value:=(_input_json->>'attribute_value')::json;

	_where:=null;
    -- prepare where clause
    _where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_plan_filters) );

    -- get data from db
   --raise notice '_where%',_where;

   _DB_query_combine := 'SELECT plan_clu_aps_id, attribute_value FROM assort_smart.plan_cluster_aps ' ||_where || ' ';

   for _plan_clu_aps_id, _exist_attr_val in execute _DB_query_combine
		Loop
    		--raise notice '_cluster_code = %',_cluster_code;
			raise notice 'exist_attr_val %', _exist_attr_val;
		    -- collect db attribute value

		    for _Dkey, _Dvalue in SELECT * FROM jsonb_each_text(_exist_attr_val::jsonb) --WHERE value IS NOT NULL
		        loop

		            _Dvalue:= _Dvalue::float;
		           --raise notice 'exist_attr_val %', _exist_attr_val->>'st_ty';
		            if _Dkey like '%_ty%' and _Dvalue IS NOT NULL then
		                if _Dkey = 'avg_wk_cnt_ty' then

		                    if (_attribute_value->>'avg_wk_ty_changed')::bool = true then
		                        _avg_wk_cnt_ty:= (_attribute_value->>'avg_wk_cnt_ty')::float;
		                    else
		                        _avg_wk_cnt_ty:= (_exist_attr_val->>'avg_wk_cnt_ty')::float;

		                    end if;
		                elsif _Dkey = 'st_ty' then
		                    if (_attribute_value->>'st_clust_ty_changed')::bool = true then
		                    	_st_ty:= (_attribute_value->>'st_ty')::float;

		                    else
		                    	--raise notice '_exist_attr_val->>st_ty %', _exist_attr_val->>'st_ty';
		                        _st_ty := (_exist_attr_val->>'st_ty')::float;
		                       --raise notice 'changes_st_ty %', _st_ty;

		                    end if;
		                elsif _Dkey = 'aps_ty' then

		                	--_aps_ty:= 1+( ( (_Dvalue::float) - ((_attribute_value->>_Dkey)::float) ) / ((_attribute_value->>_Dkey)::float) );
							if (_attribute_value->>'aps_ty_changed')::bool = true then
								--raise notice '_exist_attr_val->>aps_ty %', _exist_attr_val->>'aps_ty';
								--raise notice '_attribute_value->>aps_ty %', _attribute_value->>'aps_ty';
		                    	_aps_ty:= ((_attribute_value->>'aps_ty')::float) * ((_exist_attr_val->>'aps_ty')::float);

		                    else
		                    	--raise notice '_exist_attr_val->>aps_ty %', _exist_attr_val->>'aps_ty';
		                        _aps_ty := (_exist_attr_val->>'aps_ty')::float;

		                    end if;

		                end if;
		            elsif _Dkey in ('CC_Threshold', 'moq', 'receipt_index', 'min_cc', 'core_cc') and _Dvalue is not null then
		            	if _Dkey = 'CC_Threshold' then
		        			_CC_Threshold:= (_Dvalue)::float;
		        		elsif _Dkey = 'moq' then
		        			_moq:= (_Dvalue)::float;
		        		elsif _Dkey = 'receipt_index' then
		        			_receipt_index:= (_Dvalue)::float;
		        		elsif _Dkey = 'Min_CC' then
		        			_min_CC:= (_Dvalue)::float;
		        		elsif _Dkey = 'Core_CC' then
		        			_core_CC:= (_Dvalue)::float;
		        		 end if;

		            end if;


		    end loop;


				--raise notice 'st %', _aps_ty;

		          _DB_attribute_string := '{"st_ty":'|| coalesce(_st_ty,0.0) ||',"aps_ty":'||coalesce(_aps_ty,0.0)
		             ||',"avg_wk_cnt_ty":'||coalesce( _avg_wk_cnt_ty,0.0) ||', "CC_Threshold":'|| coalesce(_CC_Threshold,0.0)
		             ||',"moq":'||coalesce(_moq,0.0)
		             ||',"min_cc":'||coalesce(_min_CC,0.0)
		             ||',"core_cc":'||coalesce(_core_CC,0.0)
		             ||',"receipt_index":'||coalesce(_receipt_index,0.0) ||'}';

		        --raise notice 'exist_attr_val %', _DB_attribute_string;
					--_cntr:= _cntr+1;

		          _PL_query_combine := 'UPDATE assort_smart.plan_cluster_aps
                                SET attribute_value= attribute_value::jsonb ||   '''|| _DB_attribute_string||'''
                                ' || 'where plan_clu_aps_id = ' ||_plan_clu_aps_id || ' ';

               --raise notice '_cntr %',_cntr;
		       --raise notice 'update query = %',_PL_query_combine;
		        execute _PL_query_combine;
	 end loop;
 end loop;

end
;

$function$
;
