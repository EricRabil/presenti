import { AuthWebService } from "./web";
import { connect } from "./database";

connect().then(() => new AuthWebService().run());