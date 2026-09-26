--liquibase formatted sql
--changeset kalyan.chandu:update_depth_choice_with_recalculation_logic_updated_with_min_cc_limit runOnChange:true stripComments:false splitStatements:false context:MTP-28711 labels:liquibase_project_start
--comment: updated logic for update_depth_choice_with_recalculation
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_depth_choice_with_recalculation(jsonb);
CREATE OR REPLACE FUNCTION assort.update_depth_choice_with_recalculation(jsonb)
 RETURNS integer
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
_plan_code integer;
_input_json json ;
_attribute_value json;
_plan_cls_depth_id integer;
_is_data_changed boolean;
_DB_attribute_value json ;
_max_cc float;
_max_limit float;
_min_limit float;
_cc_threshold float;
_choice_ly float;
_is_depth_calculated boolean;
_New_choice_ty float;
_New_depth_ty float;
_DB_attribute_string text;
_is_choices_capped integer;
_delete_drop_query text;

begin
    /*
            Function/Procedure name: global.update_application_config
            Created by: Sadhana J
            Created at: 08-Mar-2022
            No of input parameter: 1
            Parameter Description : $1 = jsonb attribute details

            Purpose: This function been created to update depth-ty and choice-ty in depth-choice

            Calling Statement:

                    select * from assort.update_depth_choice_with_recalculation(
                    '
                    {
                      "cluster_depth_choice_data": [
                        {
                          "plan_code": 82,
                          "plan_cls_depth_id": 356,
                          "cluster_code": "A1",
                          "attribute_value": {
                            "depth_ly": 63,
                            "depth_ty": 40,
                            "qty_ty": 1228.3907692657506,
                            "store_cnt": 2
                          },
                          "is_data_changed": true
                        }],
                      "recalculate": true
                    }
                    '
                    );

            Updated_by Updated_on Purpose
            Sadhana J 08-03-2022: To add choices_capped msg in depth-choice update
    */


_is_choices_capped:= 0;

