export const mapApiViewsToSavedViewOptions = (apiViews, activeViewId = null) => {
    if (!Array.isArray(apiViews)) return [];
    return apiViews.map((view) => ({
        id: view.id,
        viewName: view.view_name,
        viewType: view.view_type || "global",
        isDefaultView: !!view.is_default,
        isActive: activeViewId ? view.id === activeViewId : !!view.is_default,
        isEditable: true,
        isDeletable: !view.is_default, // default view cannot be deleted
        preference: view.preference,
        created_by: view.created_by,
    }));
}

export const mapSaveViewToApiPayload = (newView, tableName, preference, existingView = null) => {
    const payload = {
        table_name: tableName,
        view_name: newView.viewName,
        view_type: newView.viewType || "global",
        is_default: !!newView.isDefaultView,
        is_broadcast: false,
        preference: preference,
    }

    // if updating an existing view, include the id
    if (existingView?.id) {
        payload.id = existingView.id;
    }
    return payload;
}

export const mapSetDefaultViewPayload = (viewId, tableName, isDefault = false) => {
    return {
        id: viewId,
        table_name: tableName,
        is_default: isDefault,
    };
}

export const findViewInOptions = (savedViewsOptions, view) => {
    if (typeof view === 'string') {
        return savedViewsOptions.find((v) => v.viewName === view);
    }
    return savedViewsOptions.find(
        (v) => v.viewName === view.viewName && v.viewType === view.viewType
    )
}