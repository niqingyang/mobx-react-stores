import React, {Component} from 'react';

const cached = {};

function registerModel(stores, model) {

    model = model.default || model;

    if (!cached[model.namespace]) {
        stores.add(model);
        cached[model.namespace] = 1;
    }
}

let defaultLoadingComponent = () => null;

function asyncComponent(config) {

    const {resolve} = config;

    return class DynamicComponent extends Component {

        constructor(...args) {
            super(...args);

            this.LoadingComponent = config.LoadingComponent || defaultLoadingComponent;

            this.state = {
                AsyncComponent: null,
            };

            this.load();
        }

        componentDidMount() {
            this.mounted = true;
        }

        componentWillUnmount() {
            this.mounted = false;
        }

        load() {
            resolve().then(module => {
                const AsyncComponent = module.default || module;
                if (this.mounted) {
                    this.setState({AsyncComponent});
                } else {
                    this.state.AsyncComponent = AsyncComponent; // eslint-disable-line
                }
            });
        }

        render() {

            const {AsyncComponent} = this.state;

            if (AsyncComponent) {
                return <AsyncComponent {...this.props} />;
            }

            const {LoadingComponent} = this;

            return <LoadingComponent {...this.props} />;
        }
    };
}

export default function dynamic(config) {

    const {stores, models: resolveModels, component: resolveComponent} = config;

    return asyncComponent({
        resolve:
            config.resolve ||
            function () {

                const component = resolveComponent();

                const models = reduceModels(resolveModels);

                return new Promise(resolve => {
                    Promise.all([...models, component]).then(ret => {

                        if (!models || !models.length) {
                            return resolve(ret[0]);
                        } else {
                            const len = models.length;
                            ret.slice(0, len).forEach(m => {
                                m = m.default || m;
                                if (!Array.isArray(m)) {
                                    m = [m];
                                }
                                m.map(_ => registerModel(stores, _));
                            });
                            return resolve(ret[len]);
                        }
                    });
                });
            },
        ...config,
    });
}

dynamic.setDefaultLoadingComponent = LoadingComponent => {
    defaultLoadingComponent = LoadingComponent;
};

function reduceModels(models) {

    if (isUndefined(models)) {
        models = [];
    } else if (isFunction(models)) {
        models = reduceModels(models())
    } else if (isArray(models)) {
        models = models.reduce((res, m) => {
            if (!isArray(m)) {
                m = reduceModels(m);
            }
            return res.concat(m);
        }, []);
    }

    return models;
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