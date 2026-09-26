--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_warning_for_finalize_offer_with_exclusion_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_warning_for_finalize_offer_with_exclusion_1


DROP FUNCTION if exists price_promo.fn_warning_for_finalize_offer_with_exclusion;

CREATE OR REPLACE FUNCTION price_promo.fn_warning_for_finalize_offer_with_exclusion(_promo_ids integer[])
 RETURNS TABLE(source_promo_id integer, source_promo_name text, conflicted_promo_id integer, conflicted_promo_name text, conflicted_promo_products_count integer, conflicted_promo_status text, conflicted_promo_start_date date, conflicted_promo_end_date date)
 LANGUAGE plpgsql
AS $function$
declare
	final_response json := null;
	_promo_id integer;
	promo_id_ integer;
	_start_date date;
	_end_date date;
	_product_selection_type integer;
	_store_selection_type integer;
	_conflicted_promo_id integer;
	_store_selection integer[];
	_is_conflicted bool;
	_conflicted_products_count integer;


	date_conflicted_promo_ids integer[];
	store_conflicted_promo_ids integer[];
	product_conflicted_promo_ids integer[];
	conflicted_products_counts integer[];
	promo_products_query text;
	temp_union_query text;
	final_union_query text = null::text;
	final_query text;
	is_any_promos_conflicted bool := false;
begin
	temp_union_query = ' select %1$L::integer as source_promo_id, unnest( %2$L::integer[] ) as conflicted_promo_id, unnest( %3$L::integer[] ) as conflicted_promo_products_count ';
	FOREACH _promo_id IN ARRAY _promo_ids LOOP
        RAISE NOTICE '_promo_id: %', _promo_id;


       	-- Fetch current promo info.
		select
			start_date, end_date,
			product_selection_type,
			store_selection_type
			into
			_start_date, _end_date,
			_product_selection_type,
			_store_selection_type
		from
			price_promo.promo_master pm where pm.promo_id = _promo_id;
		raise notice '_start_date : %, _end_date: %', _start_date, _end_date;


		-- Fatch fate conflicted promo ids.
		select
			array_agg(promo_id) into date_conflicted_promo_ids
		from
			price_promo.promo_master pm
		where
			pm.start_date <= _end_date
			and pm.end_date >= _start_date
			and promo_id <> _promo_id
			and (
					pm.status in (select status_id from price_promo.promo_status_config psc where psc.status_name in ('Finalized', 'Execution Approved'))
					or
					pm.promo_id = any(_promo_ids)
				);

		if date_conflicted_promo_ids is null then
			raise notice 'no date conflicted_promo_ids present';
		else
			raise notice 'Finalized date conflicted_promo_ids : %', date_conflicted_promo_ids;
		end if;

		-- Find all store conflicted promos.
		if date_conflicted_promo_ids is not null then
			if _store_selection_type = 1 then
				store_conflicted_promo_ids = date_conflicted_promo_ids;
			else
				-- Fetch all stores for current offer.
				select
					array_agg(ps.store_id) into _store_selection
				from
					price_promo.promo_store ps
				where
					ps.promo_id = _promo_id;
				-- Find all conflicted promos.
				FOREACH promo_id_ IN ARRAY date_conflicted_promo_ids loop
					if price_promo.fn_is_promo_conflicting_on_stores(promo_id_, _store_selection) then
						store_conflicted_promo_ids = array_append(store_conflicted_promo_ids, promo_id_);
					end if;
				END LOOP;
			end if;
			if store_conflicted_promo_ids is null then
				raise notice 'no date-store conflicted_promo_ids present';
			else
				raise notice 'Finalized date-store conflicted_promo_ids : %', store_conflicted_promo_ids;
			end if;
		end if;



		-- Find all product conflicted promos.
		if store_conflicted_promo_ids is not null then
			if _product_selection_type = 1 then
				select
					array_agg(pm.promo_id), array_agg(pm.products_count)
					into
					product_conflicted_promo_ids, conflicted_products_counts
				from
					price_promo.promo_master pm
				where
					pm.promo_id <> _promo_id
					and pm.promo_id = any(store_conflicted_promo_ids);
			else
				-- promo_products_query = price_promo.fn_get_promo_pg_products_with_lifecycle_indicator(_promo_id, _product_selection_type);
				FOREACH promo_id_ IN ARRAY store_conflicted_promo_ids loop
					select
						is_conflicted, conflicted_products_count
						into
						_is_conflicted, _conflicted_products_count
					from
--						price_promo.fn_is_promo_conflicting_on_products(promo_id_, promo_products_query);
						price_promo.fn_is_promo_conflicting_on_products_with_exclusion(_promo_id, promo_id_);
					if _is_conflicted then
						product_conflicted_promo_ids = array_append(product_conflicted_promo_ids, promo_id_);
						conflicted_products_counts = array_append(conflicted_products_counts, _conflicted_products_count);
					end if;
				END LOOP;
			end if;
			if product_conflicted_promo_ids is null then
				raise notice 'no date-store-product conflicted_promo_ids present';
			else
				raise notice 'Finalized date-store-product conflicted_promo_ids : %', product_conflicted_promo_ids;
			end if;

			if product_conflicted_promo_ids is not null and array_length(product_conflicted_promo_ids, 1) > 0 then
				is_any_promos_conflicted = true;
				if final_union_query is null then
					final_union_query = format(temp_union_query, _promo_id, product_conflicted_promo_ids, conflicted_products_counts);
				else
					final_union_query = final_union_query || ' union ' || format(temp_union_query, _promo_id, product_conflicted_promo_ids, conflicted_products_counts);
				end if;
			end if;
		end if;


		date_conflicted_promo_ids = null::integer[];
		store_conflicted_promo_ids = null::integer[];
		product_conflicted_promo_ids = null::integer[];
	END LOOP;
   	if is_any_promos_conflicted then
	   	final_query = FORMAT('	SELECT
						            dd.source_promo_id,
						            spm.name AS source_promo_name,
						            dd.conflicted_promo_id,
						            cpm.name AS conflicted_promo_name,
						            dd.conflicted_promo_products_count,
						            psc.status_name::text AS conflicted_promo_status,
						            cpm.start_date AS conflicted_promo_start_date,
						            cpm.end_date AS conflicted_promo_end_date
						        FROM
						            (
						                %1$s
						            ) dd
						        JOIN price_promo.promo_master spm
						            ON dd.source_promo_id = spm.promo_id
						        JOIN price_promo.promo_master cpm
						            ON dd.conflicted_promo_id = cpm.promo_id
						        LEFT JOIN price_promo.promo_status_config psc
						            ON cpm.status = psc.status_id
						    ', final_union_query);
	else
		final_query = 'SELECT null::integer as source_promo_id, null::text as source_promo_name, null::integer as conflicted_promo_id, null::text as conflicted_promo_name, null::integer as conflicted_promo_products_count, null::text as conflicted_promo_status, null::date as conflicted_promo_start_date, null::date as conflicted_promo_end_date';
	end if;
	raise notice 'final_query : % ', final_query;
	RETURN QUERY EXECUTE final_query;
end;
$function$
;
