import dotenv from "dotenv";

import { startApiServer } from "./api/api_server.js";
import { startCoapServer } from "./coap/coap_server.js";

dotenv.config();

startApiServer();
startCoapServer();