for _outerkey, _outervalue in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
        if _outerkey ='cluster_depth_choice_data' then
                for _input_json in select * from jsonb_array_elements(_outervalue::jsonb)
                    loop

                        _plan_code = _input_json->>'plan_code';
                       --raise notice '_plan_code %',_plan_code;

                        _plan_cls_depth_id = _input_json->>'plan_cls_depth_id';
                        --raise notice '_plan_cls_depth_id %',_plan_cls_depth_id;

                        _attribute_value:= _input_json->>'attribute_value';
                        --raise notice '_attribute_value %',_attribute_value;

                        _is_data_changed:= _input_json->>'is_data_changed';
                        --raise notice '_is_data_changed %',_is_data_changed;

                        if(_is_data_changed = TRUE) then
                            _DB_query_combine:= 'SELECT attribute_value FROM assort.plan_cluster_depth_choice WHERE plan_cls_depth_id ='||_plan_cls_depth_id||' AND plan_code='||_plan_code;
                            --raise notice '%',_DB_query_combine;
                            execute _DB_query_combine into _DB_attribute_value;
                            --raise notice '_DB_attribute_value: %',_DB_attribute_value;

                            --raise notice 'max_cc%',_DB_attribute_value->>'max_cc';
                            if (_DB_attribute_value->>'max_cc') IS NOT null then
                                _max_cc:= (_DB_attribute_value->>'max_cc')::float;

                            else
                                _max_cc:=null;

                            end if;
                           
                           	--raise notice 'min_cc_limit%',_DB_attribute_value->>'cc_min_limit';
                            if (_DB_attribute_value->>'cc_min_limit') IS NOT null then
                                _min_limit:= (_DB_attribute_value->>'cc_min_limit')::float;

                            else
                                _min_limit:=null;

                            end if;

                            --raise notice 'choice_ly %',_DB_attribute_value->>'choice_ly';
                            _choice_ly:= (_DB_attribute_value->>'choice_ly')::float;

                            if (_DB_attribute_value->>'cc_threshold') IS NOT null then
                                _cc_threshold:= (_DB_attribute_value->>'cc_threshold')::float;
                                _cc_threshold:= (_cc_threshold * _choice_ly)::float;

                            else
                                _cc_threshold:=null;

                            end if;
                            --raise notice '_cc_threshold %',_cc_threshold;

                            --raise notice 'calulate max-limit';
                            if _cc_threshold is not null and _max_cc is not null then
                                if _max_cc < _cc_threshold then
                                    _max_limit:= _max_cc;
                                else
                                    _max_limit:=_cc_threshold;
                                end if;
                            elsif _max_cc is not null then
                                _max_limit:= _max_cc;
                            else
                                _max_limit:=_cc_threshold;
                            end if;
                          --raise notice 'after cal _max_limit %',_max_limit;
                           

                            _is_depth_calculated:= false;

                            --raise notice 'calulate choice_ty';
                            if (_attribute_value->>'depth_ty') IS NOT null then
                                --raise notice 'depth_ty is not null in _attribute_value';

                                _New_depth_ty:=(_attribute_value->>'depth_ty')::float;
                                --raise notice '_New_depth_ty %',_New_depth_ty;

                                if (_New_depth_ty) != 0 then
                                    _New_choice_ty:=((_DB_attribute_value->>'qty_ty')::float)/((_New_depth_ty)::float);
                                    --raise notice '_DB_attribute_value->>qty_ty %',_DB_attribute_value->>'qty_ty';

                                else
                                    _New_choice_ty:= 0;
                                end if;
                               --raise notice 'after cal _New_choice_ty %',_New_choice_ty;

                                if (_max_limit) IS NOT null and (((_New_choice_ty)::float) > (_max_limit::float) ) then
                                  --raise notice 'if max_limit not null and db choice_ty > max_limit';

                                    _New_choice_ty:= _max_limit::float;
                                    --raise notice '_New_choice_ty= %',_New_choice_ty;

                                    if (_max_limit) IS NOT null and _New_choice_ty != 0 then
                                        _New_depth_ty:= ((_DB_attribute_value->>'qty_ty')::float)/((_New_choice_ty)::float);
                                       --raise notice '_DB_attribute_value->>qty_ty %',_DB_attribute_value->>'qty_ty';

                                    else
                                        _New_depth_ty:= 0;
                                    end if;
                                    --raise notice 'after cal _New_choice_ty= %',_New_choice_ty;
                                    _is_choices_capped:= 1;
                                    _is_depth_calculated:= true;
                                   --raise notice '_is_choices_capped= %',_is_choices_capped;
                                elsif (_min_limit IS NOT null and ((_New_choice_ty)::float) < (_min_limit::float)) then
                                    --raise notice 'if min_limit not null and db choice_ty < min_limit';

                                         _New_choice_ty := _min_limit::float;
                                        --raise notice '_New_choice_ty= %',_New_choice_ty;

                                        if (_min_limit IS NOT null and _New_choice_ty != 0) then
                                            _New_depth_ty := ((_DB_attribute_value->>'qty_ty')::float)/((_New_choice_ty)::float);
                                            --raise notice '_DB_attribute_value->>qty_ty %',_DB_attribute_value->>'qty_ty';
                                        else
                                            _New_depth_ty := 0;
                                        end if;
                                         --raise notice 'after cal _New_choice_ty= %',_New_choice_ty;
                                        _is_choices_capped := 2;
                                        _is_depth_calculated := true;
                                       --raise notice '_is_choices_capped= %',_is_choices_capped;
                                end if;
                            end if;
                            --raise notice 'final after cal _New_choice_ty %',_New_choice_ty;

                           --raise notice 'calulate depth_ty';
                            if (_attribute_value->>'choice_ty') IS NOT null and _is_depth_calculated = False then

                                _New_choice_ty:= (_attribute_value->>'choice_ty')::float;
                                --raise notice '_New_choice_ty= %',_New_choice_ty;

                                if _New_choice_ty != 0 then
                                    _New_depth_ty:=((_DB_attribute_value->>'qty_ty')::float)/((_New_choice_ty)::float);
                                else
                                    _New_depth_ty:= 0;
                                end if;

                            end if;
                            --raise notice '_New_depth_ty= %',_New_depth_ty;

                            _DB_attribute_string := '{"depth_ty":'|| coalesce(_New_depth_ty,0.0) ||',"choice_ty":' ||coalesce(_New_choice_ty,0.0) ||'}';

                            --raise notice '_DB_attribute_string %',_DB_attribute_string;

                            _delete_drop_query = 'DELETE FROM assort.plan_wedge_opt_drop
                                                    WHERE plan_wedge_opt_drop_id in (select plan_wedge_opt_drop_id FROM assort.plan_wedge_opt_drop where plan_code = '|| _plan_code ||')' ;
                            execute _delete_drop_query;

                            _PL_query_combine := 'UPDATE assort.plan_cluster_depth_choice
                                                    SET attribute_value= attribute_value::jsonb ||   '''|| _DB_attribute_string||'''
                                              WHERE plan_cls_depth_id ='||_plan_cls_depth_id||' AND plan_code='||_plan_code;
                            raise notice '_PL_query_combine %',_PL_query_combine;

                            execute _PL_query_combine;

                        end if;
                end loop;
        end if;
  end loop;
  return _is_choices_capped;
end
;

$function$
;
