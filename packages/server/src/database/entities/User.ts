import bcrypt from "bcrypt";
import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SecurityKit } from "../../utils/security";
import { OAuthLink } from "./OAuthLink";
import { OAUTH_PLATFORM } from "@presenti/utils";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column({ unique: true })
  userID: string;

  @Column()
  passwordHash: string;
  
  @OneToMany(type => OAuthLink, link => link.user, { eager: true })
  oAuthLinks: OAuthLink[];

  @Column("simple-array", { default: '' })
  excludes: string[];

  json(full = false) {
    return {
      uuid: this.uuid,
      userID: this.userID,
      platforms: full ? this.platforms : null,
      excludes: this.excludes
    }
  }
  
  get platforms(): Record<OAUTH_PLATFORM, string> {
    return (this.oAuthLinks || []).reduce((acc, { platform, platformID: linkID }) => Object.assign(acc, { [platform]: linkID }), {} as Record<OAUTH_PLATFORM, string>);
  }

  async setPassword(password: string) {
    this.passwordHash = await bcrypt.hash(password, 10);
  }

  async checkPassword(password: string) {
    return bcrypt.compare(password, this.passwordHash);
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