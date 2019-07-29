import {action} from 'mobx';
import invariant from 'invariant';
import {loadingStore} from 'mobx-loading';

const NAMESPACE_SEP = '/';

class Stores {

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

            this[namespace] = model;

            this.loading.change(namespace, false, false);

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

    getAction = (type) => {

        invariant(typeof type === 'string', `[stores.dispatch] invalid type '${type}', type must be a string`);

        const types = type.split(NAMESPACE_SEP);

        invariant(types.length >= 2, `[stores.dispatch] invalid type '${type}'`);

        const func = types.reduce((res, t) => {

            invariant(res[t] !== undefined, `[stores.dispatch] action '${type}' is undefined`);

            return res[t];
        }, this);

        invariant(typeof func === 'function', `[stores.dispatch] action '${type}' must be a function`);

        return func;
    }

    @action
    dispatch = (type, ...payload) => {

        let mode = typeof type;

        if (typeof type === 'object') {
            payload = type.payload;
            type = type.type;
        } else if (typeof type !== 'string') {
            invariant(false, `[stores.dispatch] invalid type '${type}'`);
        }

        const action = this.getAction(type);

        if (mode === 'object') {
            return action(payload);
        } else {
            return action(...payload);
        }
    }
}

export default new Stores();