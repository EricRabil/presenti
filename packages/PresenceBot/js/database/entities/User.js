"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var User_1;
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const typeorm_1 = require("typeorm");
const core_async_1 = require("@otplib/core-async");
const plugin_crypto_async_ronomon_1 = require("@otplib/plugin-crypto-async-ronomon");
const security_1 = require("../../security");
const generator = new core_async_1.TOTPAsync({
    step: 60,
    createDigest: plugin_crypto_async_ronomon_1.createDigest
});
let User = User_1 = class User extends typeorm_1.BaseEntity {
    async setPassword(password) {
        this.passwordHash = await bcrypt_1.default.hash(password, 10);
    }
    async checkPassword(password) {
        return bcrypt_1.default.compare(password, this.passwordHash);
    }
    /**
     * Returns a link code that expires after some time
     */
    async linkCode() {
        return generator.generate(this.passwordHash);
    }
    async testLinkCode(code) {
        return generator.check(code, this.passwordHash);
    }
    /**
     * These require a password because they are used to generate API keys.
     * @param password password
     */
    async token(password) {
        return security_1.SecurityKit.token(this.userID, password);
    }
    /**
     * These do not require a password, and will be invalidated when the password is changed.
     */
    async apiKey() {
        return security_1.SecurityKit.apiKey(this.uuid, await this.rawApiKey());
    }
    /**
     * Raw API key - not useful on its own, can't be used to query for a user.
     */
    async rawApiKey() {
        return await bcrypt_1.default.hash(this.passwordHash, 10);
    }
    /**
     * Compares a raw API key against the hash data
     * @param key raw key
     */
    async checkRawApiKey(key) {
        return bcrypt_1.default.compare(this.passwordHash, key);
    }
    /**
     * Looks up a user with the given identity token (used in the frontend)
     * @param token identity token
     */
    static async userForToken(token) {
        const uuid = await security_1.SecurityKit.validate(token);
        if (!uuid)
            return null;
        return User_1.findOne({ uuid }).then(u => u || null);
    }
    static async createUser(userID, password) {
        const user = User_1.create({ userID });
        await user.setPassword(password);
        return user;
    }
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn("uuid"),
    __metadata("design:type", String)
], User.prototype, "uuid", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], User.prototype, "userID", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    typeorm_1.Column("simple-array", { default: [] }),
    __metadata("design:type", Array)
], User.prototype, "excludes", void 0);
User = User_1 = __decorate([
    typeorm_1.Entity()
], User);
exports.User = User;
