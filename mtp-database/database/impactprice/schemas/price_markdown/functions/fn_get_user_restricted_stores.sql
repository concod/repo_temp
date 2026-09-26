--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_get_user_restricted_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_user_restricted_stores for markdown application

DROP FUNCTION if exists price_markdown.fn_get_user_restricted_stores;

CREATE OR REPLACE FUNCTION price_markdown.fn_get_user_restricted_stores(p_user_id integer, p_is_active integer[] DEFAULT ARRAY[1])
 RETURNS TABLE(
    s0_id integer, 
    s0_name character varying, 
    s0_cid integer, 
    s1_id integer, 
    s1_name character varying, 
    s2_id integer, 
    s2_name character varying, 
    s3_id integer, 
    s3_name character varying, 
    s4_id integer, 
    s4_name character varying, 
    s5_id integer, 
    s5_name character varying, 
    store_code integer, 
    store_name character varying, 
    store_status character varying, 
    type character varying, 
    store_open_flag character varying, 
    active boolean, 
    special_classification character varying, 
    climate_area character varying, 
    latitude double precision, 
    longitude double precision, 
    open_date timestamp, 
    close_date timestamp, 
    is_active integer, 
    store_id integer, 
    country text, 
    city text, 
    address text, 
    address_2 text, 
    closed bool, 
    compqualify_date date, 
    county text, 
    dma text, 
    state text, 
    store_name_heading text, 
    loyalty_scheme text, 
    store_model_id integer, 
    store_model_cid integer, 
    store_model text, 
    store_type_id integer, 
    store_type_cid integer, 
    store_type text, 
    store_reco_level text, 
    hierarchy_id integer, 
    s6_id integer, 
    s6_name character varying, 
    version_code integer, 
    uam_hierarchy_id character varying
)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _query text;
    v_access_hierarchy JSONB;
    markdown_application_code INTEGER;
BEGIN
    -- Get application_code from configuration
    
    /*select config_value::integer into markdown_application_code
    from price_promo.tb_tool_configurations
    where module = 'application' and config_name = 'application_code';*/
    markdown_application_code = 20;
    
    -- Get access hierarchy from user access hierarchy mapping
    select 
        access_hierarchy into v_access_hierarchy 
    from 
        global.user_access_hierarchy_mapping where user_code = p_user_id
        and acl_code in (
            select acl_code from global.acl_master 
            where application_code = markdown_application_code
        );
    -- If no access hierarchy, return all stores
    IF v_access_hierarchy IS NULL OR v_access_hierarchy = '[]'::jsonb OR jsonb_array_length(v_access_hierarchy) = 0 THEN
        raise notice 'abc:';
        _query := format('
            SELECT 
                sm.s0_id,
                sm.s0_name,
                sm.s0_cid,
                sm.s1_id,
                sm.s1_name,
                sm.s2_id,
                sm.s2_name,
                sm.s3_id,
                sm.s3_name,
                sm.s4_id,
                sm.s4_name,
                sm.s5_id,
                sm.s5_name,
                sm.store_code,
                sm.store_name,
                sm.store_status,
                sm.type,
                sm.store_open_flag,
                sm.active,
                sm.special_classification,
                sm.climate_area,
                sm.latitude,
                sm.longitude,
                sm.open_date,
                sm.close_date,
                sm.is_active,
                sm.store_id,
                sm.country,
                sm.city,
                sm.address,
                sm.address_2,
                sm.closed,
                sm.compqualify_date,
                sm.county,
                sm.dma,
                sm.state,
                sm.store_name_heading,
                sm.loyalty_scheme,
                sm.store_model_id,
                sm.store_model_cid,
                sm.store_model,
                sm.store_type_id,
                sm.store_type_cid,
                sm.store_type,
                sm.store_reco_level,
                sm.hierarchy_id,
                sm.s6_id,
                sm.s6_name,
                sm.version_code,
				sm.uam_hierarchy_id
            FROM 
                pricesmart.tb_store_master sm 
            WHERE 
                sm.is_active = any(%1$L)
        ', p_is_active);
        
    -- If access hierarchy exists, return stores that match the access hierarchy
    ELSE
        _query := format('
            WITH uam_hierarchy_cte AS MATERIALIZED(
                SELECT 
                    DISTINCT jsonb_array_elements(uahm.access_hierarchy) ->> ''store_hierarchy_id'' AS uam_hierarchy_id
                FROM global.user_access_hierarchy_mapping uahm
                INNER JOIN global.acl_master acl
                    ON uahm.acl_code = acl.acl_code
                AND acl.application_code = %3$s 
                WHERE user_code = %1$s
            )
            SELECT 
                sm.s0_id,
                sm.s0_name,
                sm.s0_cid,
                sm.s1_id,
                sm.s1_name,
                sm.s2_id,
                sm.s2_name,
                sm.s3_id,
                sm.s3_name,
                sm.s4_id,
                sm.s4_name,
                sm.s5_id,
                sm.s5_name,
                sm.store_code,
                sm.store_name,
                sm.store_status,
                sm.type,
                sm.store_open_flag,
                sm.active,
                sm.special_classification,
                sm.climate_area,
                sm.latitude,
                sm.longitude,
                sm.open_date,
                sm.close_date,
                sm.is_active,
                sm.store_id,
                sm.country,
                sm.city,
                sm.address,
                sm.address_2,
                sm.closed,
                sm.compqualify_date,
                sm.county,
                sm.dma,
                sm.state,
                sm.store_name_heading,
                sm.loyalty_scheme,
                sm.store_model_id,
                sm.store_model_cid,
                sm.store_model,
                sm.store_type_id,
                sm.store_type_cid,
                sm.store_type,
                sm.store_reco_level,
                sm.hierarchy_id,
                sm.s6_id,
                sm.s6_name,
                sm.version_code,
				sm.uam_hierarchy_id
            FROM
                pricesmart.tb_store_master sm
            INNER JOIN
                uam_hierarchy_cte uhc
            ON
                uhc.uam_hierarchy_id = sm.uam_hierarchy_id
            WHERE
                sm.is_active = any(%2$L)', p_user_id, p_is_active, markdown_application_code);
    END IF;

    raise notice 'query: %', _query;
    RETURN QUERY EXECUTE _query;
END;
$function$
;
