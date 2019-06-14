import {action, extendObservable, observable} from 'mobx';
import invariant from 'invariant';
import {loadingStore} from 'mobx-loading';

const NAMESPACE_SEP = '/';

class Stores {

    @observable
    loading = loadingStore

    /**
     * 注册Model
     * @param model
     * @param namespace
     * @returns {*}
     */
    @action
    add = (model, namespaceAlias) => {

        if (typeof model === 'function') {
            return this.add(model(), namespaceAlias);
        } else if (model.constructor && model.constructor.name === 'Promise' && typeof model.then === 'function') {

            if (namespaceAlias) {
                this.loading.change(namespaceAlias, false, true);
            }

            model.then((module) => {
                if (module.default) {
                    return this.add(module.default);
                } else {
                    return this.add(module);
                }
            }).finally(() => {
                if (namespace) {
                    this.loading.change(namespaceAlias, false, false);
                }
            });

            return null;
        } else {

            let namespace;

            if (namespaceAlias) {
                namespace = namespaceAlias;
                // 重新定义别名
                model.namespace = namespaceAlias;
            } else {
                namespace = model.namespace;
            }

            this.checkNamespace(namespace);

            extendObservable(this, {
                [namespace]: model
            });

            return this[namespace];
        }
    }

    /**
     * 根据命名空间移除Model
     * @param namespace
     */
    @action
    remove = (namespace) => {
        delete this[namespace];
    }

    /**
     * 检查命名空间
     * @param namespace
     */
    checkNamespace = (namespace) => {
        // namespace 必须被定义
        invariant(
            namespace,
            `[stores.model] namespace should be defined`,
        );
        // 并且是字符串
        invariant(
            typeof namespace === 'string',
            `[stores.model] namespace should be string, but got ${typeof namespace}`
        );
        // 并且唯一
        // invariant(
        //     Object.keys(this).every(_ => _ !== namespace),
        //     `[stores.model] namespace should be unique`
        // );
    }

    dispatch = ({type, payload}) => {

        const types = type.split(NAMESPACE_SEP);

        invariant(types.length >= 2, `invalid type '${type}'`);

        const func = types.reduce((res, t) => {

            invariant(res[t] !== undefined, `stores action '${type}' is undefined`);

            return res[t];
        }, this);

        invariant(typeof func === 'function', `stores action '${type}' must be a function`);

        return func(payload);
    }
}

export default new Stores();