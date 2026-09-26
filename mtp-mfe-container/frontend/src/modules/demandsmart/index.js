import { mount } from "demandsmart/bootstrap";
import { useEffect, useRef } from "react";

import { useHistory } from "react-router-dom";

export default ({ routes, containerStore }) => {
    const ref = useRef(null);
    const history = useHistory();

    useEffect(() => {
        const { onParentNavigate, unmount } = mount(ref.current, {
            initialPath: history.location.pathname,
            onNavigate: ({ pathname: nextPathname }) => {
                const { pathname } = history.location;

                if (pathname !== nextPathname) {
                    history.push(nextPathname);
                }
            },
            containerStore,
            routes,
        });

        const unlisten = history.listen(onParentNavigate);

        return () => {
            unlisten();
            unmount();
        };
    }, []);

    return <div ref={ref} id="demandsmart-remote" />;
};