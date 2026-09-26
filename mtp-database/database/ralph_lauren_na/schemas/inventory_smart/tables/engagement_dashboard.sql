--liquibase formatted sql
--changeset ishaan.singh@impactanalytics.co:engagement_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.engagement_dashboard definition

CREATE TABLE inventory_smart.engagement_dashboard (
    brand TEXT NOT NULL,
    channel TEXT NOT NULL,
    updated_at DATE NOT NULL,
    updated_by_username TEXT NOT NULL,
    num_allocations BIGINT NOT NULL,
    num_style_colors BIGINT NOT NULL,
    num_skus BIGINT NOT NULL,
    num_auto_allocations BIGINT NOT NULL,
    num_manual_allocations BIGINT NOT NULL,
    num_edited_auto_allocations BIGINT NOT NULL,
    num_edited_manual_allocations BIGINT NOT NULL,
    original_allocated_quantity BIGINT NOT NULL,
    final_allocated_quantity BIGINT NOT NULL,
    original_auto_allocated_quantity BIGINT NOT NULL,
    final_auto_allocated_quantity BIGINT NOT NULL,
    original_manual_allocated_quantity BIGINT NOT NULL,
    final_manual_allocated_quantity BIGINT NOT NULL,
    min_allocated BIGINT NOT NULL,
    wos_allocated_quantity BIGINT NOT NULL,
    CONSTRAINT engagement_dashboard_un UNIQUE (channel, updated_at, updated_by_username)
);