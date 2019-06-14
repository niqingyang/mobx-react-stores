import React from 'react';
import {Switch, Route, Redirect} from 'react-router-dom';
import invariant from "invariant";
import dynamic from "./dynamic";

const RouteInstanceMap = {
    get(key) {
        return key._routeInternalComponent;
    },
    has(key) {
        return key._routeInternalComponent !== undefined;
    },
    set(key, value) {
        key._routeInternalComponent = value;
    },
};

// Support pass props from layout to child routes
const RouteWithProps = ({path, exact, strict, render, location, sensitive, ...rest}) => (
    <Route
        path={path}
        exact={exact}
        strict={strict}
        location={location}
        sensitive={sensitive}
        render={props => render({...props, ...rest})}
    />
);

function getCompatProps(props) {
    const compatProps = {...props};
    if (props.match && props.match.params && !props.params) {
        compatProps.params = props.match.params;
    }
    return compatProps;
}

function withRoutes(route) {
    if (RouteInstanceMap.has(route)) {
        return RouteInstanceMap.get(route);
    }

    const {Routes} = route;
    let len = Routes.length - 1;
    let Component = args => {
        const {render, ...props} = args;
        return render(props);
    };
    while (len >= 0) {
        const AuthRoute = Routes[len];
        const OldComponent = Component;
        Component = props => (
            <AuthRoute {...props}>
                <OldComponent {...props} />
            </AuthRoute>
        );
        len -= 1;
    }

    const ret = args => {
        const {render, ...rest} = args;
        return (
            <RouteWithProps
                {...rest}
                render={props => {
                    return <Component {...props} route={route} render={render}/>;
                }}
            />
        );
    };
    RouteInstanceMap.set(route, ret);
    return ret;
}

export default function renderRoutes(routes, extraProps = {}, switchProps = {},) {
    return routes ? (
        <Switch {...switchProps}>
            {routes.map((route, i) => {
                if (route.redirect) {
                    return (
                        <Redirect
                            key={route.key || i}
                            from={route.path}
                            to={route.redirect}
                            exact={route.exact}
                            strict={route.strict}
                        />
                    );
                }
                const RouteRoute = route.Routes ? withRoutes(route) : RouteWithProps;
                return (
                    <RouteRoute
                        key={route.key || i}
                        path={route.path}
                        exact={route.exact}
                        strict={route.strict}
                        sensitive={route.sensitive}
                        render={props => {

                            const childRoutes = renderRoutes(
                                route.routes,
                                {},
                                {
                                    location: props.location,
                                },
                            );
                            if (route.component) {

                                const compatProps = getCompatProps({
                                    ...props,
                                    ...extraProps,
                                });

                                const newProps = {
                                    ...props,
                                    ...extraProps,
                                    ...compatProps
                                };

                                return (
                                    <route.component {...newProps} route={route}>
                                        {childRoutes}
                                    </route.component>
                                );
                            } else {
                                return childRoutes;
                            }
                        }}
                    />
                );
            })}
        </Switch>
    ) : null;
}

export function formatterRoutes(routes, stores, parentModels) {

    if (!routes) {
        return [];
    }

    return routes.map(route => {

        // check models
        if (isUndefined(route.models)) {
            route.models = [];
        } else if (isFunction(route.models)) {
            route.models = [route.models];
        } else if (!isArray(route.models)) {
            invariant(false, `route ${route.path} models must be a function or array`);
        }

        let pModels = Array.isArray(parentModels) ? parentModels : [];

        route.models = route.models.concat(pModels);

        if (route.component) {

            // 组件必须是个函数
            invariant(isFunction(route.component), `route ${route.path} component must be a function`);

            route.component = dynamic({
                stores,
                models: route.models,
                component: route.component
            });

            pModels = [];
        } else if (route.routes && route.models.length > 0) {
            pModels = route.models;
        }

        if (route.routes) {
            route.routes = formatterRoutes(route.routes, stores, pModels);
        } else if (route.exact === undefined) {
            route.exact = true;
        }

        return route;
    });
}

function isUndefined(obj) {
    return typeof obj === 'undefined';
}

function isFunction(func) {
    return typeof func === 'function';
}

function isArray(arr) {
    return Array.isArray(arr);
}