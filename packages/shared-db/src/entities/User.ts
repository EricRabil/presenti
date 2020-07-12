import { IndexedColumn, IndexedCreateDateColumn, IndexedEntity, IndexedUpdateDateColumn } from "..";
import { OAUTH_PLATFORM, PresentiLink, PresentiUser, SensitivePresentiUser } from "@presenti/utils";
import { APIError } from "@presenti/web";
import { IsAlphanumeric, IsEmail, Length, Matches, validate, ValidationError } from "class-validator";
import { Column, Entity, OneToMany } from "typeorm";
import { OAuthLink } from "./OAuthLink";

const DEFAULT_BAN_REASON = `violating our terms of service.`;

@Entity()
export class User extends IndexedEntity {
  @IsAlphanumeric(undefined, { message: "must be alphanumeric with no spaces" })
  @Length(2, 16, { message: "must be between 2 and 16 characters" })
  @IndexedColumn({ type: "keyword", fields: { search: { type: "search_as_you_type" } } }, { unique: true })
  userID: string;

  @Matches(/^[\w\-\s]+$/, { message: "must be alphanumeric and may contain spaces" })
  @Length(1, 32, { message: "must be between 1 and 32 characters" })
  @IndexedColumn({ type: "text", fields: { search: { type: "search_as_you_type" } } }, { type: "varchar", default: null, nullable: true })
  displayName: string | null;

  @IndexedCreateDateColumn({ type: "date", format: "strict_date_optional_time" })
  createDate: Date;

  @IndexedUpdateDateColumn({ type: "date", format: "strict_date_optional_time" })
  updateDate: Date;

  @IsEmail(undefined, { message: "must be a valid email" })
  @Column({ nullable: false, unique: true })
  email: string;

  @Column("jsonb", { default: JSON.stringify({ admin: false, limited: false, banned: false } as PresentiUser['attributes']) })
  attributes: PresentiUser['attributes'];

  @Column()
  passwordHash: string;
  
  @OneToMany(type => OAuthLink, link => link.user, { eager: true })
  oAuthLinks: OAuthLink[];

  @Column("simple-array", { default: '' })
  excludes: string[];

  json(full = false): PresentiUser {
    return {
      uuid: this.uuid,
      displayName: this.displayName,
      userID: this.userID,
      platforms: full ? this.oAuthLinks?.reduce((acc, link) => Object.assign(acc, { [link.platform]: link.json }), {} as Record<OAUTH_PLATFORM, PresentiLink>) || {} : null,
      excludes: this.excludes,
      attributes: this.attributes
    }
  }

  sensitiveJSON(full = false): SensitivePresentiUser {
    return {
      ...this.json(full),
      email: this.email
    };
  }

  async save(...args: any[]) {
    const errors = await validate(this);

    function condenseErrors(validationErrors: ValidationError[]) {
      return validationErrors.reduce((acc, { children, constraints, property }) => {
        const errors = Object.values(constraints || {});
        return Object.assign(acc, { [property]: errors }, (children && children.length > 0) ? condenseErrors(children.map(({ property: prop, ...child }) => ({ property: `${property}.${prop}`, ...child }))) : {});
      }, {});
    }

    if (errors.length > 0) {
      const condensed = condenseErrors(errors);
      throw APIError.badRequest().fields(condensed);
    }

    return super.save(...args);
  }

  get canUseRemoteAPIs() {
    return !this.attributes.limited && !this.attributes.banned;
  }

  get banMessage() {
    return `You are banned for ${this.attributes.banReason || DEFAULT_BAN_REASON}`;
  }
}