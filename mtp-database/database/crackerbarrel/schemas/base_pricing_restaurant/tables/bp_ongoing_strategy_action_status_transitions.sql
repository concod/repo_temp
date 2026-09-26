--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_ongoing_strategy_action_status_transitions stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_ongoing_strategy_action_status_transitions

CREATE TABLE base_pricing_restaurant.bp_ongoing_strategy_action_status_transitions (
	transition_id serial4 NOT NULL,
	from_status_id int2 NULL,
	action_id int2 NULL,
	to_status_id int2 NULL,
	sync_status_id int2 NULL,
	trigger_type varchar(20) NULL,
	post_start_date_to_status_id int2 NULL,
	post_end_date_to_status_id int2 NULL,
	CONSTRAINT bp_ongoing_strategy_action_status_transition_trigger_type_check CHECK (((trigger_type)::text = ANY (ARRAY[('user_action'::character varying)::text, ('timeline'::character varying)::text]))),
	CONSTRAINT bp_ongoing_strategy_action_status_transitions_pkey PRIMARY KEY (transition_id),
	CONSTRAINT bp_ongoing_strategy_action_st_post_start_date_to_status_id_fkey FOREIGN KEY (post_start_date_to_status_id) REFERENCES base_pricing_restaurant.bp_strategy_status_level(strategy_status_id),
	CONSTRAINT bp_ongoing_strategy_action_stat_post_end_date_to_status_id_fkey FOREIGN KEY (post_end_date_to_status_id) REFERENCES base_pricing_restaurant.bp_strategy_status_level(strategy_status_id),
	CONSTRAINT bp_ongoing_strategy_action_status_transitio_from_status_id_fkey FOREIGN KEY (from_status_id) REFERENCES base_pricing_restaurant.bp_strategy_status_level(strategy_status_id),
	CONSTRAINT bp_ongoing_strategy_action_status_transitio_sync_status_id_fkey FOREIGN KEY (sync_status_id) REFERENCES base_pricing_restaurant.bp_sync_status(sync_status_id),
	CONSTRAINT bp_ongoing_strategy_action_status_transitions_action_id_fkey FOREIGN KEY (action_id) REFERENCES base_pricing_restaurant.bp_actions(action_id),
	CONSTRAINT bp_ongoing_strategy_action_status_transitions_to_status_id_fkey FOREIGN KEY (to_status_id) REFERENCES base_pricing_restaurant.bp_strategy_status_level(strategy_status_id)
);
CREATE INDEX idx_ongoing_action ON base_pricing_restaurant.bp_ongoing_strategy_action_status_transitions USING btree (action_id);
CREATE INDEX idx_ongoing_from_status ON base_pricing_restaurant.bp_ongoing_strategy_action_status_transitions USING btree (from_status_id);
CREATE INDEX idx_ongoing_from_status_action ON base_pricing_restaurant.bp_ongoing_strategy_action_status_transitions USING btree (from_status_id, action_id);