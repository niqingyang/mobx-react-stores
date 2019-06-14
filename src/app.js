import React from 'react';
import ReactDOM from 'react-dom';
import {Router} from 'react-router';
import {action} from "mobx";
import {Provider} from 'mobx-react';
import {RouterStore, syncHistoryWithStore} from 'mobx-react-router';
import {addLocaleData, IntlProvider, intlShape} from 'react-intl';
import {createBrowserHistory} from 'history';
import invariant from 'invariant';
import dynamic from './dynamic';
import renderRoutes, {formatterRoutes} from './renderRoutes';

class App {

    stores

    router

    // 默认 Loading 组件
    defaultLoadingComponent

    // 渲染前回调函数，需要返回一个React子组件，参数为children
    renderCallback

    @action
    render = (container) => {

        // 允许 container 是字符串，然后用 querySelector 找元素
        if (isString(container)) {
            container = document.querySelector(container);
            invariant(container, `[app.render] container ${container} not found`);
        }

        // 并且是 HTMLElement
        invariant(
            !container || isHTMLElement(container),
            `[app.render] container should be HTMLElement`,
        );

        // stores 必须提前注册
        invariant(
            this.stores,
            `[app.render] stores must be registered before app.render()`,
        );

        // 路由必须提前注册
        invariant(
            this.router,
            `[app.render] router must be registered before app.render()`,
        );

        // 注入 routing
        const browserHistory = createBrowserHistory();
        const routing = new RouterStore();
        const history = syncHistoryWithStore(browserHistory, routing);

        this.stores.add(routing, 'routing');

        this.router = formatterRoutes(this.router, this.stores);

        // 渲染路由
        let children = renderRoutes(this.router);

        // 回调渲染
        if (isFunction(this.renderCallback)) {
            children = this.renderCallback.call(this, children);
        }

        // 默认 Loading 组件
        if (this.defaultLoadingComponent) {
            dynamic.setDefaultLoadingComponent(this.defaultLoadingComponent);
        }

        // 国际化
        const {locale} = this.stores;

        if (locale && locale.translations) {

            // 注入国际化
            const InjectedWrapper = (() => {
                const sfc = (props, context) => {

                    this.stores.add(context.intl, 'intl');

                    return props.children;
                };
                sfc.contextTypes = {
                    intl: intlShape,
                };
                return sfc;
            })();

            const localData = Object.values(locale.translations).reduce((res, item) => {
                return [
                    ...res,
                    ...item.data
                ];
            }, []);

            addLocaleData(localData);

            const {messages} = locale.translation;

            children = (
                <IntlProvider locale={locale.lang} messages={messages}>
                    <InjectedWrapper>
                        {children}
                    </InjectedWrapper>
                </IntlProvider>
            );
        }

        ReactDOM.render(
            <Provider {...this.stores} dispatch={this.stores.dispatch} stores={this.stores}>
                <Router history={history}>
                    {children}
                </Router>
            </Provider>,
            container
        );
    }
}

function isHTMLElement(node) {
    return (
        typeof node === 'object' && node !== null && node.nodeType && node.nodeName
    );
}

function isString(str) {
    return typeof str === 'string';
}

function isFunction(func) {
    return typeof func === 'function';
}

export default new App();




