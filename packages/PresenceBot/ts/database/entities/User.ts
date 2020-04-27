import bcrypt from "bcrypt";
import { Entity, BaseEntity, PrimaryGeneratedColumn, Column } from "typeorm";
import { TOTPAsync } from "@otplib/core-async";
import { createDigest } from "@otplib/plugin-crypto-async-ronomon";
import { SecurityKit } from "../../security";

const generator = new TOTPAsync({
  step: 60,
  createDigest
});

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column()
  userID: string;

  @Column()
  passwordHash: string;

  @Column("simple-array", { default: [] })
  excludes: string[];

  async setPassword(password: string) {
    this.passwordHash = await bcrypt.hash(password, 10);
  }

  async checkPassword(password: string) {
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Returns a link code that expires after some time
   */
  async linkCode() {
    return generator.generate(this.passwordHash);
  }

  async testLinkCode(code: string) {
    return generator.check(code, this.passwordHash);
  }

  /**
   * These require a password because they are used to generate API keys.
   * @param password password
   */
  async token(password: string) {
    return SecurityKit.token(this.userID, password);
  }

  /**
   * These do not require a password, and will be invalidated when the password is changed.
   */
  async apiKey() {
    return SecurityKit.apiKey(this.uuid, await this.rawApiKey());
  }

  /**
   * Raw API key - not useful on its own, can't be used to query for a user.
   */
  async rawApiKey() {
    return await bcrypt.hash(this.passwordHash, 10);
  }

  /**
   * Compares a raw API key against the hash data
   * @param key raw key
   */
  async checkRawApiKey(key: string) {
    return bcrypt.compare(this.passwordHash, key);
  }

  /**
   * Looks up a user with the given identity token (used in the frontend)
   * @param token identity token
   */
  static async userForToken(token: string) {
    const uuid = await SecurityKit.validate(token);
    if (!uuid) return null;

    return User.findOne({ uuid }).then(u => u || null);
  }

  static async createUser(userID: string, password: string) {
    const user = User.create({ userID });
    await user.setPassword(password);

    return user;
  }
}