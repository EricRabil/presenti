"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = require("../../database/entities/Storage");
const scoped_adapter_1 = require("../../structs/scoped-adapter");
class StorageAdapter extends scoped_adapter_1.ScopedPresenceAdapter {
    constructor(identifier, defaultStorage) {
        super();
        this.identifier = identifier;
        this.defaultStorage = defaultStorage;
    }
    async container() {
        let container = await Storage_1.Storage.findOne({ identifier: this.identifier });
        if (container)
            return container;
        container = Storage_1.Storage.create({ identifier: this.identifier, data: this.defaultStorage || {} });
        container = await container.save();
        return container;
    }
}
exports.StorageAdapter = StorageAdapter;
