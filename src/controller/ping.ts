import { Get, Route, Tags, Security, Request } from "tsoa";

interface PingResponse {
  message: string;
}

@Tags("Ping")
@Route("ping")
export default class PingController {

  @Security("jwt")
  @Get("/")
  public async getMessage(): Promise<PingResponse> {
    return {
      message: "PONG",
    };
  }
}